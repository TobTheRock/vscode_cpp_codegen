
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

async function getDirectoriesRecursivly(startDirectory: string): Promise<string[]> {
	try {
		var dirents = await fs.promises.readdir(startDirectory, { withFileTypes: true });
	} catch {
		console.warn("Could not read directory ", startDirectory);
		return [];
	}

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


class WorkspaceDirectoryFinder {
	constructor() {
		this._workSpaceFoldersChangedSubscription =
			vscode.workspace.onDidChangeWorkspaceFolders(this.workSpaceFoldersChanged);
		this._workspaceRootDirectories = vscode.workspace.workspaceFolders ?
			vscode.workspace.workspaceFolders.map(f => f.uri.fsPath) : [process.cwd()];
		this.rescanWorkspaceDirectoriesRecursively();
	}

	getDirectories() {
		return this._workspaceDirectories;
	}

	getRootDirectories() {
		return this._workspaceRootDirectories;
	}

	private rescanWorkspaceDirectoriesRecursively() {
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

		this.rescanWorkspaceDirectoriesRecursively();
	}


	private _workSpaceFoldersChangedSubscription: vscode.Disposable;
	private _workspaceRootDirectories: string[];
	private _workspaceDirectories: DirectoryItem[] = [];
}
const workspaceDirectoryFinder = new WorkspaceDirectoryFinder();
export {workspaceDirectoryFinder};