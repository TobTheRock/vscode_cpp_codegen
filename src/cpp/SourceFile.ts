

import { INamespace} from "./TypeInterfaces";
import {FileBase} from './FileBase';
import * as io from '../io';

import { Configuration } from "../Configuration";
import { IFile } from "../FileHandler";

export class SourceFile extends FileBase
{
    constructor(filePath:string, content: string)
    {
        super(filePath);
        const fileContent = io.TextFragment.createFromString(content);
        io.SourceParser.parseComments(fileContent);
        this._signatures = io.SourceParser.parseSignatures(fileContent);
    }

    static generateFileHeader(outputFilePath: string, ...fileIncludePaths: string[]):string {
        let fileHeader = Configuration.getFileHeaderForCppSource();
        fileHeader += super.createIncludeStatements(outputFilePath, ...fileIncludePaths);
        return fileHeader; 
    }

    getSignatures(): io.ISignaturable[] {
        return this._signatures;
    }

    private readonly _signatures: io.ISignaturable[];
} 