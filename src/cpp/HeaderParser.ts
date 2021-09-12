import * as io from "../io";
import { CommonParser } from "./CommonParser";
import * as vscode from "vscode";
import { joinRegexStringsWithWhiteSpace } from "./utils";
import {
  ClassConstructor,
  ClassDestructor,
  ClassInterface,
  ClassImplementation,
  StructInterface,
  StructImplementation,
} from "./Class";
import {
  PureVirtualMemberFunction,
  VirtualMemberFunction,
  StaticMemberFunction,
  MemberFunction,
  FriendFunction,
} from "./MemberFunction";
import { StandaloneFunction } from "./StandaloneFunction";
import { IClassNameProvider } from "../io";
import { IConstructor, IFunction, IClass } from "./TypeInterfaces";

class ClassMatchBase {
  constructor(regexMatch: io.TextMatch) {
    this.textScope = regexMatch as io.TextScope;
    this.nameMatch = regexMatch.getGroupMatch(0);
    if (regexMatch.getGroupMatch(1).length) {
      this.inheritanceMatch = regexMatch.getGroupMatch(1).split(",");
    } else {
      this.inheritanceMatch = [];
    }
    this.bodyMatch = regexMatch.getGroupMatchFragment(2);
    const pureVirtualMemberRegexMatcher = new io.RegexMatcher(
      ClassMatchBase.pureVirtualMemberRegex
    );
    this.isInterface =
      pureVirtualMemberRegexMatcher.match(this.bodyMatch).length > 0;
  }

  protected static readonly classNameRegex: string = "([\\S]+)";
  protected static readonly mayHaveFinalRegex: string = "(?:final)?";
  protected static readonly inheritanceRegex: string =
    "(?::\\s*((?:(?!{)[\\S\\s])+))?";
  private static readonly pureVirtualMemberRegex =
    "virtual(?:(?!virtual)[\\s\\S])*?=[\\s]*0[\\s]*;";

  static readonly postBracketRegex = "\\s*;";

  readonly textScope: io.TextScope;
  readonly nameMatch: string;
  readonly inheritanceMatch: string[];
  readonly bodyMatch: io.TextFragment;
  readonly isInterface: boolean;
}

class ClassMatch extends ClassMatchBase {
  protected static readonly classSpecifierRegex: string = "class\\s";
  static readonly regex: string = joinRegexStringsWithWhiteSpace(
    ClassMatch.classSpecifierRegex,
    ClassMatch.classNameRegex,
    ClassMatch.mayHaveFinalRegex,
    ClassMatch.inheritanceRegex
  );
}
class StructMatch extends ClassMatchBase {
  protected static readonly classSpecifierRegex: string = "struct\\s";
  static readonly regex: string = joinRegexStringsWithWhiteSpace(
    StructMatch.classSpecifierRegex,
    StructMatch.classNameRegex,
    StructMatch.mayHaveFinalRegex,
    StructMatch.inheritanceRegex
  );
}

interface IClassScopeMatch {
  readonly scopeContent: io.TextFragment;
}
class ClassScopeMatchBase implements IClassScopeMatch {
  constructor(regexMatch: io.TextMatch) {
    this.scopeContent = regexMatch.getGroupMatchFragment(0);
  }

  readonly scopeContent: io.TextFragment;
}

class ClassProtectedScopeMatch extends ClassScopeMatchBase {
  static readonly regex: string =
    "protected:((?:(?!private:)(?!public:)[\\s\\S])*)";
}

class ClassPublicScopeMatch extends ClassScopeMatchBase {
  static readonly regex: string =
    "public:((?:(?!private:)(?!protected:)[\\s\\S])*)";
}

class StructProtectedScopeMatch extends ClassProtectedScopeMatch {}

class StructPrivateScopeMatch extends ClassScopeMatchBase {
  static readonly regex: string =
    "private:((?:(?!public:)(?!protected:)[\\s\\S])*)";
}

class ClassConstructorMatch {
  constructor(regexMatch: io.TextMatch) {
    this.argsMatch = regexMatch.getGroupMatch(0);
  }

  static getRegexStr(classname: string) {
    return joinRegexStringsWithWhiteSpace("[^~]" + classname);
  }

  static readonly postBracketRegex = ";";

  readonly argsMatch: string;
}

class ClassDestructorMatch {
  constructor(regexMatch: io.TextMatch) {
    this.isVirtual =
      regexMatch.getGroupMatch(0).length > 0 ||
      regexMatch.getGroupMatch(1).length > 0;
  }

