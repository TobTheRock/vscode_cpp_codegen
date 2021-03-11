import { TextScope, TextFragment, TextBlock } from "./Text";
const g2BracketParser = require("g2-bracket-parser");

class IndexStep {
  constructor(
    public readonly xstart: number,
    public readonly xstop: number,
    public readonly yoff: number
  ) {}

  calc(x: number) {
    if (x >= this.xstart && x <= this.xstop) {
      return this.yoff + (x - this.xstart);
    }
    return 0;
  }
}

class IndexCalculatorHelper {
  constructor() {
    this._steps = [];
  }

  addStep(step: IndexStep) {
    this._steps.push(step);
  }

  calc(x: number) {
    let result = 0;
    this._steps.forEach((step) => {
      result += step.calc(x);
    });
    return result;
  }
  private readonly _steps: IndexStep[];
}

class IndexCalculatorHelperDummy extends IndexCalculatorHelper {
  constructor() {
    super();
  }

  addStep(step: IndexStep) {}

  calc(x: number) {
    return x;
  }
}

class RegexGroupMatch {
  constructor(public match: string, public textScope: TextScope) {}
}

class RegexMatch {
  fullMatch: string;
  textScope: TextScope;
  groupMatches: (RegexGroupMatch | undefined)[];

  static fromRegexExec(
    execMatch: RegExpExecArray,
    indexHelper: IndexCalculatorHelper = new IndexCalculatorHelperDummy()
  ) {
    return new RegexMatch(execMatch, execMatch.index, indexHelper);
  }

  static fromArray(
    array: Array<string>,
    offset: number,
    indexHelper: IndexCalculatorHelper = new IndexCalculatorHelperDummy()
  ) {
    return new RegexMatch(array, offset, indexHelper);
  }

  static fromTextBlock(
    textBlock: TextBlock,
    indexHelper: IndexCalculatorHelper = new IndexCalculatorHelperDummy()
  ) {
    return new RegexMatch(
      [textBlock.content],
      textBlock.scopeStart,
      indexHelper
    );
  }

  private constructor(
    matches: Array<string>,
    offset: number,
    indexHelper: IndexCalculatorHelper
  ) {
    this.fullMatch = matches[0];
    this.textScope = new TextScope(
      indexHelper.calc(offset),
      indexHelper.calc(offset + matches[0].length - 1)
    );
    this.groupMatches = matches.slice(1).map((groupMatch) => {
      if (!groupMatch) {
        return undefined;
      }
      const groupOffset = this.fullMatch.indexOf(groupMatch) + offset;
      const startIndex = indexHelper.calc(groupOffset);
      const endIndex = indexHelper.calc(groupOffset + groupMatch.length - 1);
      return new RegexGroupMatch(
        groupMatch,
        new TextScope(startIndex, endIndex)
      );
    });
  }
}

export class TextMatch extends TextScope {
  readonly fullMatch: string;

  static createFromRegexMatch(regexMatch: RegexMatch, fragment: TextFragment) {
    const groupMatches = new Map<number, string>();
    const groupMatchTextFragments = new Map<number, TextFragment>();
    regexMatch.groupMatches.forEach((groupMatch, index) => {
      if (!groupMatch) {
        return;
      }

      groupMatches.set(index, groupMatch.match);
      groupMatchTextFragments.set(index, fragment.slice(groupMatch.textScope));
    });
    return new TextMatch(
      regexMatch.fullMatch,
      regexMatch.textScope,
      groupMatches,
      groupMatchTextFragments,
      regexMatch.groupMatches.length
    );
  }

  constructor(
    fullMatch: string,
    textScope: TextScope,
    groupMatches: Map<number, string>,
    groupMatchTextFragments: Map<number, TextFragment>,
    nMaxGroupMatches: number
  ) {
    super(textScope.scopeStart, textScope.scopeEnd);
    this.fullMatch = fullMatch;
    this._groupMatches = groupMatches;
    this._groupMatchTextFragments = groupMatchTextFragments;
    this._nMaxgroupMatches = nMaxGroupMatches;
  }

  getGroupMatch(index: number): string {
    return this._groupMatches.has(index)
      ? (this._groupMatches.get(index) as string)
      : "";
  }

  getGroupMatchFragment(index: number): TextFragment {
    return this._groupMatchTextFragments.has(index)
      ? (this._groupMatchTextFragments.get(index) as TextFragment)
      : TextFragment.createEmpty();
  }

