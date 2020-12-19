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
class NamespaceMatch {
    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== NamespaceMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatchArr[1] === undefined) {
            throw new Error("ParserError: No namespace name, this should not happen!");               
        }

        this.nameMatch = regexMatchArr[1];

        this.contentMatch = (regexMatchArr[2]) ? regexMatchArr[2] : "";
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
    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== StandaloneFunctionMatch.NOF_GROUPMATCHES) {
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
        if (regexMatchArr.length-1 !== ClassMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatchArr[1] === undefined) {
            throw new Error("ParserError: No class name, this should not happen!");               
        }

        this.nameMatch = regexMatchArr[1];
        this.inheritanceMatch = (regexMatchArr[2]) ? regexMatchArr[2].split(",") : [];
        this.bodyMatch = (regexMatchArr[3]) ? regexMatchArr[3] : "";
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

    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== ClassProtectedScopeMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = (regexMatchArr[1]) ? regexMatchArr[1] : "";
    }

    static readonly REGEX_STR:string = "protected:((?:(?!private:)(?!public:)[\\s\\S])*)";
    static readonly NOF_GROUPMATCHES = 1;

    readonly scopeContent:string;
}
class ClassPublicScopeMatch {

    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== ClassPublicScopeMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = (regexMatchArr[1]) ? regexMatchArr[1] : "";
    }

    static readonly REGEX_STR:string = "public:((?:(?!private:)(?!protected:)[\\s\\S])*)";
    static readonly NOF_GROUPMATCHES = 1;

    readonly scopeContent:string;
}

class MemberFunctionMatch {
    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== MemberFunctionMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatchArr[2] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        let virtualMatcher = new RegExp (MemberFunctionMatch.virtualSubMatchRegex);
        let match = virtualMatcher.exec(regexMatchArr[1]);
        if (!match || !match[2]) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }
        this.virtualMatch = (match[1]) ? true : false;
        this.returnValMatch = match[2];

        this.nameMatch = regexMatchArr[2];
        this.argsMatch = (regexMatchArr[3]) ? regexMatchArr[3] : "";
        this.constMatch = (regexMatchArr[4]) ? true : false;

        this.virtualMatch = (this.virtualMatch) || ((regexMatchArr[5]) ? true : false);
        this.pureMatch = (regexMatchArr[6]) ? true : false;
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

    static parseClassPrivateScope(content:string ): string {
        let publicOrPrivateRegexMatcher:RegExp = /(?:public:|protected:)((?!private:)[\s\S])*/g;
        let privateScope = content.replace(publicOrPrivateRegexMatcher, "");
        return privateScope;
    }

    static parseClassPublicScope(content:string ): string {
        let publicScope = "";
        Parser.findAllRegexMatches(ClassPublicScopeMatch.REGEX_STR, content,
            (rawMatch) => {
                let match = new ClassPublicScopeMatch(rawMatch);
                publicScope += match.scopeContent;
            }
            );


        return publicScope;
    }

    static parseClassProtectedScope(content:string ): string {
        let protectedScope = "";
        Parser.findAllRegexMatches(ClassProtectedScopeMatch.REGEX_STR, content,
            (rawMatch) => {
                let match = new ClassProtectedScopeMatch(rawMatch);
                protectedScope += match.scopeContent;
            }
            );


        return protectedScope;
    }

    static parseClassMemberFunctions(content: string, classNameGen:io.ClassNameGenerator): cpptypes.IFunction[] {
        let memberFunctions:cpptypes.IFunction[] = [];
        Parser.findAllRegexMatches(MemberFunctionMatch.REGEX_STR, content,
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

    static parseNamespaces(content:string): cpptypes.INamespace[]  {
        let namespaces:cpptypes.INamespace[] = [];
        let contentWithSingleNamespace = content;

        let generateNewNamespace = (rawMatch: RegExpExecArray) => {
            let match = new NamespaceMatch(rawMatch);
            let newNamespace = new cpptypes.Namespace(match.nameMatch);
            newNamespace.deserialize(match.contentMatch);
            return newNamespace;
        };

        Parser.findAllRegexMatches(
            NamespaceMatch.MULTI_REGEX_STR,
            content,
            (rawMatch) => {
                namespaces.push(generateNewNamespace(rawMatch))
                contentWithSingleNamespace = contentWithSingleNamespace.replace(rawMatch[0], "");
            }
        );
        Parser.findAllRegexMatches(
            NamespaceMatch.SINGLE_REGEX_STR,
            contentWithSingleNamespace,
            (rawMatch) => {
                namespaces.push(generateNewNamespace(rawMatch))
            }
        );

        // if (!namespaces.length) {
        //     let newNamespace = new cpptypes.NoneNamespace();
        //     newNamespace.deserialize(content);
        //     namespaces.push(newNamespace);
        // }

        return namespaces;
    }

    static parseStandaloneFunctiones(content:string): cpptypes.IFunction[] {
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
    
    static parseClasses(content:string):cpptypes.IClass[] {
        let classes: cpptypes.IClass[] = [];
        let contentWithSingleClass: string = content;
        
        let generateNewClass = (rawMatch: RegExpExecArray) => {
            let match = new ClassMatch(rawMatch);
            let newClass = match.isInterface? new cpptypes.ClassInterface(match.nameMatch, match.inheritanceMatch) : new cpptypes.ClassImpl(match.nameMatch, match.inheritanceMatch);
            newClass.deserialize(match.bodyMatch);
            return newClass;
        };

        Parser.findAllRegexMatches(
            ClassMatch.MULTI_REGEX_STR,
            content,
            (rawMatch) => {
                classes.push(generateNewClass(rawMatch))
                contentWithSingleClass = contentWithSingleClass.replace(rawMatch[0], "");
            }
        );
        Parser.findAllRegexMatches(
            ClassMatch.SINGLE_REGEX_STR,
            contentWithSingleClass,
            (rawMatch) => {
                classes.push(generateNewClass(rawMatch))
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

        const regexMatcher = new RegExp(regex, 'g');
        return Parser.findRegexMatches(regexMatcher, content, onMatch);
    }

    private static findRegexMatches(regexMatcher:RegExp, 
            content:string, 
            onMatch: (rawMatch:RegExpExecArray) => void) {
        if (!content) {
            return;
        }
        let rawMatch;
        while ((rawMatch = regexMatcher.exec(content)) !== null) {
            if (rawMatch.index === regexMatcher.lastIndex) {
                regexMatcher.lastIndex++;
            }
            onMatch(rawMatch);
        }
    }
}