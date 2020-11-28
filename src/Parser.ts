import { IFunction, INamespace } from "./cpptypes";
import { Namespace } from "./cpptypes/Namespace";
import { StandaloneFunction } from "./cpptypes/StandaloneFunction";


class NamespaceMatch {
    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== NamespaceMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatchArr[1] === undefined) {
            throw new Error("ParserError: No namespace name, this should not happen!");               
        }

        this.nameMatch = regexMatchArr[1];

        this.namespaceMatch = (regexMatchArr[2]) ? regexMatchArr[2] : "";
        this.contentMatch = (regexMatchArr[3]) ? regexMatchArr[3] : "";
    }

    // static readonly REGEX_STR:string = 'namespace ([^\\s]*)\\s*{([\\s\\S]*namespace [^\\s]*\\s*{[\\s\\S]*})*((?!namespace)[\\s\\S]*)}';
    static readonly REGEX_STR:string = 'namespace ([^\\s]*)\\s*{([\\s\\S]*namespace [^\\s]*\\s*{[\\s\\S]*})*((?:(?!namespace)[\\s\\S])*)}';
    static readonly NOF_GROUPMATCHES = 3;
    nameMatch:string;
    namespaceMatch:string;
    contentMatch:string;
}
class StandaloneFunctionMatch {
    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== NamespaceMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatchArr[1] === undefined) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }

        else if (regexMatchArr[2] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        this.returnValMatch = regexMatchArr[1];
        this.nameMatch = regexMatchArr[2];

        this.argsMatch = (regexMatchArr[3]) ? regexMatchArr[3] : "";
    }

    //TODO default args with initializers
    static readonly REGEX_STR:string = '((?:const )?[\\S]*)[\\s]*([\\S]*)[\\s]*\\(([\\s\\S]*?)\\);';
    static readonly NOF_GROUPMATCHES = 3;

    returnValMatch:string;
    nameMatch:string;
    argsMatch:string;
}

export abstract class Parser {

    static parseNamespaces(content:string) {
        let namespaces:INamespace[] = [];

        Parser.findAllRegexMatches(
            NamespaceMatch.REGEX_STR,
            content,
            (rawMatch) => {
                let match = new NamespaceMatch (rawMatch);

                //TODO avoid recursion?
                let subNamespaces:INamespace[] = Parser.parseNamespaces(match.namespaceMatch);
                let newNamespace =new Namespace(match.nameMatch, subNamespaces);
                try {
                    newNamespace.deserialize(match.contentMatch);
                    namespaces.push(newNamespace);
                } catch (error) {
                    console.log(error, "Failed to parse namespace contents, skipping!");
                }
            }
        );
        
        return namespaces;
    }

    static parseStandaloneFunction(content:string) {
        let standaloneFunctions:IFunction[] = [];

        Parser.findAllRegexMatches(
            StandaloneFunctionMatch.REGEX_STR,
            content,
            (rawMatch) => {
                let match = new StandaloneFunctionMatch(rawMatch);
                standaloneFunctions.push(new StandaloneFunction(match.nameMatch, 
                    match.returnValMatch, 
                    match.argsMatch));
            }
        );

        return standaloneFunctions;
    }

    private static findAllRegexMatches(regex:string, 
            content:string, 
            onMatch: (rawMatch:RegExpExecArray) => void) {
        if (!content) {
            return;
        }
        const namespaceRegex = new RegExp(regex, 'g');
        let rawMatch;
        while ((rawMatch = namespaceRegex.exec(content)) !== null) {
            if (rawMatch.index === namespaceRegex.lastIndex) {
                namespaceRegex.lastIndex++;
            }
            onMatch(rawMatch);
        }
    }
}