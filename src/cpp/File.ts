import * as path from 'path';
import * as vscode from 'vscode';
import { INamespace, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import {TextFragment, IFile, serializeArray } from "../io";

class FileBase {
    protected constructor(filePath:string) {
        this.directory = path.dirname(filePath);
        this.extension = filePath.split('.').slice(-1)[0];
        this.basename = path.basename(filePath, "."+this.extension);
    }

    getPath(): string {
        return path.join(this.directory, this.basename) + "." + this.extension;
    }

    static generateFileHeader(outputFilePath: string, ...fileIncludePaths: string[]):string {
        let fileHeader = "";
        fileIncludePaths.forEach(include => {
            let relFilePath = path.relative(path.dirname(outputFilePath), path.dirname((include)));
            relFilePath = path.join(relFilePath, path.basename(include));            
            fileHeader += "#include \"" + relFilePath + "\"\n";
        });
        fileHeader += "\n";

        // TODO make file header customizable (e.g licence)

        return fileHeader; 
    }

    readonly directory: string;
    readonly basename: string;
    readonly extension: string;
}

export class HeaderFile extends FileBase implements IFile
{
    constructor(filePath:string, content: string)
    {
        super(filePath);
        this._namespaces = [];
        this.deserialize(TextFragment.createFromString(content));
    }

    deserialize (fileContent:TextFragment)
    {
        //TODO remove comments
        this._namespaces.push(...Parser.parseNamespaces(fileContent));
        this._namespaces.push(...Parser.parseNoneNamespaces(fileContent));
    }

    serialize (mode: SerializableMode)
    {
        let serial = "";
        serial += serializeArray(this._namespaces, mode);
        return serial;
    }

    private readonly _namespaces:INamespace[];
}

export class SourceFile extends FileBase implements IFile
{
    constructor(filePath:string, content: string)
    {
        super(filePath);
        this._namespaces = [];
        this.deserialize(TextFragment.createFromString(content));
    }

    deserialize (fileContent:TextFragment)
    {
        //TODO
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