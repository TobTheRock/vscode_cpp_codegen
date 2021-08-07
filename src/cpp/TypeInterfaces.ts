import * as io from "../io";

export interface IFunction extends io.ISerializable, io.TextScope {
  readonly name: string;
  readonly returnVal: string;
  readonly args: string;
}

export interface IConstructor extends io.ISerializable, io.TextScope {
  readonly args: string;
}

export interface IDestructor extends io.ISerializable, io.TextScope {
  readonly virtual: boolean;
}

export interface IClassScope extends io.ISerializable, io.IDeserializable {
  readonly memberFunctions: IFunction[];
  readonly nestedClasses: IClass[];
  readonly constructors: IConstructor[];
}

export interface IClass
  extends io.ISerializable,
    io.IDeserializable,
    io.INameInputReceiver,
    io.TextScope {
  readonly name: string;
  readonly publicScope: IClassScope;
  readonly privateScope: IClassScope;
  readonly protectedScope: IClassScope;
  readonly destructor?: IDestructor;
  readonly inheritance: string[]; // TODO -> IClass?
}

export interface INamespace
  extends io.ISerializable,
    io.IDeserializable,
    io.INameInputReceiver,
    io.TextScope {
  readonly name: string;
  readonly classes: IClass[];
  readonly functions: IFunction[];
  readonly subnamespaces: INamespace[];
}
