import * as path from 'path';
import { INamespace, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import * as io from '../io';
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

export class HeaderFile extends FileBase implements io.IFile
{
    constructor(filePath:string, content: string, nameInputProvider?: io.INameInputProvider)
    {
        super(filePath);
        this._namespaces = [];
        this._nameInputProvider = nameInputProvider;
        this.deserialize(io.TextFragment.createFromString(content));
    }

    deserialize (fileContent: io.TextFragment)
    {
        //TODO remove comments
        this._namespaces.push(...Parser.parseNamespaces(fileContent, this._nameInputProvider));
        this._namespaces.push(...Parser.parseNoneNamespaces(fileContent, this._nameInputProvider));
    }

    serialize (mode: SerializableMode)
    {
        return io.serializeArray(this._namespaces, mode);
    }

    private readonly _namespaces:INamespace[];
    private _nameInputProvider: io.INameInputProvider | undefined;
}

export class SourceFile extends FileBase implements io.IFile
{
    constructor(filePath:string, content: string)
    {
        super(filePath);
        this._namespaces = [];
        this.deserialize(io.TextFragment.createFromString(content));
    }

    deserialize (fileContent: io.TextFragment)
    {
        //TODO
    }

    serialize (mode: SerializableMode)
    {
        return io.serializeArray(this._namespaces, mode);
    }

    static readonly extensions = ["cpp","cxx", "c"]; // TODO make extensions configurable
    private readonly _namespaces: INamespace[];
} 