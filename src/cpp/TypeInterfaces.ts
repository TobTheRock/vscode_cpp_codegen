import {ISerializable, IDeserializable, SerializableMode, TextScope} from "../io";

export {SerializableMode as SerializableMode};

export interface IFunction extends ISerializable { // Todo inherit from TextScope
    readonly name: string;
    readonly returnVal: string;
    readonly args: string;
}

export interface IClass extends ISerializable,IDeserializable,TextScope {
    tryAddNestedClass(possibleNestedClass: IClass):boolean;
    readonly name: string;
    readonly publicFunctions: IFunction[];
    readonly privateFunctions: IFunction[];
    readonly protectedFunctions: IFunction[];
    readonly nestedClasses: IClass[];
    readonly inheritance: string[]; // TODO -> IClass?

    //TODO constructor destructor, data members? (at least public/protected ones)
}

export interface INamespace extends ISerializable,IDeserializable,TextScope {
    tryAddNestedNamespace(possibleNestedClass: INamespace):boolean;
    readonly name:string;
    readonly classes:IClass[]; 
    readonly functions:IFunction[];
    readonly subnamespaces:INamespace[];
}

export interface IFile extends ISerializable,IDeserializable {
}