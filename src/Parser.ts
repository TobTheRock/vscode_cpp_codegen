import * as cpptypes from "./cpptypes";
import * as io from "./io";

// TODO Error handling: do try catch in parser or move it to a higher level (prefered so we can catch errors in deserialze functions)?

function joinStringsWithFiller(strings:string[], filler:string):string {
    let joinedStrings = '';
    for (let index = 0; index < strings.length-1; index++) {
        joinedStrings += strings[index] + filler;
    }

    return joinedStrings + strings[strings.length-1];
}

class RawMatch {
    constructor(public fullMatch:string, public captures:string[]) {
        
    }
}

class NamespaceMatch {
    constructor(rawMatch:RawMatch) {
        if (rawMatch.captures.length !== NamespaceMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (rawMatch.captures[0] === undefined) {
            throw new Error("ParserError: No namespace name, this should not happen!");               
        }

        this.nameMatch = rawMatch.captures[0];

        this.contentMatch = (rawMatch.captures[1]) ? rawMatch.captures[1] : "";
    }

    private static readonly namespaceSpecifierRegex: string = "namespace\\s";
    private static readonly namespaceNameRegex: string = "([\\S]+)";
    private static readonly namespaceBodyRegex: string = "{([\\s\\S]*)}";
    private static readonly nextNamespaceRegex: string = "(?=namespace)";
    
    static readonly SINGLE_REGEX_STR: string = joinStringsWithFiller(
        [NamespaceMatch.namespaceSpecifierRegex, NamespaceMatch.namespaceNameRegex, NamespaceMatch.namespaceBodyRegex], "\\s*");
    static readonly MULTI_REGEX_STR: string = joinStringsWithFiller(
        [NamespaceMatch.SINGLE_REGEX_STR, NamespaceMatch.nextNamespaceRegex], "[\\s\\S]*?");
    static readonly NOF_GROUPMATCHES = 2;

    static readonly REGEX_STR:string = 'namespace (\\S*)\\s*{([\\s\\S]*namespace \\S*\\s*{[\\s\\S]*})*((?:(?!namespace)[\\s\\S])*)}';
    readonly nameMatch:string;
    readonly contentMatch:string;
}

class StandaloneFunctionMatch {
    constructor(rawMatch:RawMatch) {
        if (rawMatch.captures.length !== StandaloneFunctionMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (rawMatch.captures[0] === undefined) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }

        else if (rawMatch.captures[1] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        this.returnValMatch = rawMatch.captures[0];
        this.nameMatch = rawMatch.captures[1];

        this.argsMatch = (rawMatch.captures[2]) ? rawMatch.captures[2] : "";
    }

    static readonly REGEX_STR:string = '((?:const )?\\S*)\\s*(\\S*)\\s*\\(([\\s\\S]*?)\\)\\s*;';
    static readonly NOF_GROUPMATCHES = 3;

    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
}

class ClassMatch {
    constructor(rawMatch:RawMatch) {
        if (rawMatch.captures.length !== ClassMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (rawMatch.captures[0] === undefined) {
            throw new Error("ParserError: No class name, this should not happen!");               
        }

        this.nameMatch = rawMatch.captures[0];
        this.inheritanceMatch = (rawMatch.captures[1]) ? rawMatch.captures[1].split(",") : [];
        this.bodyMatch = (rawMatch.captures[2]) ? rawMatch.captures[2] : "";
        this.isInterface = ClassMatch.pureVirtualMemberRegexMatcher.test(this.bodyMatch);
    }

    private static readonly classSpecifierRegex: string = "class\\s";
    private static readonly classNameRegex: string = "([\\S]+)";
    private static readonly inheritanceRegex: string = "(?::\\s*([\\S\\s]+))?";
    private static readonly classBodyRegex: string = "{([\\s\\S]*)}";
    private static readonly classEndRegex: string = ";";
    private static readonly nextClassRegex: string = "(?=class)";
    private static readonly pureVirtualMemberRegexMatcher =  /virtual[\s\S]*?=[\s]*0[\s]*;/g;
    
    static readonly SINGLE_REGEX_STR: string = joinStringsWithFiller(
        [ClassMatch.classSpecifierRegex, ClassMatch.classNameRegex, ClassMatch.inheritanceRegex,
         ClassMatch.classBodyRegex, ClassMatch.classEndRegex], "\\s*");
    static readonly MULTI_REGEX_STR: string = joinStringsWithFiller(
        [ClassMatch.SINGLE_REGEX_STR, ClassMatch.nextClassRegex], "[\\s\\S]*?");
    static readonly NOF_GROUPMATCHES = 3;

    readonly nameMatch:string;
    readonly inheritanceMatch: string[];
    readonly bodyMatch: string;
    readonly isInterface: boolean;
}
class ClassProtectedScopeMatch {

