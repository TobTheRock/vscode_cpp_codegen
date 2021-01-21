import { IClass, IFunction, INamespace, SerializableMode} from "./TypeInterfaces";
import {Parser} from "../Parser";
import {TextFragment, TextScope, serializeArray} from "../io";
export class Namespace  extends TextScope implements INamespace {
    
    constructor(name:string, scope:TextScope) {

        super(scope.scopeStart, scope.scopeEnd);
        this.name = name;
        this.classes = [];
        this.functions = [];
        this.subnamespaces = [];
    }

    tryAddNestedNamespace(possibleNestedNamespace: INamespace): boolean {
        if (this.fullyContains(possibleNestedNamespace)) {
            this.subnamespaces.push(possibleNestedNamespace);
            return true;
        }
        return false;
    }

    serialize (mode:SerializableMode) {
        let serial = "namespace " +  this.name + " {\n\n"; 
        serial += serializeArray(this.functions, mode);
        serial += serializeArray(this.classes, mode);
        serial += "}";
        return serial;
    }

    deserialize (data: TextFragment) {
        this.classes = Parser.parseClasses(data);
        this.functions = Parser.parseStandaloneFunctiones(data);
    }

    name:string;
    classes:IClass[]; 
    functions:IFunction[];
    subnamespaces:INamespace[];
}

export class NoneNamespace extends TextScope implements INamespace {
    
    constructor(scope:TextScope) {
        super(scope.scopeStart, scope.scopeEnd);
        this.name = "";
        this.classes = [];
        this.functions = [];
        this.subnamespaces = [];
    }

    tryAddNestedNamespace(possibleNestedNamespace: INamespace): boolean {
        return false;
    }

    serialize (mode:SerializableMode) {
        let serial = serializeArray(this.functions, mode);
        serial += serializeArray(this.classes, mode);

        return serial;
    }

    deserialize (data: TextFragment) {
        this.classes = Parser.parseClasses(data);
        this.functions = Parser.parseStandaloneFunctiones(data);
    }

    readonly name:string;
    classes:IClass[]; 
    functions:IFunction[];
    readonly subnamespaces:INamespace[];
}