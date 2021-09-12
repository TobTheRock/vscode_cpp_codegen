import {
  WorkspaceDirectoryFinder,
  DirectoryItem,
  GoBackItem,
} from "./WorkspaceDirectories";
import { SourceFileMerger } from "./SourceFileMerger";
import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import * as ui from "./ui";
import * as path from "path";
import {
  IExtensionConfiguration,
  DirectorySelectorMode,
  RefactoringPreview,
} from "./Configuration";
import { asyncForEach, awaitMapEntries } from "./utils";
import { flatten, compact } from "lodash";
import { resolve } from "dns";
import { HeaderFileMerger } from "./HeaderFileMerger";
import { FileMergerOptions } from "./CommonFileMerger";

interface SerializedContent {
  mode: io.SerializableMode;
  outputUri: vscode.Uri;
  content: string;
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

export class HeaderFileHandler {
  private _userInput: ui.UserInput;
  private _disableRemoveOnMerge = false;

  constructor(
    private readonly _headerFile: cpp.HeaderFile,
    private readonly _edit: vscode.WorkspaceEdit,
    private readonly _workspaceDirectoryFinder: WorkspaceDirectoryFinder,
    private readonly _config: IExtensionConfiguration
  ) {
    this._userInput = new ui.UserInput();
  }

  async writeFileAs(...modes: io.SerializableMode[]) {
    await this._writeFileAs(modes);
  }

  async writeFileSelectionAs(
    selection: io.TextScope,
    ...modes: io.SerializableMode[]
  ) {
    this._disableRemoveOnMerge = true;
    await this._writeFileAs(modes, selection);
  }

  private async _writeFileAs(
    modes: io.SerializableMode[],
    selection?: io.TextScope
  ) {
    const outputDirectoryPromise = this.pickOutputDirectory();
    const helper = await this.pickInterfaceImplementationNames(modes);
    const fileNamePromiseMap = this.getFileNameForMode(
      modes,
      helper?.firstImplementationName
    );

    await this._userInput.prompt();
    const outputDirectory = await outputDirectoryPromise;
    const fileNameMap = await awaitMapEntries(fileNamePromiseMap);

    const outputContent = this.serializeContent(
      modes,
      outputDirectory,
      fileNameMap,
      selection
    );
    if (!outputContent.length) {
      vscode.window.showWarningMessage(
        "Nothing was generated, please check for typos."
      );
      return;
    }

    await this.writeNewContent(outputContent, selection);
    await vscode.workspace.applyEdit(this._edit);
    for (const serialized of outputContent) {
      await vscode.window.showTextDocument(serialized.outputUri);
    }
  }

  private pickOutputDirectory(): Promise<vscode.Uri> {
    return this._userInput.registerElement(
      ui.DirectoryPicker,
      this._workspaceDirectoryFinder,
      this._config.outputDirectorySelector.mode,
      vscode.Uri.file(this._headerFile.directory)
    );
  }

  private pickInterfaceImplementationNames(
    modes: io.SerializableMode[]
  ): Promise<IImplementationNameHelper | undefined> {
    const helper = new ImplementationNameHelper((origName) =>
      this._userInput.registerElement(ui.InterfaceNamePicker, origName)
    );

    const namesProvidePromise = this._headerFile.rootNamespace
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
      return this._userInput.registerElement(
        ui.FileNamePicker,
        this._headerFile.basename
      );
    } else if (isImplMode) {
      return firstImplementationNamePromise!;
    } else {
      return Promise.resolve(this._headerFile.basename);
    }
  }

  private serializeContent(
    modes: io.SerializableMode[],
    outputDirectory: vscode.Uri,
    fileNameMap: Map<io.SerializableMode, string>,
    selection?: io.TextScope
  ): SerializedContent[] {
    const modesWithFilenames = compact(
      modes.map((mode) => {
        const fileName = fileNameMap.get(mode);
        if (fileName) {
          return { mode, fileName };
        }
      })
    );

    return compact(
      modesWithFilenames.map((zip) => {
        const mode = zip.mode;
        const fileHeader = this.createFileHeader(
          mode,
          outputDirectory.fsPath,
          zip.fileName
        );
        const fileBody = this._headerFile.serialize({ mode, range: selection });
        if (!fileBody) {
          return;
        }

        const outputUri = this.getOutputFileUri(
          mode,
          outputDirectory,
          zip.fileName
        );
        return { mode, outputUri, content: fileHeader + fileBody };
      })
    );
  }

