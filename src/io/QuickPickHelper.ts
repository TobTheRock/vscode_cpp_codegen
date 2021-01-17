
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

async function getDirectoriesRecursivly(startDirectory: string):Promise<string[]> {
	const dirents = await fs.promises.readdir(startDirectory, { withFileTypes: true });
	const dirs = await Promise.all(dirents
		.filter(dirent => dirent.isDirectory())
		.map((dirent) => {
			const absolutPath = path.resolve(startDirectory, dirent.name);
			return getDirectoriesRecursivly(absolutPath);
			}));
	const flattendDirs = Array.prototype.concat(...dirs);
	flattendDirs.push(startDirectory);
	return flattendDirs;
}

class DirectoryItem implements vscode.QuickPickItem {

	label: string;
	description: string;
	constructor(public readonly absolutePath: string, public readonly rootDir: string) {
		this.label = "." + path.sep + path.relative(rootDir, absolutePath);
		this.description = rootDir;
	}
}

class QuickPickHelper {
	constructor() {
		this._workSpaceFoldersChangedSubscription =
			vscode.workspace.onDidChangeWorkspaceFolders(this.workSpaceFoldersChanged);
		this._workspaceRootDirectories = vscode.workspace.workspaceFolders ?
			vscode.workspace.workspaceFolders.map(f => f.uri.fsPath) : [process.cwd()];
		this.rescanWorkSpaceDirectoriesRecursively();
	}

	private rescanWorkSpaceDirectoriesRecursively() {
		this._workspaceDirectories = [];
		this._workspaceRootDirectories.forEach(async rootDirectory => {
			const directoryRelPaths = await getDirectoriesRecursivly(rootDirectory);
			this._workspaceDirectories.push(
				...directoryRelPaths.map((relPath) => {
					return new DirectoryItem(relPath, rootDirectory);
				})
			);
		});
	}

	private workSpaceFoldersChanged(event:vscode.WorkspaceFoldersChangeEvent) {
		event.added.map((wsFolder) => { return wsFolder.uri.fsPath; }).forEach((folderPath) => {
			this._workspaceRootDirectories.push(folderPath);
		});
		
		event.removed.map((wsFolder) => {return wsFolder.uri.fsPath;}).forEach((folderPath) => {
			this._workspaceRootDirectories = this._workspaceRootDirectories.filter(rootDir => rootDir !== folderPath);
		});

		this.rescanWorkSpaceDirectoriesRecursively();
	}

	async showDirectoryQuickPick(prompt:string, defaultValue:string = ""): Promise<string | undefined> {
		const disposables: vscode.Disposable[] = [];
		try {
			return await new Promise<string | undefined>((resolve, reject) => {

				const quickPickInput = vscode.window.createQuickPick<DirectoryItem>();
				quickPickInput.placeholder = 'Type to search for directories';
				quickPickInput.title = prompt;
				quickPickInput.items = this._workspaceDirectories; //TODO large directories
				if (path.isAbsolute(defaultValue)) {
					for (let index = 0; index < this._workspaceRootDirectories.length; index++) {
						const rootDir = this._workspaceRootDirectories[index];
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

	private _workSpaceFoldersChangedSubscription: vscode.Disposable;
	private _maxQuickPickItems = 20; 
	private _workspaceRootDirectories: string[];
	private _workspaceDirectories: DirectoryItem[] = [];
}
const quickPickHelper = new QuickPickHelper();
export {quickPickHelper};