import {INamespace,IFile, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import {TextFragment, TextScope, serializeArray } from "../io";


export class HeaderFile implements IFile
{
    constructor(content: string)
    {
        this._namespaces = [];
        this.deserialize(TextFragment.createFromString(content));
    }

    deserialize (fileContent:TextFragment)
    {
        this._namespaces.push(...Parser.parseNamespaces(fileContent));
        this._namespaces.push(...Parser.parseNoneNamespaces(fileContent));
    }

    serialize (mode: SerializableMode)
    {
        let serial = "";
        serial += serializeArray(this._namespaces, mode);
        return serial;
    }

    static readonly extensions = ["hpp","hxx", "h"]; // TODO make extensions configurable
    private readonly _namespaces:INamespace[];
} 