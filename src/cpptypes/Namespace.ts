import { IClass, IFunction, INamespace, SerializableMode} from "./TypeInterfaces";
import {Parser} from "../Parser";

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

    deserialize (content: string) {
        this.subnamespaces = Parser.parseNamespaces(content);
        this.classes = Parser.parseClasses(content);
        this.functions = Parser.parseStandaloneFunctiones(content);
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

    deserialize (content: string) {
        this.classes = Parser.parseClasses(content);
        this.functions = Parser.parseStandaloneFunctiones(content);
    }

    readonly name:string;
    classes:IClass[]; 
    functions:IFunction[];
    readonly subnamespaces:INamespace[];
}