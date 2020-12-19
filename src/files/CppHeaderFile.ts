import {FileBase} from "./FileBase";
import * as cpptypes from "../cpptypes";
import {ISerializable, IDeserializable, SerializableMode} from "../io/ISerial";

export {SerializableMode as SerializableMode};



import * as path from 'path';
import { inherits } from "util";

export class CppHeaderFile extends FileBase implements ISerializable, IDeserializable
{
    constructor(filePath: string)
    {
        super(filePath);
        this._namespaces = [];
        // if (!CppHeaderFile.isHeader(filePath))
        // {
        //     console.log("ERROR: file", filePath,  "has invalid type");
        //     return;
        // }
    }

    static isHeader(filePath: string)
    {
        let dotPos = filePath.lastIndexOf('.');
        let ext = filePath.substr(dotPos);
        if (ext.includes('h') || ext.includes('hpp')) {
            return true;
        }
        return false;  
    }

    deserialize (fileContent:string)
    {
        //Parser find name space
    }

    serialize (mode: SerializableMode)
    {
        return "";
    }

    private _namespaces: cpptypes.INamespace[]; 
} 