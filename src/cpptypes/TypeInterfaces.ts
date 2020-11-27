import {ISerializable, IDeserializable} from "../io/ISerial";

export interface IFunction extends ISerializable,IDeserializable {
    returnVal: string;
    arguments: string[];
    isConst: boolean;
    isVirtual: boolean;
}

export interface IClass extends ISerializable,IDeserializable {
    publicFunctions: IFunction[];
    privateFunctions: IFunction[];
    protectedFunctions: IFunction[];
    inheritance: string[]; // TODO -> IClass?
}

export interface INamespace extends ISerializable,IDeserializable {
    readonly name:string;
    readonly classes:IClass[]; 
    readonly functions:IFunction[];
    readonly subnamespaces:INamespace[];
}