import * as cpp from "../cpp";
import * as io from ".";
import { INameInputProvider } from "../INameInputProvider";
import { NamespaceMatch, joinStringsWithWhiteSpace, CommonParser } from "./CommonParser";
import { TextScope } from "./Text";

class StandaloneFunctionMatch {
    constructor(regexMatch:io.TextMatch) {

        this.returnValMatch = regexMatch.getGroupMatch(0);
        this.nameMatch = regexMatch.getGroupMatch(1);

        this.argsMatch = regexMatch.getGroupMatch(2);
    }

    static readonly regexStr:string = '((?:const )?\\S*)\\s*(\\S*)\\s*\\(([\\s\\S]*?)\\)\\s*;';

    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
}

class ClassMatch {
    constructor(regexMatch:io.TextMatch) {
        this.nameMatch = regexMatch.getGroupMatch(0);
        if (regexMatch.getGroupMatch(1).length) {
            this.inheritanceMatch = regexMatch.getGroupMatch(1).split(",");
        } else {
            this.inheritanceMatch = [];
        }
        this.bodyMatch = regexMatch.getGroupMatchFragment(2);
        const pureVirtualMemberRegexMatcher = new io.RegexMatcher(ClassMatch.pureVirtualMemberRegex);
        this.isInterface = pureVirtualMemberRegexMatcher.match(this.bodyMatch).length > 0;
    }

    private static readonly classSpecifierRegex: string = "class\\s";
    private static readonly classNameRegex: string = "([\\S]+)";
    private static readonly inheritanceRegex: string = "(?::\\s*((?:(?!{)[\\S\\s])+))?";
    private static readonly pureVirtualMemberRegex =  "virtual(?:(?!virtual)[\\s\\S])*?=[\\s]*0[\\s]*;";
    
    static readonly regexStr: string = joinStringsWithWhiteSpace(
        ClassMatch.classSpecifierRegex, ClassMatch.classNameRegex, ClassMatch.inheritanceRegex);

    readonly nameMatch:string;
    readonly inheritanceMatch: string[];
    readonly bodyMatch: io.TextFragment;
    readonly isInterface: boolean;
}
class ClassProtectedScopeMatch {

    constructor(regexMatch:io.TextMatch) {
        this.scopeContent = regexMatch.getGroupMatch(0);
    }

    static readonly regexStr:string = "protected:((?:(?!private:)(?!public:)[\\s\\S])*)";

    readonly scopeContent:string;
}
class ClassPublicScopeMatch {

    constructor(regexMatch:io.TextMatch) {
        this.scopeContent = regexMatch.getGroupMatchFragment(0);
    }

    static readonly regexStr:string = "public:((?:(?!private:)(?!protected:)[\\s\\S])*)";

    readonly scopeContent:io.TextFragment;
}

class ClassConstructorMatch {

    constructor(regexMatch:io.TextMatch) {
        this.argsMatch = regexMatch.getGroupMatch(0);
    }

    static getRegexStr(classname: string) {
        return joinStringsWithWhiteSpace("[^~]"+classname, this.argRegex, ";");        
    }

    private static readonly argRegex:string = "\\(([\\s\\S]*?)\\)";


    readonly argsMatch:string;
}

class ClassDestructorMatch {

    constructor(regexMatch:io.TextMatch) {
        this.isVirtual = (regexMatch.getGroupMatch(0).length > 0) || (regexMatch.getGroupMatch(1).length > 0); 
    }

    static getRegexStr(classname: string) {
        return joinStringsWithWhiteSpace(this.mayHaveVirtualRegex, "~" + classname, "\\([\\s]*\\)", this.mayHaveOverrideRegex, ";");        
    }
    private static readonly mayHaveVirtualRegex:string = '(virtual)?';
    private static readonly mayHaveOverrideRegex:string = '(override)?';
    readonly isVirtual:boolean;
}

