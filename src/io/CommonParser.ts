import * as io from ".";

export function joinStringsWithFiller(strings:string[], filler:string):string {
    let joinedStrings = '';
    for (let index = 0; index < strings.length-1; index++) {
        joinedStrings += strings[index] + filler;
    }

    return joinedStrings + strings[strings.length-1];
}

export function joinStringsWithWhiteSpace(...strings:string[]):string {
    return joinStringsWithFiller(strings, "\\s*");
}

export class NamespaceMatch {
    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== NamespaceMatch.nofGroupMatches) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatch.groupMatches[0] === undefined) {
            throw new Error("ParserError: No namespace name, this should not happen!");               
        }

        this.nameMatch = regexMatch.groupMatches[0];

        this.bodyMatch = regexMatch.getGroupMatchTextBlock(1);
    }

    private static readonly namespaceSpecifierRegex: string = "namespace\\s";
    private static readonly namespaceNameRegex: string = "([\\S]+)";
    private static readonly noNestedNamespaceRegex: string = "(?!"+NamespaceMatch.namespaceSpecifierRegex+"\\s*[\\S]+\\s*{)";
    private static readonly namespaceBodyRegex: string = "{((?:"+NamespaceMatch.noNestedNamespaceRegex+"[\\s\\S])*?)}(?![\\s]*;)";
    
    static readonly regexStr: string = joinStringsWithWhiteSpace(
        NamespaceMatch.namespaceSpecifierRegex, NamespaceMatch.namespaceNameRegex, NamespaceMatch.namespaceBodyRegex);
    static readonly nofGroupMatches = 2;

    readonly nameMatch:string;
    readonly bodyMatch:io.TextBlock|undefined;
}

class CommentMatch {
    static readonly regexStr:string = "(\\/\\*[\\s\\S]*?\\*\\/)|(\\/\\/.*)";
}

export abstract class CommonParser {
    static parseComments(data:io.TextFragment): void {
        data.removeMatching(CommentMatch.regexStr);
    }
}