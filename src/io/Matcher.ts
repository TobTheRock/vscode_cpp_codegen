import { isFunction, isObject } from "util";
import { TextScope, TextFragment, TextBlock } from "./Text";
const g2BracketParser = require("g2-bracket-parser");

class IndexStep {
    constructor(public readonly xstart:number,
                public readonly xstop:number,
                public readonly yoff:number) {
    }

    calc(x:number) {
        if ((x >= this.xstart) && (x <= this.xstop)) {
            return this.yoff + (x-this.xstart);
        }
        return 0;
    }
}

class IndexCalculatorHelper {
    constructor() {
        this._steps = [];
    }

    addStep(step:IndexStep) {
        this._steps.push(step);
    }

    calc(x:number) {
        let result = 0;
        this._steps.forEach(
            (step)=>{
                result += step.calc(x);
            });
        return result;
    }
    private readonly _steps:IndexStep[];
}

class IndexCalculatorHelperDummy extends IndexCalculatorHelper {
    constructor() {
        super();
    }

    addStep(step:IndexStep) {
    }

    calc(x:number) {
        return x;
    }
}

class RegexGroupMatch {
    constructor (public match:string, public textScope:TextScope){};
}

class RegexMatch {    
    
    fullMatch:string;
    textScope:TextScope;
    groupMatches:(RegexGroupMatch|undefined)[];

    static fromRegexExec(execMatch:RegExpExecArray, indexHelper:IndexCalculatorHelper = new IndexCalculatorHelperDummy) {
        return new RegexMatch(execMatch, execMatch.index, indexHelper);
    } 
    
    static fromArray(array:Array<string>, offset: number,indexHelper:IndexCalculatorHelper = new IndexCalculatorHelperDummy) {
        return new RegexMatch(array, offset, indexHelper);
    }    
    
    static fromTextBlock(textBlock:TextBlock, indexHelper:IndexCalculatorHelper = new IndexCalculatorHelperDummy) {
        return new RegexMatch([textBlock.content], textBlock.scopeStart, indexHelper);
    }

    private constructor(matches:Array<string>, offset:number, indexHelper:IndexCalculatorHelper) {

        this.fullMatch = matches[0];
        this.textScope = new TextScope(indexHelper.calc(offset), indexHelper.calc(offset + matches[0].length-1));
        this.groupMatches = Array.from(matches.slice(1), groupMatch => {
            if (!groupMatch) {
                return undefined;
            }
            const groupOffset = this.fullMatch.indexOf(groupMatch) + offset;
            const startIndex = indexHelper.calc(groupOffset);
            const endIndex = indexHelper.calc(groupOffset+groupMatch.length-1);
            return new RegexGroupMatch(groupMatch, new TextScope(startIndex, endIndex));
        });
    }
}


export class TextMatch extends TextScope {
    readonly fullMatch:string;

    constructor(regexMatch:RegexMatch, fragment: TextFragment) {
        super(regexMatch.textScope.scopeStart, regexMatch.textScope.scopeEnd);
        this.fullMatch = regexMatch.fullMatch;
        this._groupMatches = new Map<number, string>();
        this._groupMatchTextFragments = new Map<number, TextFragment>();
        regexMatch.groupMatches.forEach((groupMatch, index) => {
            if (!groupMatch) {
                return;
            }

            this._groupMatches.set(index, groupMatch.match);
            this._groupMatchTextFragments.set(index, fragment.slice(groupMatch.textScope));
        });

    }

    getGroupMatch(index: number):string {
        return this._groupMatches.has(index) ? this._groupMatches.get(index) as string : "";
    }

    getGroupMatchFragment(index: number):TextFragment {
        return this._groupMatchTextFragments.has(index) ? this._groupMatchTextFragments.get(index) as TextFragment : TextFragment.createEmpty();
    }
    
    private _groupMatches:Map<number, string>;
    private _groupMatchTextFragments:Map<number, TextFragment>;
}

function mergeContent(textFragment: TextFragment):[string, IndexCalculatorHelper] {
    let mergedContent = "";
    const indexHelper = new IndexCalculatorHelper;
    textFragment.blocks.forEach(
        (block) => {
            indexHelper.addStep(new IndexStep(mergedContent.length, mergedContent.length+block.content.length-1, block.scopeStart));
            mergedContent += block.content;
    });
    return [mergedContent, indexHelper];
}

function matchContentGlobal(textFragment: TextFragment, regex:string, matchSingle:boolean = false):RegexMatch[] {
    const regexMatches:RegexMatch[] = []; 
    const regexMatcher = new RegExp(regex, 'g'); 
    const [mergedContent, indexHelper] = mergeContent(textFragment);

    let rawMatch:any; 
    while ((rawMatch = regexMatcher.exec(mergedContent)) !== null) 
    {
        if (rawMatch.index === regexMatcher.lastIndex) {
            regexMatcher.lastIndex++;
        }
        regexMatches.push(RegexMatch.fromRegexExec(rawMatch, indexHelper));
        if (matchSingle) {
            break;
        }
    }

    return regexMatches;
}

