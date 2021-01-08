function error(condition:boolean, errMsg:string = "") {
    if (!condition) {
        throw new Error(errMsg);
    }
}
export class TextScope {
    constructor(public readonly scopeStart:number,
                public readonly scopeEnd:number) {
                    error(scopeStart <= scopeEnd, "scopeEnd must be greater than scopeStart");
                    error(scopeStart>=0, "Scope start muss be greater zero!");
                    error(scopeEnd>=0, "Scope end muss be greater zero!");
                }

    fullyContains(other:TextScope):boolean {
        return ((this.scopeStart <= other.scopeStart) && (this.scopeEnd >= other.scopeEnd));
    }

    contains(other:TextScope):boolean {
        return this.containsAtStart(other) && this.containsAtEnd(other);
    }

    containsAtStart(other:TextScope):boolean {
        return (other.scopeEnd >= this.scopeStart);
    }

    containsAtEnd(other:TextScope):boolean {
        return (other.scopeStart <= this.scopeEnd);
    }


    static merge(...scopes:TextScope[]):TextScope[] {

        if (scopes.length <= 1) {
            return scopes;
        }

        const mergedScopes:TextScope[] = [];
        scopes = scopes.sort((a,b) => {
            return a.scopeStart - b.scopeStart;
        });

        for (let index = 1; index < scopes.length; index++) {
            const scope = scopes[index-1];
            const nextScope = scopes[index];

            if (scope.contains(nextScope)) {
                mergedScopes.push(new TextScope(scope.scopeStart, nextScope.scopeEnd));
            } else {
                mergedScopes.push(scope);
                if (index === scopes.length-1) {
                    mergedScopes.push(nextScope);
                }
            }
        }
        return mergedScopes;
    }
}

export class TextRegexMatch extends TextScope {
    
    fullMatch:string;
    groupMatches:string[];
    

    static fromRegexExec(execMatch:RegExpExecArray, scopeOffset:number) {
        return new TextRegexMatch(execMatch, scopeOffset + execMatch.index);
    }    
    
    static fromTextBlock(textBlock:TextBlock) {
        return new TextRegexMatch([textBlock.content], textBlock.scopeStart);
    }

    static fromTextRegexMatch(textRegexMatch:TextRegexMatch, scopeStart:number = 0, scopeEnd:number = 0) {
        return new TextRegexMatch([textRegexMatch.fullMatch, ...textRegexMatch.groupMatches], scopeStart, scopeEnd);
    }

    private constructor(matches:Array<string>, scopeStart:number, scopeEnd?:number) {

        super(scopeStart, scopeEnd ? scopeEnd : scopeStart + matches[0].length-1);
        this.fullMatch = matches[0];
        this.groupMatches = matches.slice(1);
    }
    
    getGroupMatchTextBlock(index:number): TextBlock|undefined {
        error(index < this.groupMatches.length, "Group match index out of bounds ");
        const groupMatch = this.groupMatches[index];
        if (groupMatch && groupMatch.length) {
            const offset = this.fullMatch.indexOf(groupMatch);
            return new TextBlock(groupMatch, this.scopeStart+offset);
        }
        return undefined;
    }
}

export class TextBlock extends TextScope {
    public readonly content:string;
    constructor(content:string,
                scopeOffset:number = 0) {
                    error(content.length > 0, "Content is empty");
                    super(scopeOffset, scopeOffset + content.length-1);
                    this.content = content;
                }
    
    splice(scopes:TextScope[]):TextBlock[] {

        if (!scopes.length)  {
            return [this];
        }

        let splittedBlocks:TextBlock[] =  [];
        scopes = TextScope.merge(...scopes);

        let lastStart = this.scopeStart;
        const trySliceContent = (start:number, end:number) => {
            if (start > this.scopeEnd) {
                return;
            }

            let startRel = start-this.scopeStart;
            startRel = (startRel < 0) ? 0 : startRel;
            let endRel = end-this.scopeStart;
            endRel = (endRel < 0) ? 0 : endRel;
            if (endRel > startRel) {
                let slicedContent = this.content.slice(startRel,endRel);
                if (slicedContent.length) {
                    splittedBlocks.push(new TextBlock(slicedContent, this.scopeStart+startRel));
                }
            }
        };

        for (let index = 0; index < scopes.length; index++) {
            const scope = scopes[index];

            if ((scope.scopeStart === this.scopeStart) && (scope.scopeEnd === this.scopeEnd)) {
                return [];
            }

            trySliceContent(lastStart,scope.scopeStart);
            lastStart = scope.scopeEnd+1;
        }
        trySliceContent(lastStart, this.scopeEnd+1);

        if (!splittedBlocks.length) {
            splittedBlocks.push(this);
        }

        return splittedBlocks;
     } 

