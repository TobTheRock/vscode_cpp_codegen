import {ISerializable, IDeserializable, SerializableMode, TextScope} from "../io";

export {SerializableMode as SerializableMode};

export interface IFunction extends ISerializable { // Todo inherit from TextScope
    readonly name: string;
    readonly returnVal: string;
    readonly args: string;
}

export interface IConstructor extends ISerializable {
    readonly args: string;
}

export interface IDestructor extends ISerializable {
    readonly virtual: boolean;
}


export interface IClassScope extends ISerializable,IDeserializable {
    readonly memberFunctions: IFunction[];
    readonly nestedClasses: IClass[];
    readonly constructors: IConstructor[];
    readonly scopes: TextScope[];
}


export interface IClass extends ISerializable,IDeserializable,TextScope {
    tryAddNestedClass(possibleNestedClass: IClass):boolean;
    readonly name: string;
    readonly publicScope : IClassScope;
    readonly privateScope : IClassScope;
    readonly protectedScope: IClassScope;
    readonly destructor?: IDestructor;
    readonly inheritance: string[]; // TODO -> IClass?
}

export interface INamespace extends ISerializable,IDeserializable,TextScope {
    tryAddNestedNamespace(possibleNestedClass: INamespace):boolean;
    readonly name:string;
    readonly classes:IClass[]; 
    readonly functions:IFunction[];
    readonly subnamespaces:INamespace[];
}
