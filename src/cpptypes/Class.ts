import { IClass, IFunction, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import { ClassNameGenerator, TextFragment, TextScope, serializeArray } from "../io";

export class ClassBase  extends TextScope implements IClass {
    constructor(
        scope:TextScope,
        public readonly name:string,
        public readonly inheritance:string[]) {
        super(scope.scopeStart, scope.scopeEnd)
;    }

    tryAddNestedClass(possibleNestedClass: IClass) {
        if (this.fullyContains(possibleNestedClass)) {
            this.nestedClasses.push(possibleNestedClass);
            return true;
        }
        return false;
    }

    deserialize (data: TextFragment) {
        
        this.nestedClasses = [];

        const privateContent:TextFragment = Parser.parseClassPrivateScope(data);
        this.privateFunctions = Parser.parseClassMemberFunctions(privateContent, this.classNameGen);

        const publicContent:TextFragment = Parser.parseClassPublicScope(data);
        this.publicFunctions = Parser.parseClassMemberFunctions(publicContent, this.classNameGen);

        const protectedContent:TextFragment = Parser.parseClassProtectedScope(data);
        this.protectedFunctions = Parser.parseClassMemberFunctions(protectedContent, this.classNameGen);
    }

    serialize (mode:SerializableMode) {   
        let serial = "";
        switch (mode) {
            case SerializableMode.Header:
            case SerializableMode.InterfaceHeader:
            case SerializableMode.ImplHeader:
                serial = this.getHeaderSerialStart(mode);
                serial += "\tpublic:\n";
                serial += serializeArray(this.publicFunctions, mode);
    
                serial += "\tprotected:\n";
                serial += serializeArray(this.protectedFunctions, mode);
                
                serial += "\tprivate:\n";
                serial += serializeArray(this.privateFunctions, mode);
                serial += serializeArray(this.nestedClasses, mode);//TODO those can also be public/private
    
                serial += "};";
    
                break;
            
            case SerializableMode.Source:
            case SerializableMode.ImplSource:    
            serial += serializeArray(this.publicFunctions, mode);
            serial += serializeArray(this.protectedFunctions, mode);
            serial += serializeArray(this.privateFunctions, mode);
            break;
            
            default:
                break;
        }
    
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

    publicFunctions:IFunction[] = [];
    privateFunctions:IFunction[] = [];
    nestedClasses: IClass[] = [];   //TODO those can also be public/private
    protectedFunctions:IFunction[] = [];
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