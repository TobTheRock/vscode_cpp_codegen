import * as io from ".";

// TODO => utils
export function joinRegexStringsWithFiller(
  strings: string[],
  filler: string
): string {
  let joinedStrings = "";
  for (let index = 0; index < strings.length - 1; index++) {
    joinedStrings += strings[index] + filler;
  }

  return joinedStrings + strings[strings.length - 1];
}

export function joinRegexStringsWithWhiteSpace(...strings: string[]): string {
  return joinRegexStringsWithFiller(strings, "\\s*");
}

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

export abstract class CommonParser {
  static parseComments(data: io.TextFragment): void {
    new io.RemovingRegexMatcher(CommentMatch.regexStr).match(data);
  }
}