  static getRegexStr(classname: string) {
    return joinRegexStringsWithWhiteSpace(
      this.mayHaveVirtualRegex,
      "~" + classname,
      "\\([\\s]*\\)",
      this.mayHaveOverrideRegex,
      ";"
    );
  }
  private static readonly mayHaveVirtualRegex: string = "(virtual)?";
  private static readonly mayHaveOverrideRegex: string = "(override)?";
  readonly isVirtual: boolean;
}

interface IFunctionMatch {
  readonly hasInvalidSignature?: boolean;
  readonly virtualMatch?: boolean;
  readonly staticMatch?: boolean;
  readonly returnValMatch?: string;
  readonly nameMatch: string;
  readonly argsMatch?: string;
  readonly constMatch?: boolean;
  readonly pureMatch?: boolean;
  readonly textScope: io.TextScope;
}

class StandaloneFunctionMatch implements IFunctionMatch {
  constructor(regexMatch: io.TextMatch) {
    this.textScope = regexMatch as io.TextScope;
    this.returnValMatch = regexMatch.getGroupMatch(0);
    this.nameMatch = regexMatch.getGroupMatch(1);

    this.argsMatch = regexMatch.getGroupMatch(2);
  }

  static readonly regex: string = "((?:const )?\\S*)\\s*(\\S+)";
  static readonly postBracketRegex: string = ";";

  readonly returnValMatch: string;
  readonly nameMatch: string;
  readonly argsMatch: string;
  readonly textScope: io.TextScope;
}
class MemberFunctionMatch implements IFunctionMatch {
  constructor(regexMatch: io.TextMatch) {
    this.textScope = regexMatch as io.TextScope;
    this.virtualMatch = regexMatch.getGroupMatch(0) === "virtual";
    this.staticMatch = regexMatch.getGroupMatch(0) === "static";
    this.returnValMatch = regexMatch.getGroupMatch(1);

    this.nameMatch = regexMatch.getGroupMatch(2);
    this.argsMatch = regexMatch.getGroupMatch(3);
    this.constMatch = regexMatch.getGroupMatch(4).length > 0;

    this.virtualMatch =
      this.virtualMatch || regexMatch.getGroupMatch(5).length > 0;
    this.pureMatch = regexMatch.getGroupMatch(6).length > 0;
    this.hasInvalidSignature = !this.virtualMatch && this.pureMatch;
  }

  private static readonly mayHaveVirtualOrStaticRegex: string =
    "(?:(virtual|static)\\s*)?";
  private static readonly forbiddenReturnValues: string =
    "\\bstatic\\b|\\boperator\\b|\\bfriend\\b";
  private static readonly returnValRegex: string =
    "(\\b(?:(?!" + MemberFunctionMatch.forbiddenReturnValues + ").)+?)";
  private static readonly funcNameRegex: string = "(\\S+)";
  private static readonly mayHaveConstSpecifierRegex: string = "(const)?";
  private static readonly mayHaveOverrideRegex: string = "(override)?";
  private static readonly mayBePureRegex: string = "(=\\s*0)?";
  static readonly regex: string = joinRegexStringsWithWhiteSpace(
    MemberFunctionMatch.mayHaveVirtualOrStaticRegex +
      MemberFunctionMatch.returnValRegex +
      "\\s",
    MemberFunctionMatch.funcNameRegex
  );
  static readonly postBracketRegex: string = joinRegexStringsWithWhiteSpace(
    MemberFunctionMatch.mayHaveConstSpecifierRegex,
    MemberFunctionMatch.mayHaveOverrideRegex,
    MemberFunctionMatch.mayBePureRegex,
    ";"
  );

  readonly hasInvalidSignature: boolean;
  readonly virtualMatch: boolean;
  readonly staticMatch: boolean;
  readonly returnValMatch: string;
  readonly nameMatch: string;
  readonly argsMatch: string;
  readonly constMatch: boolean;
  readonly pureMatch: boolean;
  readonly textScope: io.TextScope;
}
class FriendFunctionMatch implements IFunctionMatch {
  constructor(regexMatch: io.TextMatch) {
    this.textScope = regexMatch as io.TextScope;
    this.returnValMatch = regexMatch.getGroupMatch(0);

    this.nameMatch = regexMatch.getGroupMatch(1);
    this.argsMatch = regexMatch.getGroupMatch(2);
    this.constMatch = regexMatch.getGroupMatch(3).length > 0;
  }

