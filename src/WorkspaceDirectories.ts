import * as path from "path";
import * as vscode from "vscode";
import { readFileSync } from "fs";
import { FSWatcher } from "chokidar";
import { Configuration } from "./Configuration";

class DirectoryItem implements vscode.QuickPickItem {
  label: string;
  description: string;
  constructor(
    public readonly absolutePath: string,
    public readonly rootDir: string
  ) {
    this.label =
      "." + path.sep + path.relative(rootDir, absolutePath) + path.sep;
    this.description = rootDir;
  }
}
class WorkspaceDirectoryFinder {
  constructor() {
    this._workSpaceFoldersChangedSubscription = vscode.workspace.onDidChangeWorkspaceFolders(
      this.workSpaceFoldersChanged.bind(this)
    );

    const workspaceRootDirectories = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders.map((f) => f.uri.fsPath)
      : [process.cwd()];

    this._workspaceRootDirectoryWatchers = new Map(
      workspaceRootDirectories.map((rootDirectory) => [
        rootDirectory,
        this.createNewDirectoryWatcher(rootDirectory),
      ])
    );
  }

  getDirectories(): DirectoryItem[] {
    return this._workspaceDirectories;
  }

  getRootDirectories(): string[] {
    return Array.from(this._workspaceRootDirectoryWatchers.keys());
  }

  private parseGitIgnore(rootDirectory: string) {
    return readFileSync(path.resolve(rootDirectory, ".gitignore"), "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length && !line.startsWith("!"));
  }

  private createNewDirectoryWatcher(rootDirectory: string) {
    const relIgnoredPaths = Configuration.getOutputDirectorySelectorIgnoredDirectories();
    if (Configuration.getOutputDirectorySelectorUseGitIgnore()) {
      relIgnoredPaths.push(...this.parseGitIgnore(rootDirectory));
    }
    const absIgnoredPaths = relIgnoredPaths.map((ignoredDirectory) =>
      path.resolve(rootDirectory, ignoredDirectory)
    );

    const newWatcher = new FSWatcher({
      ignorePermissionErrors: true,
      ignoreInitial: false,
      followSymlinks: true,
      persistent: true,
      ignored: absIgnoredPaths,
      depth: 100,
    });
    newWatcher.on("addDir", this.onDirectoryAdded.bind(this, rootDirectory));
    newWatcher.on("unlinkDir", this.onDirectoryRemoved.bind(this));
    newWatcher.add(rootDirectory);
    return newWatcher;
  }

  private onDirectoryAdded(rootDirectory: string, absDirectoryPath: string) {
    this._workspaceDirectories.push(
      new DirectoryItem(absDirectoryPath, rootDirectory)
    );
  }

  private onDirectoryRemoved(absDirectoryPath: string) {
    this._workspaceDirectories = this._workspaceDirectories.filter(
      (directoryItem) => directoryItem.absolutePath !== absDirectoryPath
    );
  }

  private async workSpaceFoldersChanged(
    event: vscode.WorkspaceFoldersChangeEvent
  ) {
    event.added
      .map((wsFolder) => {
        return wsFolder.uri.fsPath;
      })
      .forEach((folderPath) => {
        this._workspaceRootDirectoryWatchers.set(
          folderPath,
          this.createNewDirectoryWatcher(folderPath)
        );
      });
    await event.removed
      .map((wsFolder) => wsFolder.uri.fsPath)
      .reduce(async (prev, folderPath) => {
        await prev;
        const watcher = this._workspaceRootDirectoryWatchers.get(folderPath);
        if (watcher) {
          await watcher.close();
          this._workspaceRootDirectoryWatchers.delete(folderPath);
        }
        this._workspaceDirectories = this._workspaceDirectories.filter(
          (directoryItem) => directoryItem.rootDir !== folderPath
        );
        return;
      }, Promise.resolve());
  }

  private _workSpaceFoldersChangedSubscription: vscode.Disposable;
  private _workspaceRootDirectoryWatchers: Map<string, FSWatcher>;
  private _workspaceDirectories: DirectoryItem[] = [];
}

const workspaceDirectoryFinder = new WorkspaceDirectoryFinder();
export { workspaceDirectoryFinder };
