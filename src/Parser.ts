import * as cpptypes from "./cpptypes";
import { NoneNamespace } from "./cpptypes";
import * as io from "./io";
import { TextBlock } from "./io";

// TODO Error handling: do try catch in parser or move it to a higher level (prefered so we can catch errors in deserialze functions)?

function joinStringsWithFiller(strings:string[], filler:string):string {
    let joinedStrings = '';
    for (let index = 0; index < strings.length-1; index++) {
        joinedStrings += strings[index] + filler;
    }

    return joinedStrings + strings[strings.length-1];
}

function joinStringsWithWhiteSpace(strings:string[]):string {
    return joinStringsWithFiller(strings, "\\s*");
}
class NamespaceMatch {
    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== NamespaceMatch.NOF_GROUPMATCHES) {
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
    
    static readonly REGEX_STR: string = joinStringsWithWhiteSpace(
        [NamespaceMatch.namespaceSpecifierRegex, NamespaceMatch.namespaceNameRegex, NamespaceMatch.namespaceBodyRegex]);
    static readonly NOF_GROUPMATCHES = 2;

    readonly nameMatch:string;
    readonly bodyMatch:io.TextBlock|undefined;
}

class StandaloneFunctionMatch {
    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== StandaloneFunctionMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatch.groupMatches[0] === undefined) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }

        else if (regexMatch.groupMatches[1] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        this.returnValMatch = regexMatch.groupMatches[0];
        this.nameMatch = regexMatch.groupMatches[1];

        this.argsMatch = (regexMatch.groupMatches[2]) ? regexMatch.groupMatches[2] : "";
    }

    static readonly REGEX_STR:string = '((?:const )?\\S*)\\s*(\\S*)\\s*\\(([\\s\\S]*?)\\)\\s*;';
    static readonly NOF_GROUPMATCHES = 3;

    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
}

class ClassMatch {
    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== ClassMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatch.groupMatches[0] === undefined) {
            throw new Error("ParserError: No class name, this should not happen!");               
        }

        this.nameMatch = regexMatch.groupMatches[0];
        this.inheritanceMatch = (regexMatch.groupMatches[1]) ? regexMatch.groupMatches[1].split(",") : [];
        this.bodyMatch = regexMatch.getGroupMatchTextBlock(2);
        if (this.bodyMatch) {
            this.isInterface = ClassMatch.pureVirtualMemberRegexMatcher.test(this.bodyMatch.content);
        } else {
            this.isInterface = false;
        }
    }

    private static readonly classSpecifierRegex: string = "class\\s";
    private static readonly classNameRegex: string = "([\\S]+)";
    private static readonly inheritanceRegex: string = "(?::\\s*([\\S\\s]+))?";
    private static readonly noNestedClassRegex: string = "(?!"+ClassMatch.classSpecifierRegex+"\\s*[\\S]+\\s*{)";
    private static readonly classBodyRegex: string = "{((?:"+ClassMatch.noNestedClassRegex+"[\\s\\S])*?)}";
    private static readonly classEndRegex: string = ";";
    private static readonly pureVirtualMemberRegexMatcher =  /virtual[\s\S]*?=[\s]*0[\s]*;/g;
    
    static readonly REGEX_STR: string = joinStringsWithWhiteSpace(
        [ClassMatch.classSpecifierRegex, ClassMatch.classNameRegex, ClassMatch.inheritanceRegex,
         ClassMatch.classBodyRegex, ClassMatch.classEndRegex]);
    static readonly NOF_GROUPMATCHES = 3;

    readonly nameMatch:string;
    readonly inheritanceMatch: string[];
    readonly bodyMatch: TextBlock|undefined;
    readonly isInterface: boolean;
}
class ClassProtectedScopeMatch {

    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== ClassProtectedScopeMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = (regexMatch.groupMatches[0]) ? regexMatch.groupMatches[0] : "";
    }

    static readonly REGEX_STR:string = "protected:((?:(?!private:)(?!public:)[\\s\\S])*)";
    static readonly NOF_GROUPMATCHES = 1;

    readonly scopeContent:string;
}
class ClassPublicScopeMatch {

    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== ClassPublicScopeMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = regexMatch.getGroupMatchTextBlock(0);
    }

    static readonly REGEX_STR:string = "public:((?:(?!private:)(?!protected:)[\\s\\S])*)";
    static readonly NOF_GROUPMATCHES = 1;

    readonly scopeContent:io.TextBlock|undefined;
}

