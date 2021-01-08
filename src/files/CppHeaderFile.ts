import {FileBase} from "./FileBase";
import * as cpptypes from "../cpptypes";
import * as io from "../io";
import {Parser} from "../Parser";

import * as path from 'path';
import { inherits } from "util";

export class CppHeaderFile extends FileBase implements io.ISerializable, io.IDeserializable
{
    constructor(filePath: string)
    {
        super(filePath);
        this._namespaces = [];
    }

    static isHeader(filePath: string)
    {
        let dotPos = filePath.lastIndexOf('.');
        let ext = filePath.substr(dotPos);
        if (ext.includes('h') || ext.includes('hpp')) { // TODO make configurable
            return true;
        }
        return false;  
    }

    deserialize (fileContent:io.TextFragment)
    {
        this._namespaces.push(...Parser.parseNamespaces(fileContent));
        this._namespaces.push(...Parser.parseNoneNamespaces(fileContent));
    }

    serialize (mode: io.SerializableMode)
    {
        // TODO file header => Config
        let serial = "";
        this._namespaces.forEach(namespace => {
            serial += namespace.serialize(mode);
        });
        return serial;
    }

    private readonly _namespaces: cpptypes.INamespace[]; 
} 