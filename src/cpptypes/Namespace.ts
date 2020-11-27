import { IClass, IFunction } from "./interfaces";
import {ISerializable, IDeserializable} from "../io/ISerial";

export class Namespace implements ISerializable,IDeserializable {
    
    constructor(name:string) {
        this.name = name;
        this.classes = [];
        this.functions = [];
    }
    serialize () => string;
    deserialize (fileContent: string){

    }

    name:string;
    classes:IClass[]; 
    functions:IFunction[];
}