  private static readonly friendName: string = "friend";
  private static readonly returnValRegex: string = "(\\b(?:(?!friend).)+?)";
  private static readonly funcNameRegex: string = "(\\S+)";
  private static readonly mayHaveConstSpecifierRegex: string = "(const)?";
  static readonly regex: string = joinRegexStringsWithWhiteSpace(
    FriendFunctionMatch.friendName,
    FriendFunctionMatch.returnValRegex,
    FriendFunctionMatch.funcNameRegex
  );
  static readonly postBracketRegex: string = joinRegexStringsWithWhiteSpace(
    FriendFunctionMatch.mayHaveConstSpecifierRegex,
    ";"
  );

  readonly returnValMatch: string;
  readonly nameMatch: string;
  readonly argsMatch: string;
  readonly constMatch: boolean;
  readonly textScope: io.TextScope;
}
class ClassCastOperatorMatch implements IFunctionMatch {
  constructor(regexMatch: io.TextMatch) {
    this.textScope = regexMatch as io.TextScope;
    this.virtualMatch = regexMatch.getGroupMatch(0) === "virtual";
    this.nameMatch =
      ClassCastOperatorMatch.opName + " " + regexMatch.getGroupMatch(1);
    this.constMatch = regexMatch.getGroupMatch(2).length > 0;

    this.virtualMatch =
      this.virtualMatch || regexMatch.getGroupMatch(3).length > 0;
    this.pureMatch = regexMatch.getGroupMatch(4).length > 0;
    this.hasInvalidSignature = !this.virtualMatch && this.pureMatch;
  }

  private static readonly mayHaveVirtualRegex: string = "(virtual)?";
  private static readonly opName: string = "operator";
  private static readonly castTypeRegex: string =
    "\\s(\\b(?:(?!operator)[\\s\\S])*\\S)";
  private static readonly mayHaveConstSpecifierRegex: string = "(const)?";
  private static readonly mayHaveOverrideRegex: string = "(override)?";
  private static readonly mayBePureRegex: string = "(=\\s*0)?";
  static readonly regex: string = joinRegexStringsWithWhiteSpace(
    ClassCastOperatorMatch.mayHaveVirtualRegex,
    ClassCastOperatorMatch.opName,
    ClassCastOperatorMatch.castTypeRegex,
    "\\(",
    "\\)",
    ClassCastOperatorMatch.mayHaveConstSpecifierRegex,
    ClassCastOperatorMatch.mayHaveOverrideRegex,
    ClassCastOperatorMatch.mayBePureRegex,
    ";"
  );

  readonly hasInvalidSignature: boolean;
  readonly virtualMatch: boolean;
  readonly pureMatch: boolean;
  readonly nameMatch: string;
  readonly constMatch: boolean;
  readonly textScope: io.TextScope;
}

class ClassAllocatorOperatorMatch implements IFunctionMatch {
  constructor(regexMatch: io.TextMatch) {
    this.textScope = regexMatch as io.TextScope;
    this.returnValMatch = regexMatch.getGroupMatch(0);
    this.nameMatch =
      ClassAllocatorOperatorMatch.opName + " " + regexMatch.getGroupMatch(1);
    if (regexMatch.getGroupMatch(2).length > 0) {
      this.nameMatch = this.nameMatch + "[]";
    }
    this.argsMatch = regexMatch.getGroupMatch(3);
  }

  private static readonly opName: string = "operator";
  private static readonly returnValRegex: string = "(void|void\\*)";
  private static readonly allocTypeRegex: string = "\\s(new|delete)";
  private static readonly mayHaveArrayRegex: string = "(\\[\\s*\\])?";
  static readonly regex: string = joinRegexStringsWithWhiteSpace(
    ClassAllocatorOperatorMatch.returnValRegex,
    ClassAllocatorOperatorMatch.opName,
    ClassAllocatorOperatorMatch.allocTypeRegex,
    ClassAllocatorOperatorMatch.mayHaveArrayRegex
  );
  static readonly postBracketRegex: string = ";";
  readonly nameMatch: string;
  readonly argsMatch: string;
  readonly returnValMatch: string;
  readonly textScope: io.TextScope;
}

interface IMatch<MatchType> {
  new (...args: any[]): MatchType;
  readonly regex: string;
}

interface ICallableMatch<MatchType> extends IMatch<MatchType> {
  readonly postBracketRegex: string;
}

