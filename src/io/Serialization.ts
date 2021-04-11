import { TextFragment } from "./Text";
export enum SerializableMode {
  header, // matching header file (respective to current file, which is a Source)
  source, // matching source file (respective to current file, which is a Header)
  implHeader, // implementation header file (respective to current file, which has a class with pure virtual functions)
  implSource, // implementation source file (respective to current file, which has a class with pure virtual functions)
  interfaceHeader, // interface header file (respective to current file, which has a class with  virtual functions => pure virtual ones are generated)
}

export interface IClassNameProvider {
  getClassName(mode: SerializableMode, withOuterScope: boolean): string;
  originalName: string;
}

export interface INameInputProvider {
  getInterfaceName?(origName: string): string | Promise<string>;
}

export interface SerializationOptions {
  mode: SerializableMode;
  nameScopes?: string[];
  nameInputProvider?: INameInputProvider;
}

export interface ISerializable {
  serialize: (options: SerializationOptions) => string | Promise<string>;
}

export function serializeArray(
  serializableArray: Array<ISerializable>,
  options: SerializationOptions,
  elementPrefix: string = "",
  elementSuffix: string = ""
): Promise<string> {
  return serializableArray.reduce(async (accumulate, serializable) => {
    return (
      (await accumulate) +
      elementPrefix +
      (await serializable.serialize(options)) +
      elementSuffix
    );
  }, Promise.resolve(""));
}

export interface IDeserializable {
  deserialize: (data: TextFragment) => void;
}
