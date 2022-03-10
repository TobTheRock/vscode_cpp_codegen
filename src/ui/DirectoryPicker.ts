import {
  DirectorySelectorMode,
  IExtensionConfiguration,
} from "../Configuration";
import {
  USER_INPUT_TITLE,
  UserInputPrompt,
  UserInputReturn,
} from "./UserInput";

import * as vscode from "vscode";
import anymatch, { Matcher } from "anymatch";
import { config } from "process";

export class DirectoryItem implements vscode.QuickPickItem {
  public readonly label: string;
  // public readonly description: string;
  constructor(public readonly path: vscode.Uri, name: string) {
    this.label = name;
  }
}

export class GoBackItem implements vscode.QuickPickItem {
  public readonly label: string = "..";
  public readonly description: string = "Go back";
  public alwaysShow = true;
  constructor(public readonly parentPath: vscode.Uri) {}
  goBack(): vscode.Uri {
    return vscode.Uri.joinPath(this.parentPath, "..");
  }
}

export class CurrentDirectoryItem implements vscode.QuickPickItem {
  public readonly label: string = ".";
  public readonly description: string = "Current directory";
  public alwaysShow = true;
  constructor(public readonly path: vscode.Uri) {}
}

type QuickPickItems = DirectoryItem | GoBackItem | CurrentDirectoryItem;

class SubDirectoryFinder {
  private _ignoredDirectoryMatchers: string[] = [];
  private constructor(private _config: IExtensionConfiguration) {}
  static async create(
    config: IExtensionConfiguration
  ): Promise<SubDirectoryFinder> {
    const subDirectoryFinder = new SubDirectoryFinder(config);
    await subDirectoryFinder.initializeIgnoredDirectories();
    return subDirectoryFinder;
  }

  async getSubDirectoryItems(
    parentDirectory: vscode.Uri
  ): Promise<DirectoryItem[]> {
    let contents;
    try {
      contents = await vscode.workspace.fs.readDirectory(parentDirectory);
    } catch {
      return [];
    }
    return contents
      .filter(([_, fileType]) => fileType === vscode.FileType.Directory)
      .map(([name, _]) => {
        const uri = vscode.Uri.joinPath(parentDirectory, name);
        return new DirectoryItem(uri, name);
      })
      .filter(
        (directoryItem: DirectoryItem) =>
          !anymatch(this._ignoredDirectoryMatchers, directoryItem.path.fsPath)
      );
  }

  private async initializeIgnoredDirectories() {
    const ignoredDirectories = [];
    for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
      ignoredDirectories.push(
        ...(await this.getIgnoredPaths(workspaceFolder.uri))
      );
    }
    this._ignoredDirectoryMatchers = ignoredDirectories.map(
      (dir) => dir.fsPath
    );
  }

  private async getIgnoredPaths(
    rootDirectory: vscode.Uri
  ): Promise<vscode.Uri[]> {
    const relIgnoredPaths =
      this._config.outputDirectorySelector.ignoredDirectories;
    const absIgnoredPaths = relIgnoredPaths.map((ignoredDirectory) =>
      vscode.Uri.joinPath(rootDirectory, ignoredDirectory)
    );

    if (this._config.outputDirectorySelector.useGitIgnore) {
      absIgnoredPaths.push(
        ...(await this.getIgnoredPathsFromGitIgnore(rootDirectory))
      );
    }
    return absIgnoredPaths;
  }

  private async getIgnoredPathsFromGitIgnore(
    rootDirectory: vscode.Uri
  ): Promise<vscode.Uri[]> {
    const pathToGitIgnore = vscode.Uri.joinPath(rootDirectory, ".gitignore");

    let textDocument;
    try {
      textDocument = await vscode.workspace.openTextDocument(pathToGitIgnore);
    } catch {
      return [];
    }

    return textDocument
      .getText()
      ?.split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length && !line.startsWith("!"))
      .map((line) => vscode.Uri.joinPath(rootDirectory, line));
  }
}
export class DirectoryPicker implements UserInputPrompt {
  private _subDirectoryFinder: SubDirectoryFinder | undefined;
  constructor(
    private readonly _userInputReturn: UserInputReturn<vscode.Uri>,
    private readonly _config: IExtensionConfiguration,
    private readonly _initialDirectory: vscode.Uri
  ) {}

  async prompt(step: number, nTotalSteps: number): Promise<void> {
    switch (this._config.outputDirectorySelector.mode) {
      case DirectorySelectorMode.quickPick:
        await this.showDirectoryQuickPick(step, nTotalSteps);
        break;

      case DirectorySelectorMode.ui:
        await this.showDirectoryOpenDialogue();
        break;

      case DirectorySelectorMode.disabled:
      default:
        this._userInputReturn.resolve(this._initialDirectory);
    }
  }

  private async showDirectoryOpenDialogue() {
    return vscode.window
      .showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        defaultUri: this._initialDirectory,
        openLabel: "Select",
        title: "Select an output directory",
      })
      .then((uris) => {
        if (uris?.length) {
          this._userInputReturn.resolve(uris[0]);
        } else {
          throw new Error("No output directory was selected!");
        }
      });
  }

  private async createQuickPick(
    step: number,
    nTotalSteps: number
  ): Promise<vscode.QuickPick<QuickPickItems>> {
    const quickPickInput = vscode.window.createQuickPick<QuickPickItems>();

    quickPickInput.placeholder = "Select output directory...";
    quickPickInput.step = step;
    quickPickInput.totalSteps = nTotalSteps;
    quickPickInput.title = USER_INPUT_TITLE;

    this.resetQuickPick(this._initialDirectory, quickPickInput);

    return quickPickInput;
  }

  private async resetQuickPick(
    directory: vscode.Uri,
    quickPickInput: vscode.QuickPick<QuickPickItems>
  ) {
    const goBackItem = new GoBackItem(directory);
    const currentDirectoryItem = new CurrentDirectoryItem(directory);

    if (!this._subDirectoryFinder) {
      this._subDirectoryFinder = await SubDirectoryFinder.create(this._config);
    }
    let workspaceDirs = await this._subDirectoryFinder.getSubDirectoryItems(
      directory
    );

    quickPickInput.items = [goBackItem, currentDirectoryItem, ...workspaceDirs];
    const fsPath = directory.fsPath;
    quickPickInput.value = "";
    quickPickInput.placeholder = fsPath;
    quickPickInput.activeItems = [currentDirectoryItem];
  }

  private async showDirectoryQuickPick(step: number, nTotalSteps: number) {
    const quickPickInput = await this.createQuickPick(step, nTotalSteps);

    const disposables: vscode.Disposable[] = [];

    const displayPromise = new Promise<void>(
      (displayResolve, displayReject) => {
        disposables.push(
          quickPickInput.onDidChangeSelection(async (items) => {
            let item = items[0];
            if (!item) {
              return;
            }

            if (item instanceof GoBackItem) {
              const newPath = item.goBack();
              await this.resetQuickPick(newPath, quickPickInput);
            } else if (item instanceof CurrentDirectoryItem) {
              this._userInputReturn.resolve(item.path);
              displayResolve();
              quickPickInput.hide();
            } else if (item instanceof DirectoryItem) {
              await this.resetQuickPick(item.path, quickPickInput);
            }
          }),
          quickPickInput.onDidHide(() => {
            const msg = "No output directory was selected!";
            displayReject(new Error(msg));
            quickPickInput.dispose();
          })
        );
      }
    );

    quickPickInput.show();

    try {
      await displayPromise;
    } finally {
      disposables.forEach((d) => d.dispose());
    }
  }
}