interface IScopeMatch<MatchType> extends IMatch<MatchType> {
  readonly postBracketRegex?: string;
}

class HeaderParserImpl extends CommonParser {
  parseClassPrivateScope(data: io.TextFragment): io.TextFragment {
    let publicOrProtectedRegex =
      "(?:public:|protected:)((?!private:)[\\s\\S])*";
    const matcher = new io.RemovingRegexMatcher(publicOrProtectedRegex);
    const privateFragment = io.TextFragment.createFromTextBlock(
      ...matcher.matchInverse(data).map((regexMatch) => {
        return new io.TextBlock(regexMatch.fullMatch, regexMatch.scopeStart);
      })
    );
    return privateFragment;
  }

  parseClassPublicScope(data: io.TextFragment): io.TextFragment {
    return this.parseClassOrStructScope(ClassPublicScopeMatch, data);
  }

  parseClassProtectedScope(data: io.TextFragment): io.TextFragment {
    return this.parseClassOrStructScope(ClassProtectedScopeMatch, data);
  }

  parseStructPrivateScope(data: io.TextFragment): io.TextFragment {
    return this.parseClassOrStructScope(StructPrivateScopeMatch, data);
  }

  parseStructPublicScope(data: io.TextFragment): io.TextFragment {
    let privateOrProtectedRegex =
      "(?:private:|protected:)((?!public:)[\\s\\S])*";
    const publicFragment = io.TextFragment.createEmpty();
    const matcher = new io.RemovingRegexMatcher(privateOrProtectedRegex);
    matcher.matchInverse(data).forEach((regexMatch) => {
      publicFragment.push(
        new io.TextBlock(regexMatch.fullMatch, regexMatch.scopeStart)
      );
    });
    return publicFragment;
  }

  parseStructProtectedScope(data: io.TextFragment): io.TextFragment {
    return this.parseClassOrStructScope(StructProtectedScopeMatch, data);
  }

  parseClassConstructors(
    data: io.TextFragment,
    classNameProvider: io.IClassNameProvider
  ): IConstructor[] {
    let ctors: ClassConstructor[] = [];
    const matcher = new io.RemovingRegexWithBodyMatcher(
      ClassConstructorMatch.getRegexStr(classNameProvider.originalName),
      ClassConstructorMatch.postBracketRegex,
      "(",
      ")"
    );
    matcher.match(data).forEach((regexMatch) => {
      let match = new ClassConstructorMatch(regexMatch);
      ctors.push(
        new ClassConstructor(
          match.argsMatch,
          classNameProvider,
          regexMatch as io.TextScope
        )
      );
    });
    return ctors;
  }

  parseClassDestructors(
    data: io.TextFragment,
    classNameProvider: IClassNameProvider
  ): ClassDestructor[] {
    let deconstructors: ClassDestructor[] = [];
    const matcher = new io.RemovingRegexMatcher(
      ClassDestructorMatch.getRegexStr(classNameProvider.originalName)
    );
    matcher.match(data).forEach((regexMatch) => {
      let match = new ClassDestructorMatch(regexMatch);
      deconstructors.push(
        new ClassDestructor(
          match.isVirtual,
          classNameProvider,
          regexMatch as io.TextScope
        )
      );
    });
    return deconstructors;
  }