function matchContentGlobalInverse(textFragment: TextFragment, regex:string):RegexMatch[] {
    const inverseRegexMatches:RegexMatch[] = []; 
    const regexMatcher = new RegExp(regex, 'g'); 
    const [mergedContent, indexHelper] = mergeContent(textFragment);
    const regexMatchScopes: TextScope[] = [];

    let rawMatch:any;
    while ((rawMatch = regexMatcher.exec(mergedContent)) !== null) 
    {
        if (rawMatch.index === regexMatcher.lastIndex) {
            regexMatcher.lastIndex++;
        }
        regexMatchScopes.push (new TextScope(indexHelper.calc(rawMatch.index), indexHelper.calc(rawMatch.index + rawMatch[0].length-1)));
    }

    if (regexMatchScopes.length) {
        textFragment.blocks.forEach(block => {
            block.splice(...regexMatchScopes).forEach( newBlock =>
            inverseRegexMatches.push(RegexMatch.fromTextBlock(newBlock)));
        });
    } else {

        inverseRegexMatches.push(...Array.from(textFragment.blocks, block => RegexMatch.fromTextBlock(block)));
    }

    return inverseRegexMatches;
}

export interface IMatcher {
    match(textFragment:TextFragment):TextMatch[];
}
export interface IInverseMatcher {
    matchInverse(textFragment:TextFragment):TextMatch[];
}


export class RegexMatcher implements IMatcher, IInverseMatcher {
    constructor (private readonly _regex:string) {}



    match(textFragment: TextFragment): TextMatch[] {
        if (!textFragment.blocks.length) {
            return [];
        }
        const regexMatches = matchContentGlobal(textFragment, this._regex);
        const matches:TextMatch[] = Array.from(regexMatches, regexMatch => new TextMatch(regexMatch, textFragment)); 
        return matches;
    }

    matchInverse(textFragment: TextFragment): TextMatch[] {
        if (!textFragment.blocks.length) {
            return [];
        }
        const regexMatches = matchContentGlobalInverse(textFragment, this._regex);
        const matches:TextMatch[] = Array.from(regexMatches, regexMatch => new TextMatch(regexMatch, textFragment)); 
        return matches;
    }
}

export class RemovingRegexMatcher implements IMatcher, IInverseMatcher {
    constructor (regex:string) {
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

    private readonly _regexMatcher:RegexMatcher;
}
export class RemovingRegexWithBodyMatcher implements IMatcher {
    constructor (regex:string) {
        this._regex = regex + "\\s*\{";
    }

    private matchBody(textFragment: TextFragment): RegexMatch|null {
        const [mergedContent, indexHelper] = mergeContent(textFragment);

        const bracketedContent = g2BracketParser(mergedContent, {onlyFirst: true, ignoreMissMatch: true, brackets:"{"})[0];

        if (!bracketedContent?.closed) {
            return null;
        }
        return RegexMatch.fromArray([bracketedContent.content, bracketedContent.match.content],bracketedContent.start, indexHelper);
    }

    match(textFragment: TextFragment): TextMatch[] {
        if (!textFragment.blocks.length) {
            return [];
        }
        
        const matches:TextMatch[] = []; 
        const fragmentEnd = textFragment.getScopeEnd();
        let matchesFound = true;
        let lastMatchEndIdx = 0;

        while (matchesFound) {
            const regexMatches = matchContentGlobal(textFragment.slice(new TextScope(lastMatchEndIdx, fragmentEnd)), this._regex, true);
            if (regexMatches.length === 1) {
                const bracketIdx = regexMatches[0].textScope.scopeEnd;
                const bodyMatch = this.matchBody(textFragment.slice(new TextScope(bracketIdx, fragmentEnd)));
                if (bodyMatch) {
                    const newMatch = regexMatches[0];
                    newMatch.textScope = new TextScope(regexMatches[0].textScope.scopeStart, bodyMatch.textScope.scopeEnd);
                    newMatch.fullMatch = textFragment.slice(newMatch.textScope).toString();
                    newMatch.groupMatches.push(...bodyMatch.groupMatches);
                    matches.push(new TextMatch(newMatch, textFragment));
                    lastMatchEndIdx =  newMatch.textScope.scopeEnd;
                }
            } else {
                matchesFound = false;
            }
        }

        textFragment.remove(...matches);
        return matches;
    }

    private readonly _regex:string;
}
