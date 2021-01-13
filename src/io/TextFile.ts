
import * as path from 'path';
import {SerializableMode} from "./ISerial";
import * as cpp from "../cpp";
import * as vscode from 'vscode';
import * as fs from "fs";

export class TextFile
{
    private constructor(public readonly filePath:string, private readonly cppFile:cpp.IFile) {
        this.directory = path.dirname(filePath);
        this.ext = filePath.split('.').slice(-1)[0];
        this.basename = path.basename(filePath, "."+this.ext);
    }

    static createFromHeaderFile(textDocument:vscode.TextDocument) {
        // TODO check extension?
        const cppHeader = new cpp.HeaderFile(textDocument.getText());
        return new TextFile(textDocument.fileName, cppHeader);
    }

    writeAs (mode:SerializableMode) {
        let deductedFilename = this.deduceOutputFilename(mode);

        vscode.window.showInputBox({
            "prompt":"Output path of generated source file:",
            "value":deductedFilename
        }).then( input => {
            if (input?.length) {
                return input as string;
            } else {
                vscode.window.showWarningMessage("No path was provided!");
                throw Error("");
            }
        }).then((outputFilepath)=> {
            // TODO file header => Config
            if (!fs.existsSync(outputFilepath)) {
                //TODO pretify output (configurable?)
                const outputContent = this.generateFileHeader(mode, outputFilepath) + this.cppFile.serialize(mode);
                fs.writeFileSync(outputFilepath, outputContent, 'utf-8');
            }
            else {
                //TODO vscode.commands.executeCommand vscode.diff
                vscode.window.showWarningMessage("Merging files is not implemented yet"); //TODO implement me
                throw Error("");
            }

            vscode.window.showTextDocument(vscode.Uri.file(outputFilepath));
        });
    }

    private deduceOutputFilename(mode:SerializableMode):string {
        let deductedFilename = path.join(this.directory, this.basename);        
        switch (mode) {
            // TODO make file endings configurable
            case SerializableMode.Header:
            case SerializableMode.InterfaceHeader:
            case SerializableMode.ImplHeader:
                deductedFilename += ".hpp"; 
            case SerializableMode.Source:
            case SerializableMode.ImplSource:    
                deductedFilename += ".cpp"; 
            break;
        }
        return deductedFilename;
    }

    private generateFileHeader(mode:SerializableMode, outputFilepath:string):string {
        let fileHeader = "";        
        switch (mode) {
            case SerializableMode.Header:
            case SerializableMode.InterfaceHeader:
            case SerializableMode.ImplHeader:
                break;
            case SerializableMode.Source:
            case SerializableMode.ImplSource:    
                let relFilePath = path.relative(path.dirname(outputFilepath), this.directory);
                relFilePath = path.join(relFilePath, this.basename + "." + this.ext);
                // TODO make file header customizable (e.g licence)
                fileHeader += "#include \"" + relFilePath + "\"\n\n";
            break;
        }
        return fileHeader;
    }

    readonly directory:string;
    readonly basename:string;
    readonly ext:string;
}