  parseClassMemberFunctions(
    data: io.TextFragment,
    classNameProvider: IClassNameProvider
  ): IFunction[] {
    let memberFunctions: IFunction[] = [];

    const createMemberFunction = function <MatchType extends IFunctionMatch>(
      match: MatchType
    ) {
      let newFunc: IFunction;
      if (match.hasInvalidSignature) {
        // TODO add a logger with summarizes the warnings, if there are multiple
        vscode.window.showWarningMessage(
          "Parser: Ignoring function " +
            match.nameMatch +
            " as it has an invalid signature!"
        );
        return;
      } else if (match.virtualMatch) {
        if (match.pureMatch) {
          newFunc = new PureVirtualMemberFunction(
            match.nameMatch ?? "",
            match.returnValMatch ?? "",
            match.argsMatch ?? "",
            match.constMatch ?? false,
            match.textScope,
            classNameProvider
          );
        } else {
          newFunc = new VirtualMemberFunction(
            match.nameMatch ?? "",
            match.returnValMatch ?? "",
            match.argsMatch ?? "",
            match.constMatch ?? false,
            match.textScope,
            classNameProvider
          );
        }
      } else if (match.staticMatch) {
        newFunc = new StaticMemberFunction(
          match.nameMatch ?? "",
          match.returnValMatch ?? "",
          match.argsMatch ?? "",
          match.constMatch ?? false,
          match.textScope,
          classNameProvider
        );
      } else {
        newFunc = new MemberFunction(
          match.nameMatch ?? "",
          match.returnValMatch ?? "",
          match.argsMatch ?? "",
          match.constMatch ?? false,
          match.textScope,
          classNameProvider
        );
      }

      memberFunctions.push(newFunc);
    };

    this.forEachRegexMatch(ClassCastOperatorMatch, data, createMemberFunction);
    this.forEachCallableRegexMatch(
      ClassAllocatorOperatorMatch,
      data,
      createMemberFunction
    );
    this.forEachCallableRegexMatch(
      FriendFunctionMatch,
      data,
      (match: FriendFunctionMatch) => {
        const newFunc = new FriendFunction(
          match.nameMatch,
          match.returnValMatch,
          match.argsMatch,
          match.constMatch,
          match.textScope
        );
        memberFunctions.push(newFunc);
      }
    );

    this.forEachCallableRegexMatch(
      MemberFunctionMatch,
      data,
      createMemberFunction
    );
    return memberFunctions;
  }

  parseStandaloneFunctions(data: io.TextFragment): IFunction[] {
    let standaloneFunctions: IFunction[] = [];
    this.forEachCallableRegexMatch(StandaloneFunctionMatch, data, (match) => {
      standaloneFunctions.push(
        new StandaloneFunction(
          match.nameMatch,
          match.returnValMatch,
          match.argsMatch,
          match.textScope
        )
      );
    });

    return standaloneFunctions;
  }

  parseClasses(
    data: io.TextFragment,
    classNameProvider?: io.IClassNameProvider
  ): IClass[] {
    let classes: IClass[] = [];
    this.forEachScopeRegexMatch(ClassMatch, data, (match) => {
      const newClass = match.isInterface
        ? new ClassInterface(
            match.textScope,
            match.nameMatch,
            match.inheritanceMatch,
            classNameProvider
          )
        : new ClassImplementation(
            match.textScope,
            match.nameMatch,
            match.inheritanceMatch,
            classNameProvider
          );
      newClass.deserialize(match.bodyMatch, this);
      classes.push(newClass);
    });

    this.forEachScopeRegexMatch(StructMatch, data, (match) => {
      const newStruct = match.isInterface
        ? new StructInterface(
            match.textScope,
            match.nameMatch,
            match.inheritanceMatch,
            classNameProvider
          )
        : new StructImplementation(
            match.textScope,
            match.nameMatch,
            match.inheritanceMatch,
            classNameProvider
          );
      newStruct.deserialize(match.bodyMatch, this);
      classes.push(newStruct);
    });

    return classes;
  }
  private parseClassOrStructScope<MatchType extends IClassScopeMatch>(
    type: IScopeMatch<MatchType>,
    data: io.TextFragment
  ): io.TextFragment {
    const publicFragment = io.TextFragment.createEmpty();
    this.forEachRegexMatch(type, data, (match) =>
      publicFragment.push(...match.scopeContent.blocks)
    );
    return publicFragment;
  }

  private forEachRegexMatch<MatchType>(
    type: IMatch<MatchType>,
    data: io.TextFragment,
    onMatch: (match: MatchType) => void
  ) {
    new io.RemovingRegexMatcher(type.regex)
      .match(data)
      .forEach((regexMatch) => {
        let match = new type(regexMatch);
        onMatch(match);
      });
  }

  private forEachCallableRegexMatch<MatchType>(
    type: ICallableMatch<MatchType>,
    data: io.TextFragment,
    onMatch: (match: MatchType) => void
  ) {
    new io.RemovingRegexWithBodyMatcher(
      type.regex,
      type.postBracketRegex,
      "(",
      ")"
    )
      .match(data)
      .forEach((regexMatch) => {
        let match = new type(regexMatch);
        onMatch(match);
      });
  }

  private forEachScopeRegexMatch<MatchType>(
    type: IScopeMatch<MatchType>,
    data: io.TextFragment,
    onMatch: (match: MatchType) => void
  ) {
    new io.RemovingRegexWithBodyMatcher(type.regex, type.postBracketRegex)
      .match(data)
      .forEach((regexMatch) => {
        let match = new type(regexMatch);
        onMatch(match);
      });
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const HeaderParser = new HeaderParserImpl();
