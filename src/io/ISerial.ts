
export enum SerializableMode {
    Header,                 // matching header file (respective to current file, which is a Header) 
    Source,                 // matching source file (respective to current file, which is a Header) 
    ImplHeader,             // implementation header file (respective to current file, which has a class with pure virtual functions)
    ImplSource,             // implementation source file (respective to current file, which has a class with pure virtual functions)
    InterfaceHeader,        // interface header file (respective to current file, which has a class with  virtual functions => pure virtual ones are generated)
} 

export interface ISerializable
{
    serialize: (mode:SerializableMode) => string;
}

export interface IDeserializable
{
    deserialize: (content:string) => void;
}