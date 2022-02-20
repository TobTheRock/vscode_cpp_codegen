import { Text, TextFragment, TextScope } from "./Text";
import { flatten, isEmpty, isObject } from "lodash";

export enum SerializableMode {
  header, // matching header file (respective to current file, which is a Source)
  source, // matching source file (respective to current file, which is a Header)
  implHeader, // implementation header file (respective to current file, which has a class with pure virtual functions)
  implSource, // implementation source file (respective to current file, which has a class with pure virtual functions)
  interfaceHeader, // interface header file (respective to current file, which has a class with  virtual functions => pure virtual ones are generated)
  abstractFactoryHeader, // header file of abstract factory for implementations of interfaces in current file
}

export const HEADER_SOURCE_GROUP = [
  SerializableMode.header,
  SerializableMode.source,
];
export const INTERFACE_IMPLEMENTATION_GROUP = [
  SerializableMode.implHeader,
  SerializableMode.implSource,
];

export function isSourceFileSerializationMode(mode: SerializableMode): boolean {
  return [SerializableMode.implSource, SerializableMode.source].includes(mode);
}

export function isAbstractFactorySerializationMode(
  mode: SerializableMode
): boolean {
  return [SerializableMode.abstractFactoryHeader].includes(mode);
}

export function getSerializableModeGroup(
  mode: SerializableMode
): SerializableMode[] {
  const groupModes = flatten(
    [
      INTERFACE_IMPLEMENTATION_GROUP,
      HEADER_SOURCE_GROUP,
      [SerializableMode.interfaceHeader],
    ].filter((group) => group.includes(mode))
  );
  if (isEmpty(groupModes)) {
    return [mode];
  }
  return groupModes;
}
export interface IClassNameProvider {
  getClassName(mode: SerializableMode, withOuterScope: boolean): string;
  originalName: string;
}

export interface INameInputProvider {
  getAbstractFactoryName(origName: string): string | Promise<string>;
  getImplementationName(origName: string): string | Promise<string>;
}

export interface INameInputReceiver {
  provideNames(
    nameInputProvider: INameInputProvider,
    selection?: TextScope,
    ...modes: SerializableMode[]
  ): Promise<void>;
}

export interface SerializationOptions {
  mode: SerializableMode;
  nameScopes?: string[];
  range?: TextScope;
  indentStep?: string;
}
export interface ISerializable {
  serialize(options: SerializationOptions): Text;
}

export function serializeArray(
  serializableArray: ISerializable[],
  options: SerializationOptions
): Text {
  return serializableArray
    .map((serializable) => serializable.serialize(options))
    .reduce(
      (accumulatedText, textElement) => accumulatedText.append(textElement),
      Text.createEmpty(options.indentStep)
    );
}

export function serializeArrayWithNewLineSeperation(
  serializableArray: ISerializable[],
  options: SerializationOptions
): Text {
  return serializableArray
    .map((serializable) =>
      serializable.serialize(options).addNewLineSeperation()
    )
    .reduce(
      (accumulatedText, textElement) => accumulatedText.append(textElement),
      Text.createEmpty(options.indentStep)
    );
}

export interface IDeserializable {
  deserialize: (data: TextFragment) => void;
}

// TODO use decorators for this
class ISerializeDummyImpl implements ISerializable {
  serialize(options: SerializationOptions): Text {
    throw new Error("This class should not be used directly");
  }
}
type Constructor<T = {}> = new (...args: any[]) => T;
export function makeRangedSerializable<
  TBase extends Constructor<TextScope & ISerializeDummyImpl>
>(base: TBase) {
  return class RangedSerializable extends base {
    serialize(options: SerializationOptions): Text {
      if (options.range && !this.contains(options.range)) {
        return Text.createEmpty(options.indentStep);
      }
      return super.serialize(options);
    }
  };
}

class INameInputReceiverDummy implements INameInputReceiver {
  provideNames(
    nameInputProvider: INameInputProvider,
    selection?: TextScope,
    ...modes: SerializableMode[]
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
export function makeRangedNameInputReceiver<
  TBase extends Constructor<TextScope & INameInputReceiverDummy>
>(base: TBase) {
  return class RangedNameInputReceiver extends base {
    provideNames(
      nameInputProvider: INameInputProvider,
      selection?: TextScope,
      ...modes: SerializableMode[]
    ): Promise<void> {
      if (selection && !this.contains(selection)) {
        return Promise.resolve();
      }
      return super.provideNames(nameInputProvider, selection, ...modes);
    }
  };
}

export function makeRanged<
  TBase extends Constructor<
    TextScope & INameInputReceiverDummy & ISerializeDummyImpl
  >
>(base: TBase) {
  return makeRangedNameInputReceiver(makeRangedSerializable(base));
}
