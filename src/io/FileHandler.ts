
import { SerializableMode, ISerializable, IDeserializable } from "./ISerial";
import { workspaceDirectoryParser } from "./WorkspaceDirectories";
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

class DirectoryItem implements vscode.QuickPickItem {

	label: string;
	description: string;
	constructor(public readonly absolutePath: string, public readonly rootDir: string) {
		this.label = "." + path.sep + path.relative(rootDir, absolutePath);
		this.description = rootDir;
	}
}

export class FileHandler
{
    constructor(private readonly file: IFile) {
        
    }

    writeFileAs(fileBaseName:string, ...modes:SerializableMode[]) {
        return this.showDirectoryQuickPick(this.file.directory).then((directory) => {
            if (!directory) {
                throw Error("No output directory was provided!");
            }
            const promises: Promise<void | vscode.TextEditor>[] = [];
            modes.forEach(mode => {
                promises.push(this.serializeTryWrite(fileBaseName, directory, mode));
            });
            return Promise.all(promises);
        });
    }
    
    async showDirectoryQuickPick(defaultValue:string = ""): Promise<string | undefined> {
		const disposables: vscode.Disposable[] = [];
		try {
			return await new Promise<string | undefined>((resolve, reject) => {

                const workspaceDirs = workspaceDirectoryParser.getDirectories();
                const workspaceRootDirs = workspaceDirectoryParser.getRootDirectories();

				const quickPickInput = vscode.window.createQuickPick<DirectoryItem>();
                quickPickInput.placeholder = 'Select output directory...';
                quickPickInput.items = workspaceDirs; //TODO large directories
				if (path.isAbsolute(defaultValue)) {
					for (let index = 0; index < workspaceRootDirs.length; index++) {
						const rootDir = workspaceRootDirs[index];
						if (defaultValue.startsWith(rootDir)) {
							quickPickInput.value = (new DirectoryItem(defaultValue, rootDir)).label;
							break;
						}
					}
				} else {
					quickPickInput.value = defaultValue;
				}
				
				disposables.push(
					quickPickInput. onDidChangeValue(value => {return value;}),
					quickPickInput.onDidChangeSelection(items => {
						const item = items[0];
						resolve(item.absolutePath);
						quickPickInput.hide();
					}),
					quickPickInput.onDidHide(() => {
						resolve(undefined);
						quickPickInput.dispose();
					})
				);
				quickPickInput.show();
			});
		} catch (error) {
			console.error("Could not parse directory: ", error.message);
		} finally {
			disposables.forEach(d => d.dispose());
		}
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