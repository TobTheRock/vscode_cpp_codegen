import { TextScope, TextFragment } from "./Text";
import { RemovingRegexMatcher, RemovingRegexWithBodyMatcher, TextMatch } from "./Matcher";
import { ISignaturable } from "./ISignaturable";
import { NamespaceMatch, CommonParser, joinStringsWithWhiteSpace } from "./CommonParser";
class FunctionDefinitionMatch {
    constructor(regexMatch:TextMatch) {
        this.returnValMatch = regexMatch.getGroupMatch(0);
        this.nameMatch = regexMatch.getGroupMatch(1);
        this.argsMatch = regexMatch.getGroupMatch(2);
        this.constMatch = regexMatch.getGroupMatch(3);
    }

    private static readonly returnValRegex:string = '(\\b.+?)\\s';
    private static readonly funcNameRegex:string = '(\\S+)';
    private static readonly funcArgsRegex:string = '\\(((?:(?!\\()[\\s\\S])*?)\\)';
    private static readonly mayHaveConstSpecifierRegex:string = '(const)?';
    static readonly regexStr:string = joinStringsWithWhiteSpace(FunctionDefinitionMatch.returnValRegex, FunctionDefinitionMatch.funcNameRegex,
         FunctionDefinitionMatch.funcArgsRegex, FunctionDefinitionMatch.mayHaveConstSpecifierRegex);

    readonly returnValMatch:string;
    readonly nameMatch:string;
    readonly argsMatch:string;
    readonly constMatch:string;
}

class ClassConstructorSignatureMatch {

    constructor(regexMatch:TextMatch) {
        this.classNameMatch = regexMatch.getGroupMatch(0);
        this.argsMatch = regexMatch.getGroupMatch(1);
    }

    private static readonly classNameRegex:string = '(\\S+)::\\1';
    private static readonly ctorArgsRegex:string = '\\(([\\s\\S]*?)\\)';
    private static readonly mayHaveInitializerListRegex:string = '(?::(?:(?!\\{)[\\s\\S])*)?';
    
    static readonly regexStr:string = joinStringsWithWhiteSpace(ClassConstructorSignatureMatch.classNameRegex,
         ClassConstructorSignatureMatch.ctorArgsRegex, ClassConstructorSignatureMatch.mayHaveInitializerListRegex);


    readonly classNameMatch:string;
    readonly argsMatch:string;
}

class ClassDestructorSignatureMatch {

    constructor(regexMatch:TextMatch) {
        this.classNameMatch = regexMatch.getGroupMatch(0);
    }

    static readonly nofGroupMatches = 1;
    private static readonly classNameRegex:string = '(\\S+)::~\\1\\s*\\(\\s*\\)';
    static readonly regexStr:string = joinStringsWithWhiteSpace(ClassDestructorSignatureMatch.classNameRegex);

    readonly classNameMatch:string;

}


class SourceFileNamespace extends TextScope {
    constructor(public name:string, scope: TextScope) {
        super(scope.scopeStart, scope.scopeEnd);
    };

    deserialize(data:TextFragment): void {
        this._subnamespaces.push(...SourceParser.parseNamespaces(data));
        this._signatures.push(... SourceParser.parseSignaturesWithinNamespace(data));
    }

    getSignatures(): ISignaturable[] {
        const signatures =  ([] as ISignaturable[]).concat(...this._subnamespaces.map(ns => ns.getSignatures()));    
        signatures.push(...this._signatures);
        signatures.forEach(signature => signature.namespaces.unshift(this.name));
        return signatures;
    }

    private  _subnamespaces: SourceFileNamespace[] = [];
    private _signatures:ISignaturable[] = [];
}
export abstract class SourceParser extends CommonParser {
    static parseSignatures(data:TextFragment): ISignaturable[] {
        const namespaces = this.parseNamespaces(data);
        const signatures = ([] as ISignaturable[]).concat(...namespaces.map(ns => ns.getSignatures()));
        signatures.push(...SourceParser.parseSignaturesWithinNamespace(data));
        return signatures;
    }    

    static parseSignaturesWithinNamespace(data:TextFragment): ISignaturable[] {
        const signatures:ISignaturable[] = [];
        let matcher = new RemovingRegexWithBodyMatcher(ClassDestructorSignatureMatch.regexStr);
        matcher.match(data).forEach(
            (regexMatch) => {           
                const match = new ClassDestructorSignatureMatch(regexMatch);
                const signature:ISignaturable = {
                    namespaces: [match.classNameMatch],
                    signature: "~"+match.classNameMatch+"()",
                    textScope: regexMatch as TextScope,
                    content: regexMatch.fullMatch
                };
                signatures.push (signature);
            }
        );        

        matcher = new RemovingRegexWithBodyMatcher(ClassConstructorSignatureMatch.regexStr);
        matcher.match(data).forEach(
            (regexMatch) => {           
                const match = new ClassConstructorSignatureMatch(regexMatch);
                const signature:ISignaturable = {
                    namespaces: [match.classNameMatch],
                    signature: match.classNameMatch + "(" + match.argsMatch.replace(/\s/g,'') +")",
                    textScope: regexMatch as TextScope,
                    content: regexMatch.fullMatch
                };
                signatures.push (signature);
            }
        );

        matcher = new RemovingRegexWithBodyMatcher(FunctionDefinitionMatch.regexStr);
        matcher.match(data).forEach(
            (regexMatch) => {           
                const match = new FunctionDefinitionMatch(regexMatch);
                const funcDefinition:ISignaturable = {
                    namespaces: [] as string[],
                    signature: "",
                    textScope: regexMatch as TextScope,
                    content: regexMatch.fullMatch
                };
                const splittedName = match.nameMatch.split("::");
                funcDefinition.signature = splittedName[splittedName.length-1];
                funcDefinition.signature += "(" + match.argsMatch.replace(/\s/g,'') +")" + match.constMatch;
                funcDefinition.namespaces = splittedName.slice(0, splittedName.length-1);
                signatures.push (funcDefinition);
            }
        );
        return signatures;
    }

    static parseNamespaces(data:TextFragment): SourceFileNamespace[]  {
        let namespaces:SourceFileNamespace[] = [];
        const matcher = new RemovingRegexWithBodyMatcher(NamespaceMatch.regexStr);
        matcher.match(data).forEach(
            (regexMatch) => {           
                const match = new NamespaceMatch(regexMatch);
                const newNamespace = new SourceFileNamespace(match.nameMatch, regexMatch as TextScope);
                newNamespace.deserialize(match.bodyMatch);
                namespaces.push(newNamespace); 
            }
        );

        return namespaces;
    }    
    
}