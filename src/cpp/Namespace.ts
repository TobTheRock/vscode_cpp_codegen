import { IClass, IFunction, INamespace, SerializableMode} from "./TypeInterfaces";
import { Parser } from "../Parser";
import * as io from "../io";
export class Namespace  extends io.TextScope implements INamespace {
    
    constructor(name:string, scope:io.TextScope,  nameInputProvider?: io.INameInputProvider) {

        super(scope.scopeStart, scope.scopeEnd);
        this.name = name;
        this.classes = [];
        this.functions = [];
        this.subnamespaces = [];
        this._nameInputProvider = nameInputProvider;
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
        serial += io.serializeArray(this.functions, mode);
        serial += io.serializeArray(this.classes, mode);
        serial += "}";
        return serial;
    }

    deserialize (data: io.TextFragment) {
        this.classes = Parser.parseClasses(data, this._nameInputProvider);
        this.functions = Parser.parseStandaloneFunctiones(data);
    }

    name:string;
    classes:IClass[]; 
    functions:IFunction[];
    subnamespaces: INamespace[];
    
    private readonly _nameInputProvider: io.INameInputProvider | undefined;
}

export class NoneNamespace extends io.TextScope implements INamespace {
    
    constructor(scope:io.TextScope, nameInputProvider?: io.INameInputProvider) {
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
        let serial = io.serializeArray(this.functions, mode);
        serial += io.serializeArray(this.classes, mode);

        return serial;
    }

    deserialize (data: io.TextFragment) {
        this.classes = Parser.parseClasses(data, this._nameInputProvider);
        this.functions = Parser.parseStandaloneFunctiones(data);
    }

    readonly name:string;
    classes:IClass[]; 
    functions:IFunction[];
    readonly subnamespaces:INamespace[];
    private readonly _nameInputProvider: io.INameInputProvider | undefined;
}