  concat(other: TextMatch): TextMatch | null {
    if (
      this.scopeEnd + 1 !== other.scopeStart &&
      !this.containsAtStart(other)
    ) {
      return null;
    }

    const groupMatches = new Map([
      ...Array.from(this._groupMatches.entries()),
      ...Array.from(
        other._groupMatches.entries(),
        (entry) =>
          [entry[0] + this._nMaxgroupMatches, entry[1]] as [number, string]
      ),
    ]);
    const groupMatchTextFragments = new Map([
      ...Array.from(this._groupMatchTextFragments.entries()),
      ...Array.from(
        other._groupMatchTextFragments.entries(),
        (entry) =>
          [entry[0] + this._nMaxgroupMatches, entry[1]] as [
            number,
            TextFragment
          ]
      ),
    ]);
    const overlap = this.scopeEnd - other.scopeStart + 1;
    const fullMatch = this.fullMatch + other.fullMatch.substring(overlap);
    const textScope = new TextScope(this.scopeStart, other.scopeEnd);

    return new TextMatch(
      fullMatch,
      textScope,
      groupMatches,
      groupMatchTextFragments,
      this._nMaxgroupMatches + other._nMaxgroupMatches
    );
  }

  private readonly _nMaxgroupMatches: number;
  private readonly _groupMatches: Map<number, string>;
  private readonly _groupMatchTextFragments: Map<number, TextFragment>;
}

function mergeContent(
  textFragment: TextFragment
): [string, IndexCalculatorHelper] {
  let mergedContent = "";
  const indexHelper = new IndexCalculatorHelper();
  textFragment.blocks.forEach((block) => {
    indexHelper.addStep(
      new IndexStep(
        mergedContent.length,
        mergedContent.length + block.content.length - 1,
        block.scopeStart
      )
    );
    mergedContent += block.content;
  });
  return [mergedContent, indexHelper];
}

export interface IMatcher {
  match(textFragment: TextFragment): TextMatch[];
}
export interface IInverseMatcher {
  matchInverse(textFragment: TextFragment): TextMatch[];
}

export class RegexMatcher implements IMatcher, IInverseMatcher {
  constructor(
    private readonly _regex: string,
    private readonly _matchSingle: boolean = false
  ) {}

  match(textFragment: TextFragment): TextMatch[] {
    if (!textFragment.blocks.length) {
      return [];
    }
    const regexMatches = this.matchContentGlobal(textFragment);
    const matches: TextMatch[] = regexMatches.map((regexMatch) =>
      TextMatch.createFromRegexMatch(regexMatch, textFragment)
    );
    return matches;
  }

  matchInverse(textFragment: TextFragment): TextMatch[] {
    if (!textFragment.blocks.length) {
      return [];
    }
    const regexMatches = this.matchContentGlobalInverse(textFragment);
    const matches: TextMatch[] = regexMatches.map((regexMatch) =>
      TextMatch.createFromRegexMatch(regexMatch, textFragment)
    );
    return matches;
  }

  matchContentGlobal(textFragment: TextFragment): RegexMatch[] {
    const regexMatches: RegexMatch[] = [];
    const regexMatcher = new RegExp(this._regex, "g");
    const [mergedContent, indexHelper] = mergeContent(textFragment);

    let rawMatch: any;
    while ((rawMatch = regexMatcher.exec(mergedContent)) !== null) {
      if (rawMatch.index === regexMatcher.lastIndex) {
        regexMatcher.lastIndex++;
      }
      regexMatches.push(RegexMatch.fromRegexExec(rawMatch, indexHelper));
      if (this._matchSingle) {
        break;
      }
    }

    return regexMatches;
  }

  matchContentGlobalInverse(textFragment: TextFragment): RegexMatch[] {
    const inverseRegexMatches: RegexMatch[] = [];
    const regexMatcher = new RegExp(this._regex, "g");
    const [mergedContent, indexHelper] = mergeContent(textFragment);
    const regexMatchScopes: TextScope[] = [];

    let rawMatch: any;
    while ((rawMatch = regexMatcher.exec(mergedContent)) !== null) {
      if (rawMatch.index === regexMatcher.lastIndex) {
        regexMatcher.lastIndex++;
      }
      regexMatchScopes.push(
        new TextScope(
          indexHelper.calc(rawMatch.index),
          indexHelper.calc(rawMatch.index + rawMatch[0].length - 1)
        )
      );
      if (this._matchSingle) {
        break;
      }
    }

    if (regexMatchScopes.length) {
      textFragment.blocks.forEach((block) => {
        block
          .splice(...regexMatchScopes)
          .forEach((newBlock) =>
            inverseRegexMatches.push(RegexMatch.fromTextBlock(newBlock))
          );
      });
    } else {
      inverseRegexMatches.push(
        ...textFragment.blocks.map((block) => RegexMatch.fromTextBlock(block))
      );
    }

    return inverseRegexMatches;
  }
}