  private getOutputFileUri(
    mode: io.SerializableMode,
    outputDirectory: vscode.Uri,
    fileName: string
  ): vscode.Uri {
    switch (mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.implHeader:
        fileName += "." + this._config.outputFileExtension.forCppHeader;
        break;
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        fileName += "." + this._config.outputFileExtension.forCppSource;
        break;
    }
    return vscode.Uri.joinPath(outputDirectory, fileName);
  }

  private createFileHeader(
    mode: io.SerializableMode,
    outputDirectory: string,
    outputFileName: string
  ): string {
    let fileHeader: string;
    switch (mode) {
      case io.SerializableMode.implHeader:
        fileHeader = this._config.fileHeader.forCppHeader;
        fileHeader += this.createIncludeStatements(
          outputDirectory,
          this._headerFile.getPath()
        );
        break;
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
        fileHeader = this._config.fileHeader.forCppHeader;
        break;
      case io.SerializableMode.source:
        fileHeader = this._config.fileHeader.forCppSource;
        fileHeader += this.createIncludeStatements(
          outputDirectory,
          this._headerFile.getPath()
        );
        break;
      case io.SerializableMode.implSource:
        fileHeader = this._config.fileHeader.forCppSource;
        const include = path.join(
          outputDirectory,
          outputFileName + "." + this._config.outputFileExtension.forCppHeader
        );
        fileHeader += this.createIncludeStatements(outputDirectory, include);
        break;
    }
    return fileHeader;
  }

  private createIncludeStatements(
    outputDirectory: string,
    ...fileIncludePaths: string[]
  ): string {
    let fileHeader = "";
    fileIncludePaths.forEach((include) => {
      let relFilePath = path.relative(outputDirectory, include);
      fileHeader += '#include "' + relFilePath + '"\n';
    });
    fileHeader += "\n";
    return fileHeader;
  }

  private async writeNewContent(
    outputContent: SerializedContent[],
    selection?: io.TextScope
  ) {
    await asyncForEach(outputContent, async (serialized) => {
      let existingDocument: vscode.TextDocument | undefined;
      try {
        existingDocument = await vscode.workspace.openTextDocument(
          serialized.outputUri
        );
      } catch {
        existingDocument = undefined;
      }

      if (existingDocument) {
        this.mergeFiles(existingDocument, serialized, selection);
      } else {
        this.createNewFile(serialized);
      }
    });
  }

  private createNewFile(serialized: SerializedContent) {
    this._edit.createFile(serialized.outputUri);
    this._edit.insert(
      serialized.outputUri,
      new vscode.Position(0, 0),
      serialized.content
    );
  }

  private mergeFiles(
    existingDocument: vscode.TextDocument,
    serialized: SerializedContent,
    selection?: io.TextScope
  ) {
    const mergerOptions: FileMergerOptions = {
      disableRemoving: this._disableRemoveOnMerge,
      skipConfirmAdding:
        this._config.refactoringPreview === RefactoringPreview.never ||
        this._config.refactoringPreview === RefactoringPreview.deletion,
      skipConfirmRemoving:
        this._config.refactoringPreview === RefactoringPreview.never ||
        this._config.refactoringPreview === RefactoringPreview.adding,
    };
    switch (serialized.mode) {
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        const sourceFileMerger = new SourceFileMerger(
          mergerOptions,
          this._headerFile,
          {
            mode: serialized.mode,
            range: selection,
          }
        );
        sourceFileMerger.merge(existingDocument, this._edit);
        break;

      case io.SerializableMode.header:
      case io.SerializableMode.implHeader:
      case io.SerializableMode.interfaceHeader:
        const headerFileMerger = new HeaderFileMerger(
          mergerOptions,
          this._headerFile,
          {
            mode: serialized.mode,
            range: selection,
          }
        );
        headerFileMerger.merge(existingDocument, this._edit);
        break;

      default:
        vscode.window.showErrorMessage(
          `Cannot write stubs, file ${existingDocument.fileName} already exists`
        );
        break;
    }
  }
}
