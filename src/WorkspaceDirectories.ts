import * as path from "path";
import * as vscode from "vscode";
import { readFileSync, existsSync, Stats, stat } from "fs";
import { FSWatcher } from "chokidar";
import { IExtensionConfiguration } from "./Configuration";
import { asyncForEach } from "./utils";

const RELATIVE_ROOT = "." + path.sep;

function addEndingSlashToPath(dirPath: string): string {
  return dirPath.endsWith(path.sep) ? dirPath : dirPath + path.sep;
}
export class DirectoryItem implements vscode.QuickPickItem {
  public readonly label: string;
  public readonly description: string;
  constructor(
    public readonly absolutePath: string,
    public readonly rootDir: string
  ) {
    this.label = addEndingSlashToPath(
      RELATIVE_ROOT + path.relative(rootDir, absolutePath)
    );

    this.description = rootDir;
  }
}

export class GoBackItem implements vscode.QuickPickItem {
  public readonly label: string = "..";
  public readonly description: string = "Go back";
  public alwaysShow = true;
  goBack(childPath: string): string {
    const parentPath =
      childPath === RELATIVE_ROOT
        ? childPath
        : RELATIVE_ROOT + path.join(childPath, "..");
    return addEndingSlashToPath(parentPath);
  }
}
export class WorkspaceDirectoryFinder {
  constructor(private readonly _config: IExtensionConfiguration) {
    this._workSpaceFoldersChangedSubscription =
      vscode.workspace.onDidChangeWorkspaceFolders(
        this.workSpaceFoldersChanged.bind(this)
      );
  }

  async scan(): Promise<void> {
    const workspaceRootDirectories = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders.map((f) => f.uri.fsPath)
      : [process.cwd()];

    return asyncForEach(workspaceRootDirectories, async (rootDirectory) =>
      this.registerRootDirectory(rootDirectory)
    );
  }

  getDirectories(): DirectoryItem[] {
    return this._workspaceDirectories;
  }

  getRootDirectories(): string[] {
    return Array.from(this._workspaceRootDirectoryWatchers.keys());
  }

  private parseGitIgnore(rootDirectory: string) {
    const pathToGitIgnore = path.resolve(rootDirectory, ".gitignore");
    if (!existsSync(pathToGitIgnore)) {
      return "";
    }
    return readFileSync(pathToGitIgnore, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length && !line.startsWith("!"));
  }

  private async registerRootDirectory(rootDirectory: string) {
    try {
      const watcher = await this.createNewDirectoryWatcher(rootDirectory);
      this._workspaceRootDirectoryWatchers.set(rootDirectory, watcher);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to scan directory ${rootDirectory}: ${error}`
      );
    }
  }

  private async unregisterRootDirectory(rootDirectory: string) {
    const watcher = this._workspaceRootDirectoryWatchers.get(rootDirectory);
    if (watcher) {
      await watcher.close();
      this._workspaceRootDirectoryWatchers.delete(rootDirectory);
    }
    this._workspaceDirectories = this._workspaceDirectories.filter(
      (directoryItem) => directoryItem.rootDir !== rootDirectory
    );
  }

  private async createNewDirectoryWatcher(rootDirectory: string) {
    const relIgnoredPaths =
      this._config.outputDirectorySelector.ignoredDirectories;
    if (this._config.outputDirectorySelector.useGitIgnore) {
      relIgnoredPaths.push(...this.parseGitIgnore(rootDirectory));
    }
    const absIgnoredPaths = relIgnoredPaths.map((ignoredDirectory) =>
      path.resolve(rootDirectory, ignoredDirectory)
    );

    const ignoreFiles = (path: string, stats?: Stats) => {
      if (stats?.isFile()) {
        return true;
      }
      return false;
    };
    const newWatcher = new FSWatcher({
      ignorePermissionErrors: true,
      ignoreInitial: false,
      followSymlinks: true,
      persistent: true,
      ignored: [ignoreFiles, ...absIgnoredPaths],
      depth: 100,
    });
    newWatcher.on("addDir", this.onDirectoryAdded.bind(this, rootDirectory));
    newWatcher.on("unlinkDir", this.onDirectoryRemoved.bind(this));
    const readyPromise = new Promise<FSWatcher>((resolve, reject) => {
      newWatcher.on("ready", () => resolve(newWatcher));
      newWatcher.on("error", (error) => reject(error));
    });

    newWatcher.add(rootDirectory);
    return readyPromise;
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
    await asyncForEach(
      event.added.map((wsFolder) => wsFolder.uri.fsPath),
      (rootDirectory) => this.registerRootDirectory(rootDirectory)
    );
    await asyncForEach(
      event.removed.map((wsFolder) => wsFolder.uri.fsPath),
      async (rootDirectory) => this.unregisterRootDirectory(rootDirectory)
    );
  }

  private _workSpaceFoldersChangedSubscription: vscode.Disposable;
  private _workspaceRootDirectoryWatchers: Map<string, FSWatcher> = new Map();
  private _workspaceDirectories: DirectoryItem[] = [];
}
