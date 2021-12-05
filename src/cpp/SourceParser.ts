import { StandaloneFunction } from "./StandaloneFunction";
import * as io from "../io";
import { CommonParser } from "./CommonParser";
import { joinRegexStringsWithWhiteSpace } from "./utils";
import { IFunction } from "./TypeInterfaces";
class FunctionDefinitionMatch {
  constructor(regexMatch: io.TextMatch) {
    this.returnValMatch = regexMatch.getGroupMatch(0);
    this.nameMatch = regexMatch.getGroupMatch(1);
    this.argsMatch = regexMatch.getGroupMatch(2);
    this.constMatch = regexMatch.getGroupMatch(3);
  }
  private static readonly forbiddenReturnValues: string = "\\boperator\\b|\"|'";
  private static readonly returnValRegex: string =
    "(\\b(?:(?!" +
    FunctionDefinitionMatch.forbiddenReturnValues +
    ")[^;])+?)\\s";
  // private static readonly returnValRegex: string = "(\\b\\S[^;]+?)\\s";
  private static readonly operatorMatch: string = "(?:operator\\s*)?";
  private static readonly funcNameRegex: string = `(\\S*${FunctionDefinitionMatch.operatorMatch}\\S+)`;
  // private static readonly funcNameRegex: string = `(\\S+)`;
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

class ClassConstructorMatch {
  constructor(regexMatch: io.TextMatch) {
    this.nameMatch = regexMatch.getGroupMatch(0);
    this.argsMatch = regexMatch.getGroupMatch(2);
  }

  private static readonly classNameRegex: string = "((?:[\\S]+::)?(\\S+)::\\2)";
  private static readonly ctorArgsRegex: string = "\\(([\\s\\S]*?)\\)";
  private static readonly mayHaveInitializerListRegex: string =
    "(?::(?:(?!\\{)[\\s\\S])*)?";

  static readonly regexStr: string = joinRegexStringsWithWhiteSpace(
    ClassConstructorMatch.classNameRegex,
    ClassConstructorMatch.ctorArgsRegex,
    ClassConstructorMatch.mayHaveInitializerListRegex
  );

  readonly returnValMatch: string = "";
  readonly nameMatch: string;
  readonly argsMatch: string;
}

class ClassDestructorMatch {
  constructor(regexMatch: io.TextMatch) {
    this.nameMatch = regexMatch.getGroupMatch(0);
  }

  static readonly nofGroupMatches = 1;
  static readonly regexStr: string =
    "((?:[\\S]+::)?(\\S+)::~\\2)\\s*\\(\\s*\\)";

  readonly returnValMatch: string = "";
  readonly nameMatch: string;
  readonly argsMatch: string = "";
}

class ClassCastOperatorMatch {
  constructor(regexMatch: io.TextMatch) {
    this.textScope = regexMatch as io.TextScope;
    this.nameMatch =
      regexMatch.getGroupMatch(0) + " " + regexMatch.getGroupMatch(1);
    this.constMatch = regexMatch.getGroupMatch(2).length > 0;
  }

  private static readonly opName: string = "((?:\\S+::)*operator)";
  private static readonly castTypeRegex: string =
    "\\s(\\b(?:(?!operator)[\\s\\S])*\\S)";
  private static readonly mayHaveConstSpecifierRegex: string = "(const)?";
  static readonly regexStr: string = joinRegexStringsWithWhiteSpace(
    ClassCastOperatorMatch.opName,
    ClassCastOperatorMatch.castTypeRegex,
    "\\(",
    "\\)",
    ClassCastOperatorMatch.mayHaveConstSpecifierRegex
  );

  readonly nameMatch: string;
  readonly argsMatch: string = "";
  readonly returnValMatch: string = "";
  readonly constMatch: boolean;
  readonly textScope: io.TextScope;
}

export class SourceParserImpl extends CommonParser {
  parseStandaloneFunctions(data: io.TextFragment): IFunction[] {
    const functions: IFunction[] = [];

    for (const matchType of [
      ClassConstructorMatch,
      ClassDestructorMatch,
      ClassCastOperatorMatch,
      FunctionDefinitionMatch,
    ]) {
      const matcher = new io.RemovingRegexWithBodyMatcher(
        matchType.regexStr,
        "\\s*"
      );

      matcher.match(data).forEach((regexMatch) => {
        const match = new matchType(regexMatch);
        const func = new StandaloneFunction(
          match.nameMatch,
          match.returnValMatch,
          match.argsMatch,
          regexMatch as io.TextScope
        );
        functions.push(func);
      });
    }

    return functions;
  }
  parseClassPublicScope(data: io.TextFragment): io.TextFragment {
    return data;
  }
  parseStructPublicScope(data: io.TextFragment): io.TextFragment {
    return data;
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SourceParser = new SourceParserImpl();