    constructor(rawMatch:RawMatch) {
        if (rawMatch.captures.length !== ClassProtectedScopeMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = (rawMatch.captures[0]) ? rawMatch.captures[0] : "";
    }

    static readonly REGEX_STR:string = "protected:((?:(?!private:)(?!public:)[\\s\\S])*)";
    static readonly NOF_GROUPMATCHES = 1;

    readonly scopeContent:string;
}
class ClassPublicScopeMatch {

    constructor(rawMatch:RawMatch) {
        if (rawMatch.captures.length !== ClassPublicScopeMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = (rawMatch.captures[0]) ? rawMatch.captures[0] : "";
    }

    static readonly REGEX_STR:string = "public:((?:(?!private:)(?!protected:)[\\s\\S])*)";
    static readonly NOF_GROUPMATCHES = 1;

    readonly scopeContent:string;
}

class MemberFunctionMatch {
    constructor(rawMatch:RawMatch) {
        if (rawMatch.captures.length !== MemberFunctionMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (rawMatch.captures[1] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        let virtualMatcher = new RegExp (MemberFunctionMatch.virtualSubMatchRegex);
        let match = virtualMatcher.exec(rawMatch.captures[0]);
        if (!match || !match[2]) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }
        this.virtualMatch = (match[1]) ? true : false;
        this.returnValMatch = match[2];

        this.nameMatch = rawMatch.captures[1];
        this.argsMatch = (rawMatch.captures[2]) ? rawMatch.captures[2] : "";
        this.constMatch = (rawMatch.captures[3]) ? true : false;

        this.virtualMatch = (this.virtualMatch) || ((rawMatch.captures[4]) ? true : false);
        this.pureMatch = (rawMatch.captures[5]) ? true : false;
        if (!this.virtualMatch && this.pureMatch) {
           throw new Error("ParserError: Invalid specifier combination: '=0' missing virtual for function: " + this.nameMatch);
           return;
        }

    }

    private static readonly mayHaveVirtualRegex:string = '(virtual)?';
    private static readonly returnValRegex:string = '(\\S+[\\s\\S]*?)';
    private static readonly funcNameRegex:string = '(\\S+)';
    private static readonly funcArgsRegex:string = '\\(([\\s\\S]*?)\\)';
    private static readonly mayHaveConstSpecifierRegex:string = '(const)?';
    private static readonly mayHaveOverrideRegex:string = '(override)?';
    private static readonly mayBePure:string = '(=\\s*0)?';
    private static readonly virtualSubMatchRegex:string = joinStringsWithFiller([MemberFunctionMatch.mayHaveVirtualRegex, MemberFunctionMatch.returnValRegex + '$'], '\\s*');
    static readonly REGEX_STR:string = joinStringsWithFiller([MemberFunctionMatch.returnValRegex+'\\s', MemberFunctionMatch.funcNameRegex,
         MemberFunctionMatch.funcArgsRegex, MemberFunctionMatch.mayHaveConstSpecifierRegex, MemberFunctionMatch.mayHaveOverrideRegex, MemberFunctionMatch.mayBePure, ';'], '\\s*');
    static readonly NOF_GROUPMATCHES = 6;

    readonly virtualMatch:boolean;
    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
    readonly constMatch:boolean;
    readonly pureMatch:boolean;
}



export abstract class Parser {

    static parseClassPrivateScope(data:io.DeseralizationData): io.DeseralizationData {
        let publicOrPrivateRegexMatcher:RegExp = /(?:public:|protected:)((?!private:)[\s\S])*/g;
        let privateScope = data.remainingContent.replace(publicOrPrivateRegexMatcher, "");
        return new io.DeseralizationData(privateScope);
    }

    static parseClassPublicScope(data:io.DeseralizationData): io.DeseralizationData {
        let publicScope = "";
        Parser.findAllAndRemoveRegexMatches(ClassPublicScopeMatch.REGEX_STR, data,
            (rawMatch) => {
                let match = new ClassPublicScopeMatch(rawMatch);
                publicScope += match.scopeContent;
            }
            );


        return new io.DeseralizationData(publicScope);
    }

    static parseClassProtectedScope(data:io.DeseralizationData): io.DeseralizationData {
        let protectedScope = "";
        Parser.findAllAndRemoveRegexMatches(ClassProtectedScopeMatch.REGEX_STR, data,
            (rawMatch) => {
                let match = new ClassProtectedScopeMatch(rawMatch);
                protectedScope += match.scopeContent;
            }
            );

        return new io.DeseralizationData(protectedScope);
    }

