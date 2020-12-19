import { IClass, IFunction, INamespace, SerializableMode} from "./TypeInterfaces";
import {Parser} from "../Parser";
import {DeseralizationData} from "../io";
export class Namespace implements INamespace {
    
    constructor(name:string, subnamespaces:INamespace[] = []) {
        this.name = name;
        this.classes = [];
        this.functions = [];
        this.subnamespaces = subnamespaces;
    }

    serialize (mode:SerializableMode) {
        return "";
    }

    deserialize (data: DeseralizationData) {
        this.subnamespaces = Parser.parseNamespaces(data);
        this.classes = Parser.parseClasses(data);
        this.functions = Parser.parseStandaloneFunctiones(data);
    }

    name:string;
    classes:IClass[]; 
    functions:IFunction[];
    subnamespaces:INamespace[];
}

export class NoneNamespace implements INamespace {
    
    constructor() {
        this.name = "";
        this.classes = [];
        this.functions = [];
        this.subnamespaces = [];
    }

    serialize (mode:SerializableMode) {
        return "";
    }

    deserialize (data: DeseralizationData) {
        this.classes = Parser.parseClasses(data);
        this.functions = Parser.parseStandaloneFunctiones(data);
    }

    readonly name:string;
    classes:IClass[]; 
    functions:IFunction[];
    readonly subnamespaces:INamespace[];
}