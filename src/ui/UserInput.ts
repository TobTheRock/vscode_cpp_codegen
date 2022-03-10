import { awaitMapEntries } from "../utils";
import * as cpp from "../cpp";
import * as io from "../io";
import * as vscode from "vscode";
import { IExtensionConfiguration } from "../Configuration";
import { DirectoryPicker } from "./DirectoryPicker";
import {
  InterfaceNamePicker,
  FileNamePicker,
  AbstractFactoryNamePicker,
} from "./InputBoxPickers";
import { NamePattern } from "../NamePattern";
import { TextScope } from "../io";

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

class NameInput implements io.INameInputProvider {
  constructor(
    private readonly _config: IExtensionConfiguration,
    private readonly _inputPromptRegistry: UserInputPromptRegistry<any>,
    private readonly _namePattern: NamePattern
  ) {}

  getAbstractFactoryName(origName: string): string | Promise<string> {
    const abstractFactoryName = this._namePattern.getFactoryName(origName);

    if (this._config.abstractFactory.deduceImplementationName) {
      return abstractFactoryName;
    }

    return this._inputPromptRegistry.registerElement(
      AbstractFactoryNamePicker,
      origName,
      abstractFactoryName
    );
  }

  getImplementationName(origName: string): string | Promise<string> {
    const implName = this._namePattern.deduceImplementationName(origName);

    if (this._config.interface.deduceImplementationName && implName) {
      return implName;
    }

    return this._inputPromptRegistry.registerElement(
      InterfaceNamePicker,
      origName,
      implName
    );
  }
}

class NameInputDeducingOutputFileNames implements io.INameInputProvider {
  constructor(
    private readonly _nameInputProvider: io.INameInputProvider,
    private readonly _filePromiseMap: Map<io.SerializableMode, Promise<string>>
  ) {}
  getAbstractFactoryName(origName: string): string | Promise<string> {
    const abstractFactoryName =
      this._nameInputProvider.getAbstractFactoryName(origName);
    this.setNamePromiseForModes(
      abstractFactoryName,
      io.SerializableMode.abstractFactoryHeader
    );
    return abstractFactoryName;
  }
  getImplementationName(origName: string): string | Promise<string> {
    const implName = this._nameInputProvider.getImplementationName(origName);
    this.setNamePromiseForModes(implName, ...io.INTERFACE_IMPLEMENTATION_GROUP);
    return implName;
  }

  private setNamePromiseForModes(
    namePromise: string | Promise<string>,
    ...modes: io.SerializableMode[]
  ) {
    modes.forEach((mode) => {
      if (!this._filePromiseMap.has(mode)) {
        this._filePromiseMap.set(mode, Promise.resolve(namePromise));
      }
    });
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
    private readonly _config: IExtensionConfiguration
  ) {
    this._namePattern = new NamePattern(this._config);
  }

  async prompt(
    modes: io.SerializableMode[],
    selection?: TextScope
  ): Promise<IUserInput> {
    const outputDirectoryPromise = this.pickOutputDirectory();
    let fileNamePromiseMap = new Map<io.SerializableMode, Promise<string>>();
    const provideNamesPromise = this.provideNames(
      modes,
      fileNamePromiseMap,
      selection
    );
    fileNamePromiseMap = this.getFileNameForMode(modes, fileNamePromiseMap);

    await this._inputPromptRegistry.promptAll();
    await provideNamesPromise;
    const outputDirectory = await outputDirectoryPromise;
    const fileNameMap = await awaitMapEntries(fileNamePromiseMap);

    return { outputDirectory, fileNameMap };
  }

  private pickOutputDirectory(): Promise<vscode.Uri> {
    return this._inputPromptRegistry.registerElement(
      DirectoryPicker,
      this._config,
      vscode.Uri.file(this._file.directory)
    );
  }

  private provideNames(
    modes: io.SerializableMode[],
    fileNamePromiseMap: Map<io.SerializableMode, Promise<string>>,
    selection?: TextScope
  ): Promise<void> {
    let nameInput: io.INameInputProvider = new NameInput(
      this._config,
      this._inputPromptRegistry,
      this._namePattern
    );
    if (this._config.deduceOutputFileNames) {
      nameInput = new NameInputDeducingOutputFileNames(
        nameInput,
        fileNamePromiseMap
      );
    }
    return this._file.rootNamespace.provideNames(
      nameInput,
      selection,
      ...modes
    );
  }

  private getFileNameForMode(
    modes: io.SerializableMode[],
    fileNamePromiseMap: Map<io.SerializableMode, Promise<string>>
  ): Map<io.SerializableMode, Promise<string>> {
    for (const mode of modes) {
      if (!fileNamePromiseMap.has(mode)) {
        const fileNamePromise = this.pickFileName(mode);
        io.getSerializableModeGroup(mode).forEach((groupMode) =>
          fileNamePromiseMap.set(groupMode, fileNamePromise)
        );
      }
    }
    return fileNamePromiseMap;
  }

  private pickFileName(mode: io.SerializableMode): Promise<string> {
    if (
      this._config.deduceOutputFileNames &&
      mode === io.SerializableMode.source
    ) {
      return Promise.resolve(this._file.basename);
    }
    return this._inputPromptRegistry.registerElement(
      FileNamePicker,
      this._file.basename
    );
  }
}