    static parseClassMemberFunctions(data: io.DeseralizationData, classNameGen:io.ClassNameGenerator): cpptypes.IFunction[] {
        let memberFunctions:cpptypes.IFunction[] = [];
        Parser.findAllAndRemoveRegexMatches(MemberFunctionMatch.REGEX_STR, data,
            (rawMatch) => {
                let match = new MemberFunctionMatch(rawMatch);        

                let newFunc:cpptypes.IFunction;
                if (match.virtualMatch) {
                    if (match.pureMatch) {
                        newFunc = new cpptypes.PureVirtualMemberFunction(match.nameMatch, match.returnValMatch,
                             match.argsMatch, match.constMatch, classNameGen);
                    }
                    else {
                        newFunc = new cpptypes.VirtualMemberFunction(match.nameMatch, match.returnValMatch,
                             match.argsMatch, match.constMatch, classNameGen);
                    }
                }
                else {
                    newFunc = new cpptypes.MemberFunction(match.nameMatch, match.returnValMatch,
                        match.argsMatch, match.constMatch, classNameGen);
                }

                memberFunctions.push(newFunc);
            }
            );

        return memberFunctions;
    }

    static parseNamespaces(data:io.DeseralizationData): cpptypes.INamespace[]  {
        let namespaces:cpptypes.INamespace[] = [];

        let generateNewNamespace = (rawMatch: RawMatch) => {
            let match = new NamespaceMatch(rawMatch);
            let newNamespace = new cpptypes.Namespace(match.nameMatch);
            let newData = new io.DeseralizationData(match.contentMatch);
            newNamespace.deserialize(newData);
            return newNamespace;
        };

        Parser.findAllAndRemoveRegexMatches(
            NamespaceMatch.MULTI_REGEX_STR,
            data,
            (rawMatch) => {
                namespaces.push(generateNewNamespace(rawMatch));
            }
        );
        Parser.findAllAndRemoveRegexMatches(
            NamespaceMatch.SINGLE_REGEX_STR,
            data,
            (rawMatch) => {
                namespaces.push(generateNewNamespace(rawMatch))
            }
        );

        // if (!namespaces.length) {
        //     let newNamespace = new cpptypes.NoneNamespace();
        //     newNamespace.deserialize(data);
        //     namespaces.push(newNamespace);
        // }

        return namespaces;
    }

    static parseStandaloneFunctiones(data:io.DeseralizationData): cpptypes.IFunction[] {
        let standaloneFunctions:cpptypes.IFunction[] = [];

        Parser.findAllAndRemoveRegexMatches(
            StandaloneFunctionMatch.REGEX_STR,
            data,
            (rawMatch) => {
                let match = new StandaloneFunctionMatch(rawMatch);
                standaloneFunctions.push(new cpptypes.StandaloneFunction(match.nameMatch, 
                    match.returnValMatch, 
                    match.argsMatch));
            }
        );

        return standaloneFunctions;
    }
    
    static parseClasses(data:io.DeseralizationData):cpptypes.IClass[] {
        let classes: cpptypes.IClass[] = [];
        
        let generateNewClass = (rawMatch: RawMatch) => {
            let match = new ClassMatch(rawMatch);
            let newClass = match.isInterface? new cpptypes.ClassInterface(match.nameMatch, match.inheritanceMatch) : new cpptypes.ClassImpl(match.nameMatch, match.inheritanceMatch);
            let newData = new io.DeseralizationData(match.bodyMatch);
            newClass.deserialize(newData);
            return newClass;
        };

        Parser.findAllAndRemoveRegexMatches(
            ClassMatch.MULTI_REGEX_STR,
            data,
            (rawMatch) => {
                classes.push(generateNewClass(rawMatch));
            }
        );
        Parser.findAllAndRemoveRegexMatches(
            ClassMatch.SINGLE_REGEX_STR,
            data,
            (rawMatch) => {
                classes.push(generateNewClass(rawMatch));
            }
        );

        return classes;
    }
    
    private static findAllAndRemoveRegexMatches(regex:string, 
            data:io.DeseralizationData, 
            onMatch: (rawMatch:RawMatch) => void) {
            if (!data.remainingContent) {
                return;
            }

            const regexMatcher = new RegExp(regex, 'g');  
            const matchAndReplace = (fullMatch:string,  ...args: any[]) => {
                const rawMatch = new RawMatch(fullMatch, args.slice(0,-2)); //captures[]..., offset, fullString
                onMatch(rawMatch);
                return "";
            };

            data.remainingContent = data.remainingContent.replace(regexMatcher, matchAndReplace);

            // while ((rawMatch = regexMatcher.exec(contentCopy)) !== null) 
            // {
            //     if (rawMatch.index === regexMatcher.lastIndex) {
            //         regexMatcher.lastIndex++;
            //     }
            //     onMatch(rawMatch);
            //     data.remainingContent = data.remainingContent.replace(rawMatch[0], "");
            // }
        }
}