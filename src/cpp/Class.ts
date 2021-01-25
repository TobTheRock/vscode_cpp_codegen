import { IClass, IFunction, IConstructor, IDestructor, IClassScope, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import { ClassNameGenerator } from "./ClassNameGenerator";
import * as io from "../io";

export class ClassConstructor implements IConstructor {
    constructor(public readonly args:string,
                private readonly classNameGen:ClassNameGenerator) {}
    async serialize (mode: SerializableMode): Promise<string> {

        let serial = "";
        switch (mode) {
            case SerializableMode.header:
            case SerializableMode.implHeader:
                serial = await this.classNameGen.createName(mode) +
                    "(" + this.args + ");";
                break;
            
            case SerializableMode.source:
            case SerializableMode.implSource:
                const name = await this.classNameGen.createName(mode);
                serial = name + "::" + name + "(" + this.args + ") {\n}";
                break;
            case SerializableMode.interfaceHeader:
                break;
        }
        return serial;
    }
} 

export class ClassDestructor  implements IDestructor {
    constructor(public readonly virtual: boolean,
                private readonly classNameGen: ClassNameGenerator) {}
    async serialize (mode: SerializableMode): Promise<string> {

        let serial = "";
        switch (mode) {
            case SerializableMode.header:
            case SerializableMode.interfaceHeader:
                serial += this.virtual ? "virtual " : "";
                serial += "~" + await this.classNameGen.createName(mode) +
                    "();";
                break;
            case SerializableMode.implHeader:
                serial = "~" + await this.classNameGen.createName(mode) + " ()";
                serial += this.virtual ? " override;\n" : ";\n";
                break;
            
            case SerializableMode.source:
            case SerializableMode.implSource:
                const name = await this.classNameGen.createName(mode);
                serial =  name + "::" + "~" + name +
                "() {\n}\n\n";
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
        private readonly _className: string,
        private readonly _classNameGen: ClassNameGenerator) {}

    deserialize (data: io.TextFragment) {
        let content: io.TextFragment;
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
        this.constructors.push(...Parser.parseClassConstructor(content, this._className, this._classNameGen));
        this.memberFunctions.push(...Parser.parseClassMemberFunctions(content, this._classNameGen));
    }

    async serialize(mode: SerializableMode) {   
        
        if (!this.constructors.length && !this.nestedClasses.length && !this.memberFunctions.length) {
            return "";
        }

        let serial = "";
        let arrayPrefix = "";
        let arraySuffix = "";
        switch (mode) {
            case SerializableMode.header:
            case SerializableMode.interfaceHeader:
            case SerializableMode.implHeader:
                switch (this.type) {
                    case ClassScopeType.protected:
                        serial += "protected:\n";
                        break;
                    case ClassScopeType.public:
                        serial += "public:\n";
                        break;
                    case ClassScopeType.private:
                    default:
                        serial += "private:\n";
                        break;
                }
                arrayPrefix = "\t";
                arraySuffix = "\n";
                break;
            case SerializableMode.source:
            case SerializableMode.implSource:    
            default:
                arraySuffix = "\n\n";
                break;
        }
        serial += await io.serializeArray(this.constructors, mode, arrayPrefix, arraySuffix);
        serial += await io.serializeArray(this.nestedClasses, mode, arrayPrefix, arraySuffix); // TODO formatting not working for multiline
        serial += await io.serializeArray(this.memberFunctions, mode, arrayPrefix, arraySuffix);
    
        return serial;
    }

    readonly memberFunctions: IFunction[] = [];
    readonly nestedClasses: IClass[] = [];
    readonly constructors: IConstructor[] = [];
    readonly scopes: io.TextScope[] = [];
}

class ClassBase  extends io.TextScope implements IClass {
    constructor(
        scope:io.TextScope,
        public readonly name:string,
        public readonly inheritance: string[],
        private readonly _isInterface: boolean, 
        nameInputProvider?: io.INameInputProvider) {
        super(scope.scopeStart, scope.scopeEnd);

        this._classNameGen = new ClassNameGenerator(this.name, this._isInterface, nameInputProvider);
        this.publicScope = new ClassScope(ClassScopeType.public, this.name, this._classNameGen);
        this.privateScope = new ClassScope(ClassScopeType.private, this.name, this._classNameGen);
        this.protectedScope = new ClassScope(ClassScopeType.protected, this.name, this._classNameGen);
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

    deserialize (data: io.TextFragment) {
        const dtors = Parser.parseClassDestructors(data, this.name, this._classNameGen);
        if (dtors.length > 1) {
            throw new Error("Class " + this.name + " has multiple deconstructors!");
        } else if (dtors.length === 1) {
            this.destructor = dtors[0];
        }
        this.publicScope.deserialize(data);
        this.privateScope.deserialize(data);
        this.protectedScope.deserialize(data);
    }

    async serialize (mode:SerializableMode) {   
        let serial = "";
        let suffix = "";
        switch (mode) {
            case SerializableMode.header:
            case SerializableMode.interfaceHeader:
                serial += await this.getHeaderSerialStart(mode);
                suffix = "};";
                break;
            case SerializableMode.implHeader:
                serial += await this.getHeaderSerialStart(mode, ["public " + this.name]);
                suffix = "};";  
                break;
            case SerializableMode.source:
            case SerializableMode.implSource:    
            default:
                break;
        }
        if (this.destructor) {
            serial += await this.destructor.serialize(mode);
        }
        serial += await this.publicScope.serialize(mode);
        serial += await this.protectedScope.serialize(mode);
        serial += await this.privateScope.serialize(mode);
        serial += suffix;
        return serial;
    }

    async getHeaderSerialStart  (mode:SerializableMode, inheritance:string[] = this.inheritance) {
        let serial = "class " + await this._classNameGen.createName(mode);
        inheritance.forEach( (inheritedClass, index) => {
            if (index === 0) {
                serial += " : ";
            }
            serial += inheritedClass;   
            if (index < inheritance.length-1) {
                serial += ", ";
            }
        });

        serial += " {\n";

        return serial;
    }

    private _classNameGen: ClassNameGenerator;
    readonly publicScope : IClassScope;
    readonly privateScope : IClassScope;
    readonly protectedScope: IClassScope;
    destructor: IDestructor|undefined;
}

export class ClassImpl extends ClassBase {
    constructor(
        scope:io.TextScope,
        public readonly name:string,
        public readonly inheritance: string[],
        nameInputProvider?: io.INameInputProvider) {
        super(scope, name, inheritance, false, nameInputProvider);
    }

    async serialize(mode: SerializableMode) {    
        let serial = "";
        switch (mode) {
            case SerializableMode.implHeader:
            case SerializableMode.implSource:
                break;
            case SerializableMode.source:
            case SerializableMode.interfaceHeader:
            case SerializableMode.header:
            default:
                serial = await super.serialize(mode);
                break;
        }
        return serial;
    }
}


export class ClassInterface extends ClassBase {
    constructor(
        scope:io.TextScope,
        public readonly name:string,
        public readonly inheritance: string[],
        nameInputProvider?: io.INameInputProvider) {
        super(scope, name, inheritance, true, nameInputProvider);
    }

    async serialize(mode: SerializableMode) {    
        let serial = "";
        switch (mode) {
            case SerializableMode.source:
                //TODO warning
                break;
            case SerializableMode.interfaceHeader:
            case SerializableMode.header:
            case SerializableMode.implHeader:
            case SerializableMode.implSource:
            default:
                serial = await super.serialize(mode);
                break;
        }
        return serial;
    }
} 