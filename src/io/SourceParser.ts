import { TextScope, TextFragment } from "./Text";
import { RemovingRegexWithBodyMatcher, TextMatch } from "./Matcher";
import { compareSignaturables, ISignaturable } from "./ISignaturable";
import {
  NamespaceMatch,
  CommonParser,
  joinRegexStringsWithWhiteSpace,
} from "./CommonParser";
import { IDeserializable } from "./Serialization";
class FunctionDefinitionMatch {
  constructor(regexMatch: TextMatch) {
    this.returnValMatch = regexMatch.getGroupMatch(0);
    this.nameMatch = regexMatch.getGroupMatch(1);
    this.argsMatch = regexMatch.getGroupMatch(2);
    this.constMatch = regexMatch.getGroupMatch(3);
  }

  private static readonly returnValRegex: string = "(\\b.+?)\\s";
  private static readonly funcNameRegex: string = "(\\S+)";
  private static readonly funcArgsRegex: string =
    "\\(((?:(?!\\()[\\s\\S])*?)\\)";
  private static readonly mayHaveConstSpecifierRegex: string = "(const)?";
  static readonly regexStr: string = joinRegexStringsWithWhiteSpace(
    FunctionDefinitionMatch.returnValRegex,
    FunctionDefinitionMatch.funcNameRegex,
    FunctionDefinitionMatch.funcArgsRegex,
    FunctionDefinitionMatch.mayHaveConstSpecifierRegex
  );

  readonly returnValMatch: string;
  readonly nameMatch: string;
  readonly argsMatch: string;
  readonly constMatch: string;
}

class ClassConstructorSignatureMatch {
  constructor(regexMatch: TextMatch) {
    this.namespaces = regexMatch
      .getGroupMatch(0)
      .split("::")
      .filter((str) => str.length);
    this.classNameMatch = regexMatch.getGroupMatch(1);
    this.argsMatch = regexMatch.getGroupMatch(2);
  }

  private static readonly classNameRegex: string = "([\\S]+::)?(\\S+)::\\2";
  private static readonly ctorArgsRegex: string = "\\(([\\s\\S]*?)\\)";
  private static readonly mayHaveInitializerListRegex: string =
    "(?::(?:(?!\\{)[\\s\\S])*)?";

  static readonly regexStr: string = joinRegexStringsWithWhiteSpace(
    ClassConstructorSignatureMatch.classNameRegex,
    ClassConstructorSignatureMatch.ctorArgsRegex,
    ClassConstructorSignatureMatch.mayHaveInitializerListRegex
  );

  readonly namespaces: string[];
  readonly classNameMatch: string;
  readonly argsMatch: string;
}

class ClassDestructorSignatureMatch {
  constructor(regexMatch: TextMatch) {
    this.namespaces = regexMatch
      .getGroupMatch(0)
      .split("::")
      .filter((str) => str.length);
    this.classNameMatch = regexMatch.getGroupMatch(1);
  }

  static readonly nofGroupMatches = 1;
  static readonly regexStr: string = "([\\S]+::)?(\\S+)::~\\2\\s*\\(\\s*\\)";

  readonly namespaces: string[];
  readonly classNameMatch: string;
}

export interface ISourceFileNamespace extends TextScope, IDeserializable {
  getAllSignatures(): ISignaturable[];
  removeContaining(signatures: ISignaturable[]): void;
  isEmpty(): boolean;
  forEachNamespace(callback: (namespace: ISourceFileNamespace) => void): void;
  serialize(): string;

  name: string;
  subnamespaces: ISourceFileNamespace[];
  signatures: ISignaturable[];
}
class SourceFileNamespace extends TextScope implements ISourceFileNamespace {
  constructor(public name: string, scope: TextScope) {
    super(scope.scopeStart, scope.scopeEnd);
  }

  deserialize(data: TextFragment): void {
    this.subnamespaces.push(...parseNamespacesFromSourceFile(data));
    this.signatures.push(...parseSignaturesWithinNamespace(data));
    this.signatures.forEach((signature) =>
      signature.namespaces.unshift(this.name)
    );
  }

  getAllSignatures(): ISignaturable[] {
    const signatures = ([] as ISignaturable[]).concat(
      ...this.subnamespaces.map((ns) => ns.getAllSignatures())
    );
    signatures.forEach((signature) => signature.namespaces.unshift(this.name));
    signatures.push(...this.signatures);
    return signatures;
  }

  removeContaining(signatures: ISignaturable[]): void {
    if (!signatures.length) {
      return;
    }

    this.subnamespaces.forEach((subnamespace) =>
      subnamespace.removeContaining(signatures)
    );
    this.subnamespaces = this.subnamespaces.filter(
      (subnamespace) => !subnamespace.isEmpty()
    );

    this.signatures = this.signatures.filter((containingSignature) => {
      return signatures.every(
        (signature) => !compareSignaturables(containingSignature, signature)
      );
    });
  }

  isEmpty(): boolean {
    return (
      this.subnamespaces.every((subnamespace) => subnamespace.isEmpty()) &&
      !this.signatures.length
    );
  }

