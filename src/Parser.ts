import * as cpp from "./cpp";
import { ClassDestructor, PureVirtualMemberFunction } from "./cpp";
import * as io from "./io";
import { TextBlock } from "./io";

function joinStringsWithFiller(strings:string[], filler:string):string {
    let joinedStrings = '';
    for (let index = 0; index < strings.length-1; index++) {
        joinedStrings += strings[index] + filler;
    }

    return joinedStrings + strings[strings.length-1];
}

function joinStringsWithWhiteSpace(...strings:string[]):string {
    return joinStringsWithFiller(strings, "\\s*");
}
class NamespaceMatch {
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

class StandaloneFunctionMatch {
    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== StandaloneFunctionMatch.nofGroupMatches) {
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

    static readonly regexStr:string = '((?:const )?\\S*)\\s*(\\S*)\\s*\\(([\\s\\S]*?)\\)\\s*;';
    static readonly nofGroupMatches = 3;

    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
}

class ClassMatch {
    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== ClassMatch.nofGroupMatches) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatch.groupMatches[0] === undefined) {
            throw new Error("ParserError: No class name, this should not happen!");               
        }

        this.nameMatch = regexMatch.groupMatches[0];
        this.inheritanceMatch = (regexMatch.groupMatches[1]) ? regexMatch.groupMatches[1].split(",") : [];
        this.bodyMatch = regexMatch.getGroupMatchTextBlock(2);
        if (this.bodyMatch) {
            const pureVirtualMemberRegexMatcher = RegExp(ClassMatch.pureVirtualMemberRegex, "g");
            this.isInterface = pureVirtualMemberRegexMatcher.test(this.bodyMatch.content);
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
    private static readonly pureVirtualMemberRegex =  "virtual(?:(?!virtual)[\\s\\S])*?=[\\s]*0[\\s]*;";
    
    static readonly regexStr: string = joinStringsWithWhiteSpace(
        ClassMatch.classSpecifierRegex, ClassMatch.classNameRegex, ClassMatch.inheritanceRegex,
         ClassMatch.classBodyRegex, ClassMatch.classEndRegex);
    static readonly nofGroupMatches = 3;

    readonly nameMatch:string;
    readonly inheritanceMatch: string[];
    readonly bodyMatch: TextBlock|undefined;
    readonly isInterface: boolean;
}
class ClassProtectedScopeMatch {

    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== ClassProtectedScopeMatch.nofGroupMatches) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = (regexMatch.groupMatches[0]) ? regexMatch.groupMatches[0] : "";
    }

    static readonly regexStr:string = "protected:((?:(?!private:)(?!public:)[\\s\\S])*)";
    static readonly nofGroupMatches = 1;

    readonly scopeContent:string;
}
class ClassPublicScopeMatch {

    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== ClassPublicScopeMatch.nofGroupMatches) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.scopeContent = regexMatch.getGroupMatchTextBlock(0);
    }

    static readonly regexStr:string = "public:((?:(?!private:)(?!protected:)[\\s\\S])*)";
    static readonly nofGroupMatches = 1;

    readonly scopeContent:io.TextBlock|undefined;
}

class ClassConstructorMatch {

    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== ClassPublicScopeMatch.nofGroupMatches) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.argsMatch = (regexMatch.groupMatches[0]) ? regexMatch.groupMatches[0] : "";
    }

    static getRegexStr(classname: string) {
        return joinStringsWithWhiteSpace("[^~]"+classname, this.argRegex, ";");        
    }

    static readonly nofGroupMatches = 1;
    private static readonly argRegex:string = "\\(([\\s\\S]*?)\\)";


    readonly argsMatch:string;
}

class ClassDestructorMatch {

    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== ClassPublicScopeMatch.nofGroupMatches) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }

        this.isVirtual = regexMatch.groupMatches[0]?.length > 0; 
    }

    static getRegexStr(classname: string) {
        return joinStringsWithWhiteSpace(this.mayHaveVirtualRegex, "~" + classname, "\\([\\s\\S]*\\)", ";");        
    }
    private static readonly mayHaveVirtualRegex:string = '(virtual)?';

    static readonly nofGroupMatches = 1;

    readonly isVirtual:boolean;
}

