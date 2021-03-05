import { TextFragment } from "./Text";
export enum SerializableMode {
  header, // matching header file (respective to current file, which is a Source)
  source, // matching source file (respective to current file, which is a Header)
  implHeader, // implementation header file (respective to current file, which has a class with pure virtual functions)
  implSource, // implementation source file (respective to current file, which has a class with pure virtual functions)
  interfaceHeader, // interface header file (respective to current file, which has a class with  virtual functions => pure virtual ones are generated)
}

export interface ISerializable {
  serialize: (mode: SerializableMode) => string | Promise<string>;
}

export function serializeArray(
  serializableArray: Array<ISerializable>,
  mode: SerializableMode,
  elementPrefix: string = "",
  elementSuffix: string = ""
): Promise<string> {
  return serializableArray.reduce(async (accumulate, serializable) => {
    return (
      (await accumulate) +
      elementPrefix +
      (await serializable.serialize(mode)) +
      elementSuffix
    );
  }, Promise.resolve(""));
}

export interface IDeserializable {
  deserialize: (data: TextFragment) => void;
}
