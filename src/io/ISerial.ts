export interface ISerializable
{
    serialize: () => string;
}

export interface IDeserializable
{
    deserialize: (fileContent:string) => void;
}