class CommentMatch {
    static readonly regexStr:string = "(\\/\\**[\\s\\S]*\\*\\/)|(\\/\\/.*)";
}

class MemberFunctionMatch {
    constructor(regexMatch:io.TextRegexMatch) {
        if (regexMatch.groupMatches.length !== MemberFunctionMatch.nofGroupMatches) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatch.groupMatches[2] === undefined) {
            throw new Error("ParserError: No function name, this should not happen!");               
        }

        this.virtualMatch = (regexMatch.groupMatches[0]) ? (regexMatch.groupMatches[0] === "virtual") : false;
        this.staticMatch = (regexMatch.groupMatches[0]) ? (regexMatch.groupMatches[0] === "static") : false;
        this.returnValMatch = regexMatch.groupMatches[1] ;

        this.nameMatch = regexMatch.groupMatches[2];
        this.argsMatch = (regexMatch.groupMatches[3]) ? regexMatch.groupMatches[3] : "";
        this.constMatch = (regexMatch.groupMatches[4]) ? true : false;

        this.virtualMatch = (this.virtualMatch) || ((regexMatch.groupMatches[5]) ? true : false);
        this.pureMatch = (regexMatch.groupMatches[6]) ? true : false;
        if (!this.virtualMatch && this.pureMatch) {
           throw new Error("ParserError: Invalid specifier combination: '=0' missing virtual for function: " + this.nameMatch);
           return;
        }

    }

    private static readonly mayHaveVirtualOrStaticRegex:string = '(?:(virtual|static)\\s*)?';
    private static readonly returnValRegex:string = '(\\b(?:(?!static).)+?)';
    private static readonly funcNameRegex:string = '(\\S+)';
    private static readonly funcArgsRegex:string = '\\(((?:(?!\\()[\\s\\S])*?)\\)';
    private static readonly mayHaveConstSpecifierRegex:string = '(const)?';
    private static readonly mayHaveOverrideRegex:string = '(override)?';
    private static readonly mayBePure:string = '(=\\s*0)?';
    static readonly regexStr:string = joinStringsWithWhiteSpace(MemberFunctionMatch.mayHaveVirtualOrStaticRegex + MemberFunctionMatch.returnValRegex+'\\s', MemberFunctionMatch.funcNameRegex,
         MemberFunctionMatch.funcArgsRegex, MemberFunctionMatch.mayHaveConstSpecifierRegex, MemberFunctionMatch.mayHaveOverrideRegex, MemberFunctionMatch.mayBePure, ';');
    static readonly nofGroupMatches = 7;

    readonly virtualMatch:boolean;
    readonly staticMatch:boolean;
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
        data.removeMatching(ClassPublicScopeMatch.regexStr).forEach(
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
        data.removeMatching(ClassProtectedScopeMatch.regexStr).forEach(
            (regexMatch) => {
                let match = new ClassPublicScopeMatch(regexMatch);
                if (match.scopeContent) {
                    protectedFragment.push(match.scopeContent);
                }
            });

        return protectedFragment;
    }
    
    static parseClassConstructor(data: io.TextFragment, className: string, classNameGen: cpp.ClassNameGenerator): cpp.ClassConstructor[] {
        let ctors: cpp.ClassConstructor[] = [];
        data.removeMatching(ClassConstructorMatch.getRegexStr(className)).forEach(
            (regexMatch) => {
                let match = new ClassConstructorMatch(regexMatch);
                ctors.push(new cpp.ClassConstructor(match.argsMatch, classNameGen));
            });
        return ctors;
    }
    
    static parseClassDestructors(data: io.TextFragment, className: string, classNameGen: cpp.ClassNameGenerator): cpp.ClassDestructor[] {
        let deconstructors: cpp.ClassDestructor[] = [];
        data.removeMatching(ClassDestructorMatch.getRegexStr(className)).forEach(
            (regexMatch) => {
                let match = new ClassDestructorMatch(regexMatch);
                deconstructors.push(new cpp.ClassDestructor(match.isVirtual, classNameGen));
            });
        return deconstructors;
    }

    static parseClassMemberFunctions(data: io.TextFragment, classNameGen:cpp.ClassNameGenerator): cpp.IFunction[] {
        let memberFunctions:cpp.IFunction[] = [];
        data.removeMatching(MemberFunctionMatch.regexStr).forEach(            
            (regexMatch) => {
                let match = new MemberFunctionMatch(regexMatch);        

                let newFunc:cpp.IFunction;
                if (match.virtualMatch) {
                    if (match.pureMatch) {
                        newFunc = new cpp.PureVirtualMemberFunction(match.nameMatch, match.returnValMatch,
                             match.argsMatch, match.constMatch, classNameGen);
                    }
                    else {
                        newFunc = new cpp.VirtualMemberFunction(match.nameMatch, match.returnValMatch,
                             match.argsMatch, match.constMatch, classNameGen);
                    }
                }
                else if (match.staticMatch) {
                    newFunc = new cpp.StaticMemberFunction(match.nameMatch, match.returnValMatch,
                        match.argsMatch, match.constMatch, classNameGen);
                }
                else {
                    newFunc = new cpp.MemberFunction(match.nameMatch, match.returnValMatch,
                        match.argsMatch, match.constMatch, classNameGen);
                }

                memberFunctions.push(newFunc);
            });

        return memberFunctions;
    }

    static parseNamespaces(data:io.TextFragment, nameInputProvider?: io.INameInputProvider): cpp.INamespace[]  {
        let namespaces:cpp.INamespace[] = [];

        let matchesFound = true;
        while (matchesFound) {
            let newNamespaces: cpp.INamespace[] = [];
            matchesFound = false;
            data.removeMatching(NamespaceMatch.regexStr).forEach(
                (regexMatch) => {           
                    const match = new NamespaceMatch(regexMatch);
                    const newNamespace = new cpp.Namespace(match.nameMatch, regexMatch, nameInputProvider);
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
    
    static parseNoneNamespaces(data:io.TextFragment, nameInputProvider?: io.INameInputProvider): cpp.INamespace[]  { 
        const noneNamespaces:cpp.INamespace[] = [];

        data.blocks.forEach(block => {
            const newNoneNamespace = new cpp.NoneNamespace(block, nameInputProvider);
            const newData = io.TextFragment.createEmpty();
            newData.push(block);
            newNoneNamespace.deserialize(newData);
            noneNamespaces.push(newNoneNamespace);

        });

        data.reset();

        return noneNamespaces;
    }

    static parseStandaloneFunctiones(data:io.TextFragment): cpp.IFunction[] {
        let standaloneFunctions:cpp.IFunction[] = [];

        data.removeMatching(StandaloneFunctionMatch.regexStr).forEach(
            (regexMatch) => {
                let match = new StandaloneFunctionMatch(regexMatch);
                standaloneFunctions.push(new cpp.StandaloneFunction(match.nameMatch, 
                    match.returnValMatch, 
                    match.argsMatch));
            }
        );

        return standaloneFunctions;
    }
    
    static parseClasses(data:io.TextFragment, nameInputProvider?: io.INameInputProvider):cpp.IClass[] {
        let classes: cpp.IClass[] = [];

        let matchesFound = true;
        while (matchesFound) {
            let newClasses: cpp.IClass[] = [];
            matchesFound = false;
            data.removeMatching(ClassMatch.regexStr).forEach(
                (regexMatch) => {           
                    const match = new ClassMatch(regexMatch);
                    const newClass = match.
                    isInterface ?
                        new cpp.ClassInterface(regexMatch, match.nameMatch, match.inheritanceMatch, nameInputProvider) :
                        new cpp.ClassImpl(regexMatch, match.nameMatch, match.inheritanceMatch, nameInputProvider);
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
    
    static parseComments(data:io.TextFragment): void {
        data.removeMatching(CommentMatch.regexStr);
    }
}