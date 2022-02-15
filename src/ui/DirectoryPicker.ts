import {
  WorkspaceDirectoryFinder,
  DirectoryItem,
  GoBackItem,
} from "./WorkspaceDirectories";
import { DirectorySelectorMode } from "../Configuration";
import {
  USER_INPUT_TITLE,
  UserInputPrompt,
  UserInputReturn,
} from "./UserInput";

import * as vscode from "vscode";

export class DirectoryPicker implements UserInputPrompt {
  constructor(
    private readonly _userInputReturn: UserInputReturn<vscode.Uri>,
    private readonly _workspaceDirectoryFinder: WorkspaceDirectoryFinder,
    private readonly _directorySelectorMode: DirectorySelectorMode,
    private readonly _initialDirectory: vscode.Uri
  ) {}

  async prompt(step: number, nTotalSteps: number): Promise<void> {
    switch (this._directorySelectorMode) {
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

  private createQuickPick(
    step: number,
    nTotalSteps: number
  ): vscode.QuickPick<DirectoryItem | GoBackItem> {
    const quickPickInput = vscode.window.createQuickPick<
      DirectoryItem | GoBackItem
    >();

    quickPickInput.placeholder = "Select output directory...";
    quickPickInput.step = step;
    quickPickInput.totalSteps = nTotalSteps;
    quickPickInput.title = USER_INPUT_TITLE;

    const workspaceRootDirs =
      this._workspaceDirectoryFinder.getRootDirectories();
    const defaultValue: string = this._initialDirectory.fsPath;
    for (const rootDir of workspaceRootDirs) {
      if (defaultValue.startsWith(rootDir)) {
        quickPickInput.value = new DirectoryItem(defaultValue, rootDir).label;
        break;
      }
    }

    const goBackItem = new GoBackItem();
    const workspaceDirs = this._workspaceDirectoryFinder.getDirectories();
    quickPickInput.items = [goBackItem, ...workspaceDirs];

    return quickPickInput;
  }

  private async showDirectoryQuickPick(step: number, nTotalSteps: number) {
    const quickPickInput = this.createQuickPick(step, nTotalSteps);

    const disposables: vscode.Disposable[] = [];
    const displayPromise = new Promise<void>(
      (displayResolve, displayReject) => {
        disposables.push(
          quickPickInput.onDidChangeSelection((items) => {
            let item = items[0];
            if (!item) {
              return;
            }

            let newLabel = item.label;
            if (item instanceof GoBackItem) {
              newLabel = item.goBack(quickPickInput.value);
            }

            if (newLabel !== quickPickInput.value) {
              quickPickInput.value = newLabel;
              const triggerFilterByResettingItems = quickPickInput.items;
              quickPickInput.items = [];
              quickPickInput.items = triggerFilterByResettingItems;
            } else if (item instanceof DirectoryItem) {
              this._userInputReturn.resolve(vscode.Uri.file(item.absolutePath));
              displayResolve();
              quickPickInput.hide();
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
