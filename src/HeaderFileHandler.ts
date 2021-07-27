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
} from "./Configuration";
import { asyncForEach, awaitMapEntries } from "./utils";
import { flatten, compact } from "lodash";
import { resolve } from "dns";
import { HeaderFileMerger } from "./HeaderFileMerger";

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

  constructor(
    private readonly _headerFile: cpp.HeaderFile,
    private readonly _edit: vscode.WorkspaceEdit,
    private readonly _workspaceDirectoryFinder: WorkspaceDirectoryFinder,
    private readonly _opt: IExtensionConfiguration
  ) {
    this._userInput = new ui.UserInput();
  }

  async writeFileAs(...modes: io.SerializableMode[]) {
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
      fileNameMap
    );
    await this.writeNewContent(outputContent);
    await vscode.workspace.applyEdit(this._edit);
    await asyncForEach(outputContent, async (serialized) => {
      await vscode.window.showTextDocument(serialized.outputUri);
    });
  }

  private pickOutputDirectory(): Promise<vscode.Uri> {
    return this._userInput.registerElement(
      ui.DirectoryPicker,
      this._workspaceDirectoryFinder,
      this._opt.outputDirectorySelector.mode,
      vscode.Uri.file(this._headerFile.directory)
    );
  }

  private pickInterfaceImplementationNames(
    modes: io.SerializableMode[]
  ): Promise<IImplementationNameHelper | undefined> {
    const helper = new ImplementationNameHelper((origName) =>
      this._userInput.registerElement(ui.InterfaceNamePicker, origName)
    );

    const namesProvidePromise = asyncForEach(
      this._headerFile.namespaces,
      (namespace) => namespace.provideNames(helper, ...modes)
    ).then(() => undefined);

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

    if (!this._opt.deduceOutputFileNames || cannotDeduce) {
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
    fileNameMap: Map<io.SerializableMode, string>
  ): SerializedContent[] {
    const modesWithFilenames = compact(
      modes.map((mode) => {
        const fileName = fileNameMap.get(mode);
        if (fileName) {
          return { mode, fileName };
        }
      })
    );

    return modesWithFilenames.map((zip) => {
      const mode = zip.mode;
      const fileHeader = this.createFileHeader(
        mode,
        outputDirectory.fsPath,
        zip.fileName
      );
      const fileBody = this._headerFile.serialize({ mode });
      const outputUri = this.getOutputFileUri(
        mode,
        outputDirectory,
        zip.fileName
      );
      return { mode, outputUri, content: fileHeader + fileBody };
    });
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
        fileName += "." + this._opt.outputFileExtension.forCppHeader;
        break;
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        fileName += "." + this._opt.outputFileExtension.forCppSource;
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
        fileHeader = this._opt.fileHeader.forCppHeader;
        fileHeader += this.createIncludeStatements(
          outputDirectory,
          this._headerFile.getPath()
        );
        break;
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
        fileHeader = this._opt.fileHeader.forCppHeader;
        break;
      case io.SerializableMode.source:
        fileHeader = this._opt.fileHeader.forCppSource;
        fileHeader += this.createIncludeStatements(
          outputDirectory,
          this._headerFile.getPath()
        );
        break;
      case io.SerializableMode.implSource:
        fileHeader = this._opt.fileHeader.forCppSource;
        const include = path.join(
          outputDirectory,
          outputFileName + "." + this._opt.outputFileExtension.forCppHeader
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

  private async writeNewContent(outputContent: SerializedContent[]) {
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
        this.mergeFiles(existingDocument, serialized);
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
    serialized: SerializedContent
  ) {
    switch (serialized.mode) {
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        const sourceFileMerger = new SourceFileMerger(
          serialized.outputUri.fsPath,
          serialized.content
        );
        sourceFileMerger.merge(existingDocument, this._edit);
        break;

      case io.SerializableMode.header:
      case io.SerializableMode.implHeader:
      case io.SerializableMode.interfaceHeader:
        const headerFileMerger = new HeaderFileMerger({}, this._headerFile, {
          mode: serialized.mode,
        });
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
