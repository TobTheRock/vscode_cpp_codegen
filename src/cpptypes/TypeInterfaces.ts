import {ISerializable, IDeserializable, ISerializableMode} from "../io/ISerial";

export {ISerializableMode};

export interface IFunction extends ISerializable {
    readonly name: string;
    readonly returnVal: string;
    readonly args: string;
    readonly isConst: boolean; // Todo move to impl?
    readonly isVirtual: boolean; // Todo move to impl?
}

export interface IClass extends ISerializable,IDeserializable {
    readonly name: string;
    readonly publicFunctions: IFunction[];
    readonly privateFunctions: IFunction[];
    readonly protectedFunctions: IFunction[];
    readonly nestedClasses: IClass[];
    readonly inheritance: string[]; // TODO -> IClass?

    //TODO constructor destructor, data members? (at least public/protected ones)
}

export interface INamespace extends ISerializable,IDeserializable {
    readonly name:string;
    readonly classes:IClass[]; 
    readonly functions:IFunction[];
    readonly subnamespaces:INamespace[];
}