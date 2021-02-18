import { INamespace} from "./TypeInterfaces";
import {HeaderParser} from "../io/HeaderParser";
import * as io from '../io';
import {FileBase} from './FileBase';
import { INameInputProvider } from "../INameInputProvider";
import { Configuration } from "../Configuration";
import { IFile } from "../FileHandler";

export class HeaderFile extends FileBase implements IFile
{
    constructor(filePath:string, content: string, nameInputProvider?: INameInputProvider)
    {
        super(filePath);
        this._namespaces = [];
        this._nameInputProvider = nameInputProvider;
        this.deserialize(io.TextFragment.createFromString(content));
    }

    deserialize (fileContent: io.TextFragment)
    {
        HeaderParser.parseComments(fileContent);
        this._namespaces.push(...HeaderParser.parseNamespaces(fileContent, this._nameInputProvider));
        this._namespaces.push(...HeaderParser.parseNoneNamespaces(fileContent, this._nameInputProvider));
    }

    serialize (mode: io.SerializableMode)
    {
        return io.serializeArray(this._namespaces, mode);
    }

    static generateFileHeader(outputFilePath: string, ...fileIncludePaths: string[]):string {
        let fileHeader = Configuration.getFileHeaderForCppHeader();
        fileHeader += "#pragma once\n\n"; // TODO config for include guards
        fileHeader += super.createIncludeStatements(outputFilePath, ...fileIncludePaths);
        return fileHeader; 
    }

    private readonly _namespaces:INamespace[];
    private _nameInputProvider: INameInputProvider | undefined;
}