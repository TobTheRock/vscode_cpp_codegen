
import { SerializableMode, ISerializable, IDeserializable } from "./ISerial";
import * as cpp from '../cpp';
import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path";

export interface IFile extends ISerializable, IDeserializable {
    getPath(): string;
    readonly directory: string;
    readonly basename: string;
    readonly extension: string;
}

export class FileHandler
{
    constructor(private readonly file: IFile) {
        
    }

    writeFileAs(fileBaseName:string, ...modes:SerializableMode[]) {
        return this.askForOutputDirectoryPath(this.file.directory).then((directory) => {
            const promises = [];
            modes.forEach(mode => {
                promises.push(this.serializeTryWrite(fileBaseName, directory, mode));
            });
        });
    }

    private askForOutputDirectoryPath(defaultDirectoryPath: string = ""): Thenable<string> {
        return vscode.window.showInputBox({
            "prompt": "Output directory of generated file(s):",
            "value": defaultDirectoryPath
        }).then(input => {
            if (!input?.length) {
                throw Error("No input path was provided!");
            } else if (!fs.existsSync(input) || !fs.lstatSync(input).isDirectory()) {
                throw Error("Directory does not exists!");
            }
            else {
                return input as string;
            }
        }).then((input) => {
            return input;
        },
            (error: Error) => {
                vscode.window.showWarningMessage(error.message);
        });
    }

    private writeAndOpenFile (outputFilePath:string, content:string) {
        return vscode.workspace.fs.writeFile(vscode.Uri.parse(outputFilePath), Buffer.from(content, 'utf8')).then(
            () => {
                return vscode.window.showTextDocument(vscode.Uri.file(outputFilePath));        
            },
            (error: Error) => {
                vscode.window.showErrorMessage(error.message);
            }
        );
    }

    private serializeTryWrite(fileBaseName:string, directory:string, mode:SerializableMode) {
        const outputFilePath = path.join(directory, this.deduceOutputFilename(fileBaseName, mode)); // TODO make file extensions configurable
        
        return new Promise<string>((resolve, reject) => {
            if (!fs.existsSync(outputFilePath)) {
                //TODO pretify output (configurable?)
                const outputContent = this.generateFileHeader(mode, outputFilePath) + this.file.serialize(mode);
                resolve(outputContent);
            }
            else {
                //TODO implement me, parse source -> show diff!
                 reject(Error("Merging files is not implemented yet"));
            }
        }).then((outputContent) => {
			return this.writeAndOpenFile(outputFilePath, outputContent);
		},
			(error: Error) => {
					vscode.window.showErrorMessage("For file: '" + outputFilePath + "'\n: Could not create content! " + error.message);
			}
        );   
    }

    private deduceOutputFilename(fileBaseName:string, mode:SerializableMode):string {
        let deductedFilename = fileBaseName;        
        switch (mode) {
            // TODO make file endings configurable
            case SerializableMode.header:
            case SerializableMode.interfaceHeader:
            case SerializableMode.implHeader:
                deductedFilename += ".hpp";
                break;
            case SerializableMode.source:
            case SerializableMode.implSource:    
                deductedFilename += ".cpp"; 
            break;
        }
        return deductedFilename;
    }

    private generateFileHeader(mode:SerializableMode, outputFilePath:string):string {
        let fileHeader = "";        
        switch (mode) {
            case SerializableMode.header:
            case SerializableMode.interfaceHeader:
                fileHeader = cpp.HeaderFile.generateFileHeader(outputFilePath, "");
                break;
            case SerializableMode.implHeader:
                fileHeader = cpp.HeaderFile.generateFileHeader(outputFilePath, this.file.getPath());
                break;
            case SerializableMode.source:
                fileHeader = cpp.SourceFile.generateFileHeader(outputFilePath, this.file.getPath());
                break;
            case SerializableMode.implSource:
                // TODO find a nicer way to provide the path of the header path
                const headerOutputFilePath = path.join(path.dirname(outputFilePath), this.deduceOutputFilename(path.basename(outputFilePath, ".cpp"), SerializableMode.header));
                fileHeader = cpp.SourceFile.generateFileHeader(outputFilePath, headerOutputFilePath);
            break;
        }
        return fileHeader;
    }
}