class MemberFunctionMatch {
    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== MemberFunctionMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatch.groupMatches[1] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        let virtualMatcher = new RegExp (MemberFunctionMatch.virtualSubMatchRegex);
        let match = virtualMatcher.exec(regexMatch.groupMatches[0]);
        if (!match || !match[2]) {
            throw new Error("ParserError: No function return type, this should not happen!");               
        }
        this.virtualMatch = (match[1]) ? true : false;
        this.returnValMatch = match[2];

        this.nameMatch = regexMatch.groupMatches[1];
        this.argsMatch = (regexMatch.groupMatches[2]) ? regexMatch.groupMatches[2] : "";
        this.constMatch = (regexMatch.groupMatches[3]) ? true : false;

        this.virtualMatch = (this.virtualMatch) || ((regexMatch.groupMatches[4]) ? true : false);
        this.pureMatch = (regexMatch.groupMatches[5]) ? true : false;
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
    private static readonly virtualSubMatchRegex:string = joinStringsWithWhiteSpace([MemberFunctionMatch.mayHaveVirtualRegex, MemberFunctionMatch.returnValRegex + '$']);
    static readonly REGEX_STR:string = joinStringsWithWhiteSpace([MemberFunctionMatch.returnValRegex+'\\s', MemberFunctionMatch.funcNameRegex,
         MemberFunctionMatch.funcArgsRegex, MemberFunctionMatch.mayHaveConstSpecifierRegex, MemberFunctionMatch.mayHaveOverrideRegex, MemberFunctionMatch.mayBePure, ';']);
    static readonly NOF_GROUPMATCHES = 6;

    readonly virtualMatch:boolean;
    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
    readonly constMatch:boolean;
    readonly pureMatch:boolean;
}



export abstract class Parser {

    static parseClassPrivateScope(data:io.TextFragment): io.TextFragment {
        let publicOrPrivateRegex= "(?:public:|protected:)((?!private:)[\\s\\S])*";
        const privateFragment = io.TextFragment.createEmpty();
        data.removeNotMatching(publicOrPrivateRegex).forEach(
            (regexMatch) => {
                privateFragment.push(new io.TextBlock(regexMatch.fullMatch, regexMatch.scopeStart));
            });
        return privateFragment;
    }

    static parseClassPublicScope(data:io.TextFragment): io.TextFragment {
        const publicFragment = io.TextFragment.createEmpty();
        data.removeMatching(ClassPublicScopeMatch.REGEX_STR).forEach(
            (regexMatch) => {
                let match = new ClassPublicScopeMatch(regexMatch);
                if (match.scopeContent) {
                    publicFragment.push(match.scopeContent);
                }
            });

        return publicFragment;
    }

    static parseClassProtectedScope(data:io.TextFragment): io.TextFragment {
        const protectedFragment = io.TextFragment.createEmpty();
        data.removeMatching(ClassProtectedScopeMatch.REGEX_STR).forEach(
            (regexMatch) => {
                let match = new ClassPublicScopeMatch(regexMatch);
                if (match.scopeContent) {
                    protectedFragment.push(match.scopeContent);
                }
            });

        return protectedFragment;
    }

