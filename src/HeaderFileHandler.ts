import { SourceFileMerger } from "./SourceFileMerger";
import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import * as ui from "./ui";
import * as path from "path";
import { IExtensionConfiguration, RefactoringPreview } from "./Configuration";
import { asyncForEach, awaitMapEntries, getErrorMessage } from "./utils";
import { HeaderFileMerger } from "./HeaderFileMerger";
import { FileMergerOptions } from "./IFileMerger";
import { compact } from "lodash";

interface SerializedContent {
  mode: io.SerializableMode;
  outputUri: vscode.Uri;
  content: string;
}

export class HeaderFileHandler {
  private _userDialog: ui.UserDialog;
  private _disableRemoveOnMerge = false;
  private _indentStep: string;

  constructor(
    private readonly _headerFile: cpp.HeaderFile,
    private readonly _edit: vscode.WorkspaceEdit,
    private readonly _config: IExtensionConfiguration
  ) {
    this._userDialog = new ui.UserDialog(this._headerFile, this._config);
    this._indentStep = this.getIndentStep();
  }

  private getIndentStep(): string {
    const activeEditor = vscode.window.activeTextEditor;
    const useSpaces = activeEditor?.options.insertSpaces;
    const tabSize = activeEditor?.options.tabSize as number;

    return useSpaces && tabSize ? " ".repeat(tabSize) : "\t";
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
    let userInput;
    try {
      userInput = await this._userDialog.prompt(modes, selection);
    } catch (error) {
      vscode.window.showWarningMessage("Aborting: " + getErrorMessage(error));
      return;
    }

    const outputContent = this.serializeContent(modes, userInput, selection);
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

  private serializeContent(
    modes: io.SerializableMode[],
    userInput: ui.IUserInput,
    selection?: io.TextScope
  ): SerializedContent[] {
    const modesWithFilenames = compact(
      modes.map((mode) => {
        const fileName = userInput.fileNameMap.get(mode);
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
          userInput.outputDirectory.fsPath,
          zip.fileName
        );
        const fileBody = this._headerFile.serialize({
          mode,
          range: selection,
          indentStep: this._indentStep,
        });
        if (!fileBody) {
          return;
        }

        const outputUri = this.getOutputFileUri(
          mode,
          userInput.outputDirectory,
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
    if (io.isSourceFileSerializationMode(mode)) {
      fileName += "." + this._config.outputFileExtension.forCppSource;
    } else {
      fileName += "." + this._config.outputFileExtension.forCppHeader;
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
      case io.SerializableMode.abstractFactoryHeader:
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
    if (io.isSourceFileSerializationMode(serialized.mode)) {
      const sourceFileMerger = new SourceFileMerger(
        mergerOptions,
        this._headerFile,
        existingDocument,
        this._edit,
        {
          mode: serialized.mode,
          range: selection,
          indentStep: this._indentStep,
        }
      );
      sourceFileMerger.merge();
    } else {
      const headerFileMerger = new HeaderFileMerger(
        mergerOptions,
        this._headerFile,
        existingDocument,
        this._edit,
        {
          mode: serialized.mode,
          range: selection,
          indentStep: this._indentStep,
        }
      );
      headerFileMerger.merge();
    }
  }
}
