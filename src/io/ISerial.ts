import { serialize } from "v8";
import { TextFragment } from "./Text";
export enum SerializableMode {
    Header,                 // matching header file (respective to current file, which is a Source) 
    Source,                 // matching source file (respective to current file, which is a Header) 
    ImplHeader,             // implementation header file (respective to current file, which has a class with pure virtual functions)
    ImplSource,             // implementation source file (respective to current file, which has a class with pure virtual functions)
    InterfaceHeader,        // interface header file (respective to current file, which has a class with  virtual functions => pure virtual ones are generated)
} 


export interface ISerializable
{
    serialize: (mode:SerializableMode) => string;
}

export function serializeArray(serializableArray: Array<ISerializable>, mode:SerializableMode, filler: string = "") {
    let result = "";
    serializableArray.forEach(serializable => {
        result += serializable.serialize(mode) + filler;
    });
    return result;
} 

export interface IDeserializable
{
    deserialize: (data:TextFragment) => void;
}