     private matchContent(regex:string):TextRegexMatch[] {
        const regexMatches:TextRegexMatch[] = []; 
        const regexMatcher = new RegExp(regex, 'g'); 
        let rawMatch:any;
        while ((rawMatch = regexMatcher.exec(this.content)) !== null) 
        {
            if (rawMatch.index === regexMatcher.lastIndex) {
                regexMatcher.lastIndex++;
            }
            regexMatches.push(TextRegexMatch.fromRegexExec(rawMatch, this.scopeStart));
        }
        return regexMatches;
     }

    match (regex:string):TextRegexMatch[] {
        const regexMatches:TextRegexMatch[] = this.matchContent(regex); 
        return regexMatches;
    }

    inverseMatch (regex:string):TextRegexMatch[] {
        const regexMatches:TextRegexMatch[] = this.matchContent(regex); 
        const inverseRegexMatches:TextRegexMatch[] = [];
        this.splice(regexMatches).forEach(
            (splicedBlock) => {
                inverseRegexMatches.push(TextRegexMatch.fromTextBlock(splicedBlock));
            }
        );

        return inverseRegexMatches;
    }

    clone():TextBlock{

        return new TextBlock(this.content.slice(), this.scopeStart);    
    }
}

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
    public readonly steps:IndexStep[];
    constructor() {
        this.steps = [];
    }

    addStep(step:IndexStep) {
        this.steps.push(step);
    }

    calc(x:number) {
        let result = 0;
        this.steps.forEach(
            (step)=>{
                result += step.calc(x);
            });
        return result;
    }
}

export class TextFragment {
    readonly blocks:TextBlock[] = [];
    constructor(content:string = "") {
        if (content.length) {
            this.blocks = [new TextBlock(content)];            
        }
    }

    private matchImpl(regex:string, inverse:boolean) {
        if (!this.blocks.length) {
            return [];
        }

        let mergedContent = "";
        const indexHelper = new IndexCalculatorHelper;
        this.blocks.forEach(
            (block) => {
                indexHelper.addStep(new IndexStep(mergedContent.length, mergedContent.length+block.content.length-1, block.scopeStart));
                mergedContent += block.content;
        });
        const mergedBlock = new TextBlock(mergedContent); 
        const regexMatches = inverse ? mergedBlock.inverseMatch(regex) : mergedBlock.match(regex);

        for (let index = regexMatches.length-1; index >= 0; index--) {
            const match = regexMatches[index];
            const scopeStart = indexHelper.calc(match.scopeStart);
            const scopeEnd = indexHelper.calc(match.scopeEnd);
            regexMatches.splice(index, 1, 
                TextRegexMatch.fromTextRegexMatch(match, scopeStart, scopeEnd));
        }      

        for (let index = this.blocks.length-1; index >= 0; index--) {
            const block = this.blocks[index];
            const splicedBlocks = block.splice(regexMatches);
            this.blocks.splice(index, 1, ...splicedBlocks);
        }

        return regexMatches;
    }

    removeMatching(regex:string):TextRegexMatch[] {
        return this.matchImpl(regex,false);
    }

	removeNotMatching(regex: string):TextRegexMatch[] {
        return this.matchImpl(regex,true);
    }
    
    clone():TextFragment {
        const newFragment = new TextFragment();
        this.blocks.forEach(
            (block) => {
                newFragment.blocks.push(block.clone());
            }
        );
        return newFragment;
    }

    push(...blocks:TextBlock[]) {
        this.blocks.push(...blocks);
    }

    reset() {
        this.blocks.length = 0;
    }
}