export class RemovingRegexMatcher implements IMatcher, IInverseMatcher {
  constructor(regex: string) {
    this._regexMatcher = new RegexMatcher(regex);
  }

  match(textFragment: TextFragment): TextMatch[] {
    if (!textFragment.blocks.length) {
      return [];
    }
    const matches = this._regexMatcher.match(textFragment);
    textFragment.remove(...matches);
    return matches;
  }

  matchInverse(textFragment: TextFragment): TextMatch[] {
    if (!textFragment.blocks.length) {
      return [];
    }
    const matches = this._regexMatcher.matchInverse(textFragment);
    textFragment.remove(...matches);
    return matches;
  }

  private readonly _regexMatcher: RegexMatcher;
}

export class BodyMatcher implements IMatcher {
  constructor(private _brackets: string[], private _matchSingle: boolean) {}

  private matchBody(textFragment: TextFragment): RegexMatch[] {
    const [mergedContent, indexHelper] = mergeContent(textFragment);

    const bracketedContent = g2BracketParser(mergedContent, {
      onlyFirst: this._matchSingle,
      ignoreMissMatch: true,
      brackets: this._brackets,
    });

    return bracketedContent
      .map((content: any) => {
        if (!content?.closed) {
          return;
        }
        return RegexMatch.fromArray(
          [content.content, content.match.content],
          content.start,
          indexHelper
        );
      })
      .filter((element: RegexMatch) => element);
  }

  match(textFragment: TextFragment): TextMatch[] {
    if (!textFragment.blocks.length) {
      return [];
    }

    const regexMatches: RegexMatch[] = this.matchBody(textFragment);
    const matches: TextMatch[] = regexMatches.map((regexMatch) =>
      TextMatch.createFromRegexMatch(regexMatch, textFragment)
    );
    return matches;
  }
}
export class RemovingRegexWithBodyMatcher implements IMatcher {
  constructor(
    regex: string,
    postRegex: string = "",
    openBracket: string = "{",
    closeBracket: string = "}"
  ) {
    this._regexMatcher = new RegexMatcher(regex + `\\s*\\${openBracket}`, true);
    this._bodyMatcher = new BodyMatcher([openBracket], true);
    if (postRegex) {
      this._postRegexMatcher = new RegexMatcher(
        `^\\${closeBracket}\\s*` + postRegex,
        true
      );
    }
  }

  match(textFragment: TextFragment): TextMatch[] {
    if (!textFragment.blocks.length) {
      return [];
    }

    const matches: TextMatch[] = [];
    const fragmentEnd = textFragment.getScopeEnd();
    let textFragForMatching = textFragment.clone();

    while (true) {
      const regexMatch = this._regexMatcher.match(textFragForMatching).pop();
      if (!regexMatch) {
        break;
      }
      const bracketIdx = regexMatch.scopeEnd;
      textFragForMatching = textFragment.slice(new TextScope(bracketIdx, fragmentEnd));
      const bodyMatch = this._bodyMatcher
        .match(textFragForMatching)
        .pop();

      if (!bodyMatch) {
        continue;
      }

      let newMatch = regexMatch.concat(bodyMatch);

      if (newMatch && this._postRegexMatcher) {
        const bracketIdx = newMatch.scopeEnd;
        textFragForMatching = textFragment.slice(new TextScope(bracketIdx, fragmentEnd));
        const postRegexMatch = this._postRegexMatcher
          .match(textFragForMatching)
          .pop();

        if (!postRegexMatch) {
          continue;
        }
        newMatch = newMatch.concat(postRegexMatch);
      }

      if (!newMatch) {
        continue;
      }
      matches.push(newMatch);
      textFragment.remove(newMatch);
    }

    return matches;
  }

  private readonly _regexMatcher: RegexMatcher;
  private readonly _postRegexMatcher?: RegexMatcher;
  private readonly _bodyMatcher: BodyMatcher;
}