  forEachNamespace(callback: (namespace: ISourceFileNamespace) => void): void {
    this.subnamespaces.forEach((subnamespace) =>
      subnamespace.forEachNamespace(callback)
    );
    callback(this);
  }

  serialize(): string {
    let serial = "namespace " + this.name + " {\n\n";
    serial = this.subnamespaces.reduce((content, subnamespace) => {
      return content + subnamespace.serialize() + "\n";
    }, serial);
    serial = this.signatures.reduce((content, signature) => {
      return content + signature.content + "\n";
    }, serial);
    serial += "}";
    return serial;
  }

  subnamespaces: ISourceFileNamespace[] = [];
  signatures: ISignaturable[] = [];
}
class SourceFileNoneNamespace
  extends TextScope
  implements ISourceFileNamespace {
  name: string = "";
  constructor(scopeStart: number, scopeEnd: number) {
    super(scopeStart, scopeEnd);
  }

  deserialize(data: TextFragment): void {
    this.signatures.push(...parseSignaturesWithinNamespace(data));
  }

  getAllSignatures(): ISignaturable[] {
    return this.signatures;
  }

  removeContaining(signatures: ISignaturable[]): void {
    this.signatures = this.signatures.filter((containingSignature) => {
      signatures.some((signature) =>
        compareSignaturables(containingSignature, signature)
      );
    });
  }

  isEmpty(): boolean {
    return !this.signatures.length;
  }

  forEachNamespace(callback: (namespace: ISourceFileNamespace) => void): void {
    callback(this);
  }

  serialize(): string {
    return this.signatures.reduce((content, signature) => {
      return content + signature.content;
    }, "");
  }
  subnamespaces: ISourceFileNamespace[] = [];
  signatures: ISignaturable[] = [];
}

function parseSignaturesWithinNamespace(data: TextFragment): ISignaturable[] {
  const signatures: ISignaturable[] = [];
  let matcher = new RemovingRegexWithBodyMatcher(
    ClassDestructorSignatureMatch.regexStr,
    "\\s*"
  );
  matcher.match(data).forEach((regexMatch) => {
    const match = new ClassDestructorSignatureMatch(regexMatch);
    const signature: ISignaturable = {
      namespaces: match.namespaces.concat(match.classNameMatch),
      signature: "~" + match.classNameMatch + "()",
      textScope: regexMatch as TextScope,
      content: regexMatch.fullMatch,
    };
    signatures.push(signature);
  });

  matcher = new RemovingRegexWithBodyMatcher(
    ClassConstructorSignatureMatch.regexStr,
    "\\s*"
  );
  matcher.match(data).forEach((regexMatch) => {
    const match = new ClassConstructorSignatureMatch(regexMatch);
    const signature: ISignaturable = {
      namespaces: match.namespaces.concat(match.classNameMatch),
      signature:
        match.classNameMatch + "(" + match.argsMatch.replace(/\s/g, "") + ")",
      textScope: regexMatch as TextScope,
      content: regexMatch.fullMatch,
    };
    signatures.push(signature);
  });

  matcher = new RemovingRegexWithBodyMatcher(
    FunctionDefinitionMatch.regexStr,
    "\\s*"
  );
  matcher.match(data).forEach((regexMatch) => {
    const match = new FunctionDefinitionMatch(regexMatch);
    const funcDefinition: ISignaturable = {
      namespaces: [] as string[],
      signature: "",
      textScope: regexMatch as TextScope,
      content: regexMatch.fullMatch,
    };
    const splittedName = match.nameMatch.split("::");
    funcDefinition.signature = splittedName[splittedName.length - 1];
    funcDefinition.signature +=
      "(" + match.argsMatch.replace(/\s/g, "") + ")" + match.constMatch;
    funcDefinition.namespaces = splittedName.slice(0, splittedName.length - 1);
    signatures.push(funcDefinition);
  });
  return signatures;
}

function parseNamespacesFromSourceFile(
  data: TextFragment
): SourceFileNamespace[] {
  let namespaces: SourceFileNamespace[] = [];
  const matcher = new RemovingRegexWithBodyMatcher(NamespaceMatch.regex);
  matcher.match(data).forEach((regexMatch) => {
    const match = new NamespaceMatch(regexMatch);
    const newNamespace = new SourceFileNamespace(
      match.nameMatch,
      regexMatch as TextScope
    );
    newNamespace.deserialize(match.bodyMatch);
    namespaces.push(newNamespace);
  });

  return namespaces;
}

export abstract class SourceParser extends CommonParser {
  static parseNamespaces(data: TextFragment): ISourceFileNamespace[] {
    const namespaces: ISourceFileNamespace[] = parseNamespacesFromSourceFile(
      data
    );
    const nonNamespace = new SourceFileNoneNamespace(
      data.getScopeStart(),
      data.getScopeStart()
    );
    nonNamespace.deserialize(data);
    if (nonNamespace.getAllSignatures().length) {
      namespaces.push(nonNamespace);
    }
    return namespaces;
  }
}
