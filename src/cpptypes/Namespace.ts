import { IClass, IFunction, INamespace, ISerializableMode} from "./TypeInterfaces";

export class Namespace implements INamespace {
    
    constructor(name:string, subnamespaces:INamespace[] = []) {
        this.name = name;
        this.classes = [];
        this.functions = [];
        this.subnamespaces = subnamespaces;
    }

    serialize (mode:ISerializableMode) {
        return "";
    }

    deserialize (content: string) {

        //TODO Parser.findName

    }

    name:string;
    classes:IClass[]; 
    functions:IFunction[];
    subnamespaces:INamespace[];
}