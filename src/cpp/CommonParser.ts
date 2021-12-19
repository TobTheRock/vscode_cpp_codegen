import {
  INamespace,
  IFunction,
  IClass,
  IParser,
  IDestructor,
  IConstructor,
} from "./TypeInterfaces";
import { Namespace, RootNamespace } from "./Namespace";
import * as io from "../io";
import { joinRegexStringsWithWhiteSpace } from "./utils";

export class NamespaceMatch {
  constructor(regexMatch: io.TextMatch) {
    this.nameMatch = regexMatch.getGroupMatch(0) as string;
    this.bodyMatch = regexMatch.getGroupMatchFragment(1) as io.TextFragment;
    this.textScope = regexMatch as io.TextScope;
  }

  private static readonly namespaceSpecifierRegex: string = "namespace\\s";
  private static readonly namespaceNameRegex: string = "([\\S]+)";

  static readonly regex: string = joinRegexStringsWithWhiteSpace(
    NamespaceMatch.namespaceSpecifierRegex,
    NamespaceMatch.namespaceNameRegex
  );

  readonly nameMatch: string;
  readonly bodyMatch: io.TextFragment;
  readonly textScope: io.TextScope;
}

class CommentMatch {
  static readonly regexStr: string = "(\\/\\*[\\s\\S]*?\\*\\/)|(\\/\\/.*)";
}

export abstract class CommonParser implements IParser {
  parseStandaloneFunctions(data: io.TextFragment): IFunction[] {
    return [];
  }
  parseClasses(
    data: io.TextFragment,
    classNameProvider?: io.IClassNameProvider
  ): IClass[] {
    return [];
  }
  parseClassPrivateScope(data: io.TextFragment): io.TextFragment {
    return io.TextFragment.createEmpty();
  }
  parseClassPublicScope(data: io.TextFragment): io.TextFragment {
    return io.TextFragment.createEmpty();
  }
  parseClassProtectedScope(data: io.TextFragment): io.TextFragment {
    return io.TextFragment.createEmpty();
  }
  parseStructPrivateScope(data: io.TextFragment): io.TextFragment {
    return io.TextFragment.createEmpty();
  }
  parseStructPublicScope(data: io.TextFragment): io.TextFragment {
    return io.TextFragment.createEmpty();
  }
  parseStructProtectedScope(data: io.TextFragment): io.TextFragment {
    return io.TextFragment.createEmpty();
  }
  parseClassConstructors(
    data: io.TextFragment,
    classNameProvider: io.IClassNameProvider
  ): IConstructor[] {
    return [];
  }
  parseClassDestructors(
    data: io.TextFragment,
    classNameProvider: io.IClassNameProvider
  ): IDestructor[] {
    return [];
  }
  parseClassMemberFunctions(
    data: io.TextFragment,
    classNameProvider: io.IClassNameProvider
  ): IFunction[] {
    return [];
  }

  parseComments(data: io.TextFragment): void {
    new io.RemovingRegexMatcher(CommentMatch.regexStr).match(data);
  }

  parseNamespaces(data: io.TextFragment): INamespace[] {
    let namespaces: INamespace[] = [];
    const matcher = new io.RemovingRegexWithBodyMatcher(NamespaceMatch.regex);
    matcher.match(data).forEach((regexMatch) => {
      const match = new NamespaceMatch(regexMatch);
      const newNamespace = new Namespace(
        match.nameMatch,
        regexMatch as io.TextScope
      );
      newNamespace.deserialize(match.bodyMatch, this);
      namespaces.push(newNamespace);
    });

    return namespaces;
  }

  parseRootNamespace(data: io.TextFragment): INamespace {
    const rootNamespace = new RootNamespace(
      new io.TextScope(data.getScopeStart(), data.getScopeEnd())
    );
    rootNamespace.deserialize(data, this);
    return rootNamespace;
  }
}
