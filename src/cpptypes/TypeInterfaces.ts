import {ISerializable, IDeserializable, ISerializableMode} from "../io/ISerial";

export {ISerializableMode};

export interface IFunction extends ISerializable {
    readonly name: string;
    readonly returnVal: string;
    readonly args: string;
    readonly isConst: boolean;
    readonly isVirtual: boolean;
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