class MemberFunctionMatch {
    constructor(regexMatch:io.TextMatch) {

        this.virtualMatch = (regexMatch.getGroupMatch(0) === "virtual");
        this.staticMatch = (regexMatch.getGroupMatch(0) === "static");
        this.returnValMatch = regexMatch.getGroupMatch(1) ;

        this.nameMatch = regexMatch.getGroupMatch(2);
        this.argsMatch = regexMatch.getGroupMatch(3);
        this.constMatch = regexMatch.getGroupMatch(4).length > 0;

        this.virtualMatch = (this.virtualMatch) || (regexMatch.getGroupMatch(5).length > 0);
        this.pureMatch = regexMatch.getGroupMatch(6).length > 0;
        if (!this.virtualMatch && this.pureMatch) {
           throw new Error("ParserError: Invalid specifier combination: '=0' missing virtual for function: " + this.nameMatch);
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

    readonly virtualMatch:boolean;
    readonly staticMatch:boolean;
    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
    readonly constMatch:boolean;
    readonly pureMatch:boolean;
}

export abstract class HeaderParser extends CommonParser {

    static parseClassPrivateScope(data:io.TextFragment): io.TextFragment {
        let publicOrPrivateRegex= "(?:public:|protected:)((?!private:)[\\s\\S])*";
        const privateFragment = io.TextFragment.createEmpty();
        const matcher = new io.RemovingRegexMatcher(publicOrPrivateRegex);
        matcher.matchInverse(data).forEach(
            (regexMatch) => {
                privateFragment.push(new io.TextBlock(regexMatch.fullMatch, regexMatch.scopeStart));
            });
        return privateFragment;
    }

    static parseClassPublicScope(data:io.TextFragment): io.TextFragment {
        const publicFragment = io.TextFragment.createEmpty();
        const matcher = new io.RemovingRegexMatcher(ClassPublicScopeMatch.regexStr);
        matcher.match(data).forEach(
            (regexMatch) => {
                let match = new ClassPublicScopeMatch(regexMatch);
                publicFragment.push(...match.scopeContent.blocks);
            });

        return publicFragment;
    }

    static parseClassProtectedScope(data:io.TextFragment): io.TextFragment {
        const protectedFragment = io.TextFragment.createEmpty();
        const matcher = new io.RemovingRegexMatcher(ClassProtectedScopeMatch.regexStr);
         matcher.match(data).forEach(
            (regexMatch) => {
                let match = new ClassPublicScopeMatch(regexMatch);
                protectedFragment.push(...match.scopeContent.blocks);
            });

        return protectedFragment;
    }
    
    static parseClassConstructor(data: io.TextFragment, className: string, classNameGen: cpp.ClassNameGenerator): cpp.ClassConstructor[] {
        let ctors: cpp.ClassConstructor[] = [];
        const matcher = new io.RemovingRegexMatcher(ClassConstructorMatch.getRegexStr(className));
         matcher.match(data).forEach(
            (regexMatch) => {
                let match = new ClassConstructorMatch(regexMatch);
                ctors.push(new cpp.ClassConstructor(match.argsMatch, classNameGen, regexMatch as io.TextScope));
            });
        return ctors;
    }
    
    static parseClassDestructors(data: io.TextFragment, className: string, classNameGen: cpp.ClassNameGenerator): cpp.ClassDestructor[] {
        let deconstructors: cpp.ClassDestructor[] = [];
        const matcher = new io.RemovingRegexMatcher(ClassDestructorMatch.getRegexStr(className));
         matcher.match(data).forEach(
            (regexMatch) => {
                let match = new ClassDestructorMatch(regexMatch);
                deconstructors.push(new cpp.ClassDestructor(match.isVirtual, classNameGen, regexMatch as io.TextScope));
            });
        return deconstructors;
    }

    static parseClassMemberFunctions(data: io.TextFragment, classNameGen:cpp.ClassNameGenerator): cpp.IFunction[] {
        let memberFunctions:cpp.IFunction[] = [];
        const matcher = new io.RemovingRegexMatcher(MemberFunctionMatch.regexStr);
        matcher.match(data).forEach(            
            (regexMatch) => {
                let match = new MemberFunctionMatch(regexMatch);        

                let newFunc:cpp.IFunction;
                if (match.virtualMatch) {
                    if (match.pureMatch) {
                        newFunc = new cpp.PureVirtualMemberFunction(match.nameMatch, match.returnValMatch,
                             match.argsMatch, match.constMatch, classNameGen, regexMatch as io.TextScope);
                    }
                    else {
                        newFunc = new cpp.VirtualMemberFunction(match.nameMatch, match.returnValMatch,
                             match.argsMatch, match.constMatch, classNameGen, regexMatch as io.TextScope);
                    }
                }
                else if (match.staticMatch) {
                    newFunc = new cpp.StaticMemberFunction(match.nameMatch, match.returnValMatch,
                        match.argsMatch, match.constMatch, classNameGen, regexMatch as io.TextScope);
                }
                else {
                    newFunc = new cpp.MemberFunction(match.nameMatch, match.returnValMatch,
                        match.argsMatch, match.constMatch, classNameGen, regexMatch as io.TextScope);
                }

                memberFunctions.push(newFunc);
            });

        return memberFunctions;
    }

    static parseNamespaces(data:io.TextFragment, nameInputProvider?: INameInputProvider): cpp.INamespace[]  {
        let namespaces:cpp.INamespace[] = [];
        const matcher = new io.RemovingRegexWithBodyMatcher(NamespaceMatch.regexStr);            
        matcher.match(data).forEach(
            (regexMatch) => {           
                const match = new NamespaceMatch(regexMatch);
                const newNamespace = new cpp.Namespace(match.nameMatch, regexMatch, nameInputProvider);
                newNamespace.deserialize(match.bodyMatch);
                namespaces.push(newNamespace); 
            }
        );

        return namespaces;
    }    
    

    static parseNoneNamespaces(data:io.TextFragment, nameInputProvider?: INameInputProvider): cpp.INamespace[]  { 
        const newNoneNamespace = new cpp.NoneNamespace(new TextScope(data.getScopeStart(), data.getScopeEnd()), nameInputProvider);
        newNoneNamespace.deserialize(data);
        return [newNoneNamespace];
    }

    static parseStandaloneFunctiones(data:io.TextFragment): cpp.IFunction[] {
        let standaloneFunctions:cpp.IFunction[] = [];

        const matcher = new io.RemovingRegexMatcher(StandaloneFunctionMatch.regexStr);
         matcher.match(data).forEach(
            (regexMatch) => {
                let match = new StandaloneFunctionMatch(regexMatch);
                standaloneFunctions.push(new cpp.StandaloneFunction(match.nameMatch, 
                    match.returnValMatch, 
                    match.argsMatch,
                    regexMatch as io.TextScope));
            }
        );

        return standaloneFunctions;
    }
    
    static parseClasses(data:io.TextFragment, nameInputProvider?: INameInputProvider):cpp.IClass[] {
        let classes: cpp.IClass[] = [];
        const matcher = new io.RemovingRegexWithBodyMatcher(ClassMatch.regexStr);            
        matcher.match(data).forEach(
            (regexMatch) => {           
                const match = new ClassMatch(regexMatch);
                const newClass = match.isInterface ?
                    new cpp.ClassInterface(regexMatch, match.nameMatch, match.inheritanceMatch, nameInputProvider) :
                    new cpp.ClassImpl(regexMatch, match.nameMatch, match.inheritanceMatch, nameInputProvider);
                newClass.deserialize(match.bodyMatch);
                classes.push(newClass); 
            }
        );

        return classes;
    }
    
}