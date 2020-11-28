
export enum ISerializableMode {
    Source,
    ImplHeader,
    InterfaceHeader,
} 

export interface ISerializable
{
    serialize: (mode:ISerializableMode) => string;
}

export interface IDeserializable
{
    deserialize: (content:string) => void;
}