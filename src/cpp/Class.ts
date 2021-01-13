import { IClass, IFunction, IConstructor, IDestructor, IClassScope, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import { ClassNameGenerator, TextFragment, TextScope, serializeArray } from "../io";


export class ClassConstructor implements IConstructor {
    constructor(public readonly args:string,
                private readonly classNameGen:ClassNameGenerator) {}
    serialize (mode: SerializableMode): string {

        let serial = "";
        switch (mode) {
            case SerializableMode.Header:
            case SerializableMode.ImplHeader:
                serial = this.classNameGen.createName(mode) +
                    "(" + this.args + ");";
                break;
            
            case SerializableMode.Source:
            case SerializableMode.ImplSource:
                serial = this.classNameGen.createName(mode) + "::" +
                this.classNameGen.createName(mode) +
                    "(" + this.args + ") {\n}";
                break;
            case SerializableMode.InterfaceHeader:
                break;
        }
        return serial;
    }
} 

export class ClassDestructor  implements IDestructor {
    constructor(public readonly virtual:boolean,
                private readonly classNameGen:ClassNameGenerator) {}
    serialize (mode: SerializableMode): string {

        let serial = "";
        switch (mode) {
            case SerializableMode.Header:
            case SerializableMode.InterfaceHeader:
                serial += this.virtual ? "virtual " : "";
                serial += "~" + this.classNameGen.createName(mode) +
                    "();";
                break;
            case SerializableMode.ImplHeader:
                serial = "~" + this.classNameGen.createName(mode) + " ();";
                serial += this.virtual ? "override " : "";
                break;
            
            case SerializableMode.Source:
            case SerializableMode.ImplSource:
                serial = "~" + this.classNameGen.createName(mode) + "::" +
                this.classNameGen.createName(mode) +
                "() {\n}";
                break;
        }
        return serial;
    }
} 

enum ClassScopeType {
    private,
    public,
    protected
}
class ClassScope implements IClassScope {

    constructor(public readonly type: ClassScopeType,
        private readonly className: string,
        private readonly classNameGen: ClassNameGenerator) {}

    deserialize (data: TextFragment) {
        let content: TextFragment;
        switch (this.type) {
            case ClassScopeType.protected:
                content = Parser.parseClassProtectedScope(data);
                break;
            case ClassScopeType.public:
                content = Parser.parseClassPublicScope(data);
                break;
            case ClassScopeType.private:
            default:
                content = Parser.parseClassPrivateScope(data);
                break;
        }
        this.scopes.push(...content.blocks);
        this.constructors.push(...Parser.parseClassConstructor(content, this.className, this.classNameGen));
        this.memberFunctions.push(...Parser.parseClassMemberFunctions(content, this.classNameGen));
    }

    serialize (mode:SerializableMode) {   
        let serial = "";
        switch (mode) {
            case SerializableMode.Header:
            case SerializableMode.InterfaceHeader:
            case SerializableMode.ImplHeader:
                switch (this.type) {
                    case ClassScopeType.protected:
                        serial += "\tprotected:\n";
                        break;
                    case ClassScopeType.public:
                        serial += "\tpublic:\n";
                        break;
                    case ClassScopeType.private:
                    default:
                        serial += "\tprivate:\n";
                        break;
                }
                break;
            case SerializableMode.Source:
            case SerializableMode.ImplSource:    
            default:
                break;
        }

        serial += serializeArray(this.constructors, mode, "\n\n");
        serial += serializeArray(this.nestedClasses, mode, "\n\n");
        serial += serializeArray(this.memberFunctions, mode, "\n\n");
    
        return serial;
    }

    readonly memberFunctions: IFunction[] = [];
    readonly nestedClasses: IClass[] = [];
    readonly constructors: IConstructor[] = [];
    readonly scopes: TextScope[] = [];
}

export class ClassBase  extends TextScope implements IClass {
    constructor(
        scope:TextScope,
        public readonly name:string,
        public readonly inheritance:string[]) {
        super(scope.scopeStart, scope.scopeEnd);
    }

    tryAddNestedClass(possibleNestedClass: IClass) {
        if (!this.fullyContains(possibleNestedClass)) {
            return false;
        }
        else if (this.publicScope.scopes.some(scope => (scope.fullyContains(possibleNestedClass)))) {
            this.publicScope.nestedClasses.push(possibleNestedClass);
        }
        else if (this.protectedScope.scopes.some(scope => (scope.fullyContains(possibleNestedClass)))) {
            this.protectedScope.nestedClasses.push(possibleNestedClass);
        }
        else {
            this.privateScope.nestedClasses.push(possibleNestedClass);
        }
        return true;
    }

    deserialize (data: TextFragment) {
        const dtors = Parser.parseClassDestructors(data, this.name, this.classNameGen);
        if (dtors.length > 1) {
            throw new Error("Class " + this.name + " has multiple deconstructors!");
        } else if (dtors.length === 1) {
            this.destructor = dtors[0];
        }
        this.publicScope.deserialize(data);
        this.privateScope.deserialize(data);
        this.protectedScope.deserialize(data);
    }

    serialize (mode:SerializableMode) {   
        let serial = "";
        let suffix = "";
        switch (mode) {
            case SerializableMode.Header:
            case SerializableMode.InterfaceHeader:
            case SerializableMode.ImplHeader:
                serial += this.getHeaderSerialStart(mode);
                suffix = "};";  
                break;
            case SerializableMode.Source:
            case SerializableMode.ImplSource:    
            default:
                break;
        }
        serial += this.publicScope.serialize(mode);
        serial += this.protectedScope.serialize(mode);
        serial += this.privateScope.serialize(mode);
        serial += this.destructor?.serialize(mode);
        serial += suffix;
        return serial;
    }

    getHeaderSerialStart  (mode:SerializableMode) {
        let serial = "class " + this.classNameGen.createName(mode);
        this.inheritance.forEach( (inheritedClass, index) => {
            if (index === 0) {
                serial += " : ";
            }
            serial += inheritedClass;   
            if (index < this.inheritance.length-1) {
                serial += ", ";
            }
        });

        serial += "\n";

        return serial;
    }

    protected classNameGen: ClassNameGenerator = new ClassNameGenerator(this.name, false);

    readonly publicScope : IClassScope = new ClassScope(ClassScopeType.public, this.name, this.classNameGen);
    readonly privateScope : IClassScope = new ClassScope(ClassScopeType.private, this.name, this.classNameGen);
    readonly protectedScope: IClassScope = new ClassScope(ClassScopeType.protected, this.name, this.classNameGen);
    destructor: IDestructor|undefined;
}


export class ClassInterface extends ClassBase {
    serialize (mode:SerializableMode) {    
        let serial = "";
        switch (mode) {
            case SerializableMode.Source:
                //TODO warning
                break;
            case SerializableMode.InterfaceHeader:
            case SerializableMode.Header:
            case SerializableMode.ImplHeader:
            case SerializableMode.ImplSource:
            default:
                serial = super.serialize(mode);
                break;
        }
        return serial;
    }
} 