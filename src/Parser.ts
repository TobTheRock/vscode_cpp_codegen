import * as cpptypes from "./cpptypes";


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
    static readonly REGEX_STR:string = 'namespace (\\S*)\\s*{([\\s\\S]*namespace \\S*\\s*{[\\s\\S]*})*((?:(?!namespace)[\\s\\S])*)}';
    static readonly NOF_GROUPMATCHES = 3;
    readonly nameMatch:string;
    readonly namespaceMatch:string;
    readonly contentMatch:string;
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

    static readonly REGEX_STR:string = '((?:const )?\\S*)\\s*(\\S*)\\s*\\(([\\s\\S]*?)\\)\\s*;';
    static readonly NOF_GROUPMATCHES = 3;

    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
}

class ClassMatch {
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

        this.nameMatch = regexMatchArr[1];

        this.bodyMatch = (regexMatchArr[2]) ? regexMatchArr[2] : "";
    }

    // TODO: Inheritance
    private static readonly classBeginRegex:string = 'class\\s+([\\S]+)\\s*{';
    private static readonly classNonNestedBodyRegex:string = '((?!' + ClassMatch.classBeginRegex + ')[\\s\\S])*?}\\s*;';
    static readonly REGEX_STR:string = ClassMatch.classBeginRegex + ClassMatch.classNonNestedBodyRegex;
    static readonly NOF_GROUPMATCHES = 2;

    readonly nameMatch:string;
    readonly bodyMatch:string;
}

export abstract class Parser {

    static parseNamespaces(content:string) {
        let namespaces:cpptypes.INamespace[] = [];

        Parser.findAllRegexMatches(
            NamespaceMatch.REGEX_STR,
            content,
            (rawMatch) => {
                let match = new NamespaceMatch (rawMatch);

                //TODO avoid recursion?
                let subNamespaces:cpptypes.INamespace[] = Parser.parseNamespaces(match.namespaceMatch);
                let newNamespace =new cpptypes.Namespace(match.nameMatch, subNamespaces);
                try {
                    newNamespace.deserialize(match.contentMatch);
                    namespaces.push(newNamespace);
                } catch (error) {
                    console.log(error, "Failed to parse namespace contents, skipping!"); // TODO API error? e.g showErrorMessage
                }
            }
        );
        
        return namespaces;
    }

    static parseStandaloneFunctiones(content:string) {
        let standaloneFunctions:cpptypes.IFunction[] = [];

        Parser.findAllRegexMatches(
            StandaloneFunctionMatch.REGEX_STR,
            content,
            (rawMatch) => {
                let match = new StandaloneFunctionMatch(rawMatch);
                standaloneFunctions.push(new cpptypes.StandaloneFunction(match.nameMatch, 
                    match.returnValMatch, 
                    match.argsMatch));
            }
        );

        return standaloneFunctions;
    }
    
    static parseGeneralClasses(content:string) {
        let classes:cpptypes.IClass[] = [];

        Parser.findAllRegexMatches(
            ClassMatch.REGEX_STR,
            content,
            (rawMatch) => {
                let match = new ClassMatch(rawMatch);
                let newClass = new cpptypes.GeneralClass(match.nameMatch);
                try {
                    newClass.deserialize(match.bodyMatch);
                    classes.push(newClass);
                } catch (error) {
                    console.log(error, "Failed to parse class contents, skipping!");
                }

                //TODO nested classes -> rm from string and search again ? -> Howto add them to belonging class?
            }
        );

        return classes;
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