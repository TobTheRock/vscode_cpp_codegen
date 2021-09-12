import * as io from "../io";

export interface Comparable<T> {
  equals: (other: T, mode?: io.SerializableMode) => boolean;
}

export interface IFunction
  extends io.ISerializable,
    io.TextScope,
    Comparable<IFunction> {
  readonly name: string;
  readonly returnVal: string;
  readonly args: string;
}

export interface IConstructor
  extends io.ISerializable,
    io.TextScope,
    Comparable<IConstructor> {
  readonly args: string;
}

export interface IDestructor
  extends io.ISerializable,
    io.TextScope,
    Comparable<IDestructor> {
  readonly virtual: boolean;
}

export interface IClassScope extends io.ISerializable {
  readonly memberFunctions: IFunction[];
  readonly nestedClasses: IClass[];
  readonly constructors: IConstructor[];
  deserialize(data: io.TextFragment, parser: IParser): void;
}

export interface IClass
  extends io.ISerializable,
    io.INameInputReceiver,
    io.TextScope,
    Comparable<IClass> {
  readonly name: string;
  readonly publicScope: IClassScope;
  readonly privateScope: IClassScope;
  readonly protectedScope: IClassScope;
  readonly destructor?: IDestructor;
  readonly inheritance: string[]; // TODO -> IClass?

  getName(mode: io.SerializableMode): string;
  deserialize(data: io.TextFragment, parser: IParser): void;
}

export interface INamespace
  extends io.ISerializable,
    io.INameInputReceiver,
    io.TextScope,
    Comparable<INamespace> {
  readonly name: string;
  readonly classes: IClass[];
  readonly functions: IFunction[];
  readonly subnamespaces: INamespace[];
  deserialize(data: io.TextFragment, parser: IParser): void;
}

export interface IDefinition extends IFunction {
  readonly namespaceNames: string[];
  readonly classNames: string[];
}
export function isDefinition(fnct: IFunction) {
  return (fnct as IDefinition).namespaceNames !== undefined;
}

export interface MemberFunctionIgnoringClassNames extends IFunction {
  readonly ignoresClassNames: boolean;
}

export function ignoresClassNames(fnct: IFunction) {
  return (
    (fnct as MemberFunctionIgnoringClassNames).ignoresClassNames !== undefined
  );
}

export interface IParser {
  parseComments(data: io.TextFragment): void;

  parseNamespaces(data: io.TextFragment): INamespace[];
  parseRootNamespace(data: io.TextFragment): INamespace;
  parseStandaloneFunctions(data: io.TextFragment): IFunction[];
  parseClasses(
    data: io.TextFragment,
    classNameProvider?: io.IClassNameProvider
  ): IClass[];

  parseClassPrivateScope(data: io.TextFragment): io.TextFragment;
  parseClassPublicScope(data: io.TextFragment): io.TextFragment;
  parseClassProtectedScope(data: io.TextFragment): io.TextFragment;
  parseStructPrivateScope(data: io.TextFragment): io.TextFragment;
  parseStructPublicScope(data: io.TextFragment): io.TextFragment;
  parseStructProtectedScope(data: io.TextFragment): io.TextFragment;

  parseClassConstructors(
    data: io.TextFragment,
    classNameProvider: io.IClassNameProvider
  ): IConstructor[];
  parseClassDestructors(
    data: io.TextFragment,
    classNameProvider: io.IClassNameProvider
  ): IDestructor[];
  parseClassMemberFunctions(
    data: io.TextFragment,
    classNameProvider: io.IClassNameProvider
  ): IFunction[];
}