    static parseClassMemberFunctions(data: io.TextFragment, classNameGen:io.ClassNameGenerator): cpptypes.IFunction[] {
        let memberFunctions:cpptypes.IFunction[] = [];
        data.removeMatching(MemberFunctionMatch.REGEX_STR).forEach(            
            (regexMatch) => {
                let match = new MemberFunctionMatch(regexMatch);        

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
            });

        return memberFunctions;
    }

    static parseNamespaces(data:io.TextFragment): cpptypes.INamespace[]  {
        let namespaces:cpptypes.INamespace[] = [];

        let matchesFound = true;
        while (matchesFound) {
            let newNamespaces: cpptypes.INamespace[] = [];
            matchesFound = false;
            data.removeMatching(NamespaceMatch.REGEX_STR).forEach(
                (regexMatch) => {           
                    const match = new NamespaceMatch(regexMatch);
                    const newNamespace = new cpptypes.Namespace(match.nameMatch, regexMatch);
                    const newData = io.TextFragment.createFromTextBlock(match.bodyMatch);

                    newNamespace.deserialize(newData);
                    newNamespaces.push(newNamespace); 
                    matchesFound = true;
                }
            );
            
            if (matchesFound) {
                newNamespaces.forEach(
                    (newNamespace) => {
                        for (let index = namespaces.length-1; index >= 0 ; index--) {
                            const possibleNestedNamespace = namespaces[index];
                            if (newNamespace.tryAddNestedNamespace(possibleNestedNamespace)) {
                                namespaces.splice(index,1);
                            }
                        }
                        namespaces.push(newNamespace);
                    }
                );
            }
        }

        return namespaces;
    }    
    
    static parseNoneNamespaces(data:io.TextFragment): cpptypes.INamespace[]  { 
        const noneNamespaces:cpptypes.INamespace[] = [];

        data.blocks.forEach(block => {
            const newnNoneNamespace = new cpptypes.NoneNamespace(block);
            const newData = io.TextFragment.createEmpty();
            newData.push(block);
            newnNoneNamespace.deserialize(newData);
            noneNamespaces.push(newnNoneNamespace);

        });

        data.reset();

        return noneNamespaces;
    }

    static parseStandaloneFunctiones(data:io.TextFragment): cpptypes.IFunction[] {
        let standaloneFunctions:cpptypes.IFunction[] = [];

        data.removeMatching(StandaloneFunctionMatch.REGEX_STR).forEach(
            (regexMatch) => {
                let match = new StandaloneFunctionMatch(regexMatch);
                standaloneFunctions.push(new cpptypes.StandaloneFunction(match.nameMatch, 
                    match.returnValMatch, 
                    match.argsMatch));
            }
        );

        return standaloneFunctions;
    }
    
    static parseClasses(data:io.TextFragment):cpptypes.IClass[] {
        let classes: cpptypes.IClass[] = [];

        let matchesFound = true;
        while (matchesFound) {
            let newClasses: cpptypes.IClass[] = [];
            matchesFound = false;
            data.removeMatching(ClassMatch.REGEX_STR).forEach(
                (regexMatch) => {           
                    const match = new ClassMatch(regexMatch);
                    const newClass = match.isInterface? new cpptypes.ClassInterface(regexMatch, match.nameMatch, match.inheritanceMatch) : new cpptypes.ClassBase(regexMatch, match.nameMatch, match.inheritanceMatch);
                    const newData = io.TextFragment.createFromTextBlock(match.bodyMatch);
                    
                    newClass.deserialize(newData);
                    newClasses.push(newClass); 
                    matchesFound = true;
                }
            );
            
            if (matchesFound) {
                newClasses.forEach(
                    (newClass) => {
                        for (let index = classes.length-1; index >= 0 ; index--) {
                            const possibleNestedClass = classes[index];
                            if (newClass.tryAddNestedClass(possibleNestedClass)) {
                                classes.splice(index,1);
                            }
                        }
                        classes.push(newClass);
                    }
                );
            }
        }

        return classes;
    }
}