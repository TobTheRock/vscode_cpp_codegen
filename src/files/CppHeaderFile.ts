import {FileBase} from "./FileBase"
import {IDeserializable} from "../io/ISerial";
import {Namespace} from "../cpptypes/Namespace";


import * as path from 'path';
import { inherits } from "util";

export class CppHeaderFile extends FileBase
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
    private _namespaces: Namespace[]; 
} 