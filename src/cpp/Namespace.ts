import { IClass, IFunction, INamespace} from "./TypeInterfaces";
import { HeaderParser } from "../io/HeaderParser";
import { INameInputProvider } from "../INameInputProvider";
import * as io from "../io";
export class Namespace  extends io.TextScope implements INamespace {
    
    constructor(name:string, scope:io.TextScope,  nameInputProvider?: INameInputProvider) {

        super(scope.scopeStart, scope.scopeEnd);
        this.name = name;
        this.classes = [];
        this.functions = [];
        this.subnamespaces = [];
        this._nameInputProvider = nameInputProvider;
    }

    async serialize (mode:io.SerializableMode) {
        let serial = "namespace " +  this.name + " {\n\n"; 
        serial += await io.serializeArray(this.functions, mode);
        serial += await io.serializeArray(this.classes, mode);
        serial += "}";
        return serial;
    }

    deserialize (data: io.TextFragment) {
        this.subnamespaces = HeaderParser.parseNamespaces(data);
        this.classes = HeaderParser.parseClasses(data, this._nameInputProvider);
        this.functions = HeaderParser.parseStandaloneFunctiones(data);
    }

    name:string;
    classes:IClass[]; 
    functions:IFunction[];
    subnamespaces: INamespace[];
    
    private readonly _nameInputProvider: INameInputProvider | undefined;
}

export class NoneNamespace extends io.TextScope implements INamespace {
    
    constructor(scope:io.TextScope, nameInputProvider?: INameInputProvider) {
        super(scope.scopeStart, scope.scopeEnd);
        this.name = "";
        this.classes = [];
        this.functions = [];
        this.subnamespaces = [];
    }

    async serialize (mode:io.SerializableMode) {
        let serial:string = await io.serializeArray(this.functions, mode);
        serial += await io.serializeArray(this.classes, mode);
        return serial;
    }

    deserialize (data: io.TextFragment) {
        this.classes = HeaderParser.parseClasses(data, this._nameInputProvider);
        this.functions = HeaderParser.parseStandaloneFunctiones(data);
    }

    readonly name:string;
    classes:IClass[]; 
    functions:IFunction[];
    subnamespaces:INamespace[];
    private readonly _nameInputProvider: INameInputProvider | undefined;
}