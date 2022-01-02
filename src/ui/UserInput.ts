import { awaitMapEntries } from "../utils";
import * as cpp from "../cpp";
import * as io from "../io";
import * as vscode from "vscode";
import { WorkspaceDirectoryFinder } from "./WorkspaceDirectories";
import { IExtensionConfiguration } from "../Configuration";
import { DirectoryPicker } from "./DirectoryPicker";
import { InterfaceNamePicker, FileNamePicker } from "./InputBoxPickers";
import { NamePattern } from "../NamePattern";

export const USER_INPUT_TITLE = "Creating Stubs...";

export interface UserInputPrompt {
  prompt(step: number, nTotalSteps: number): Promise<void>;
}

export interface UserInputReturn<ReturnType> {
  resolve: (value: ReturnType | PromiseLike<ReturnType>) => void;
}

class UserInputPromptRegistry<ReturnType> {
  private _inputPrompts: UserInputPrompt[] = [];

  registerElement(
    elementType: new (
      UserInputReturn: UserInputReturn<ReturnType>,
      ...args: any
    ) => UserInputPrompt,
    ...args: any
  ): Promise<ReturnType> {
    return new Promise<ReturnType>((resolve) => {
      const element = new elementType({ resolve }, ...args);
      this._inputPrompts.push(element);
    });
  }

  async promptAll(): Promise<void> {
    const nTotalSteps = this._inputPrompts.length;
    for (let index = 0; index < this._inputPrompts.length; index++) {
      const input = this._inputPrompts[index];
      await input.prompt(index + 1, nTotalSteps);
    }

    this._inputPrompts = [];
  }
}

interface IImplementationNameHelper {
  get firstImplementationName(): Promise<string> | undefined;
}

class ImplementationNameHelper
  implements IImplementationNameHelper, io.INameInputProvider
{
  private _firstImplementationName: Promise<string> | undefined;
  private _onFirstCallPromise: Promise<IImplementationNameHelper>;
  private _resolveOnFirstCall:
    | ((value: IImplementationNameHelper) => void)
    | undefined;

  constructor(
    private readonly _implNameProviderClosure: (
      origName: string
    ) => Promise<string>
  ) {
    this._onFirstCallPromise = new Promise<IImplementationNameHelper>(
      (resolve) => {
        this._resolveOnFirstCall = resolve;
      }
    );
  }

  getImplementationName(origName: string): string | Promise<string> {
    const implNamePromise = this._implNameProviderClosure(origName);
    if (this._resolveOnFirstCall) {
      this._firstImplementationName = implNamePromise;
      this._resolveOnFirstCall(this);
      this._resolveOnFirstCall = undefined;
    }
    return implNamePromise;
  }

  get onFirstCall(): Promise<IImplementationNameHelper> {
    return this._onFirstCallPromise;
  }

  get firstImplementationName(): Promise<string> | undefined {
    return this._firstImplementationName;
  }
}

export interface IUserInput {
  outputDirectory: vscode.Uri;
  fileNameMap: Map<io.SerializableMode, string>;
}

export class UserDialog {
  private readonly _inputPromptRegistry = new UserInputPromptRegistry<any>();
  private readonly _namePattern;

  constructor(
    private readonly _file: cpp.IFile,
    private readonly _workspaceDirectoryFinder: WorkspaceDirectoryFinder,
    private readonly _config: IExtensionConfiguration
  ) {
    this._namePattern = new NamePattern(this._config);
  }

  async prompt(modes: io.SerializableMode[]): Promise<IUserInput> {
    const outputDirectoryPromise = this.pickOutputDirectory();
    const helper = await this.pickInterfaceImplementationNames(modes);
    const fileNamePromiseMap = this.getFileNameForMode(
      modes,
      helper?.firstImplementationName
    );

    await this._inputPromptRegistry.promptAll();
    const outputDirectory = await outputDirectoryPromise;
    const fileNameMap = await awaitMapEntries(fileNamePromiseMap);

    return { outputDirectory, fileNameMap };
  }

  private pickOutputDirectory(): Promise<vscode.Uri> {
    return this._inputPromptRegistry.registerElement(
      DirectoryPicker,
      this._workspaceDirectoryFinder,
      this._config.outputDirectorySelector.mode,
      vscode.Uri.file(this._file.directory)
    );
  }

  private pickInterfaceImplementationNames(
    modes: io.SerializableMode[]
  ): Promise<IImplementationNameHelper | undefined> {
    const helper = new ImplementationNameHelper(async (origName) => {
      const implName = this._namePattern.deduceImplementationName(origName);

      if (this._config.interface.deduceImplementationName && implName) {
        return implName;
      }

      return this._inputPromptRegistry.registerElement(
        InterfaceNamePicker,
        origName,
        implName
      );
    });

    const namesProvidePromise = this._file.rootNamespace
      .provideNames(helper, ...modes)
      .then(() => undefined);

    return Promise.race([namesProvidePromise, helper.onFirstCall]);
  }

  private getFileNameForMode(
    modes: io.SerializableMode[],
    firstImplementationNamePromise?: Promise<string>
  ): Map<io.SerializableMode, Promise<string>> {
    const fileNameMap = new Map<io.SerializableMode, Promise<string>>();

    for (const mode of modes) {
      if (!fileNameMap.has(mode)) {
        const fileNamePromise = this.pickFileName(
          mode,
          firstImplementationNamePromise
        );
        io.getSerializableModeGroup(mode).forEach((groupMode) =>
          fileNameMap.set(groupMode, fileNamePromise)
        );
      }
    }

    return fileNameMap;
  }

  private pickFileName(
    mode: io.SerializableMode,
    firstImplementationNamePromise?: Promise<string>
  ): Promise<string> {
    const isImplMode =
      mode === io.SerializableMode.implSource ||
      mode === io.SerializableMode.implHeader;
    const cannotDeduce = isImplMode && !firstImplementationNamePromise;

    if (!this._config.deduceOutputFileNames || cannotDeduce) {
      return this._inputPromptRegistry.registerElement(
        FileNamePicker,
        this._file.basename
      );
    } else if (isImplMode) {
      return firstImplementationNamePromise!;
    } else {
      return Promise.resolve(this._file.basename);
    }
  }
}
