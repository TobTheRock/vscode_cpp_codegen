import * as io from "./io";
import * as vscode from "vscode";

export interface InsertedText {
  content: string;
  where: number;
}

export interface FileMergerOptions {
  disableRemoving?: boolean;
  skipConfirmRemoving?: boolean;
  skipConfirmAdding?: boolean;
}

export class CommonFileMerger {
  constructor(protected _options: FileMergerOptions) {}

  protected deleteTextScope(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    ...textScopes: io.TextScope[]
  ) {
    if (this._options.disableRemoving) {
      return;
    }

    const removedFunctionLabel = "Removed from file " + textDocument.fileName;
    textScopes
      .filter((textScope) => textScope.scopeEnd !== textScope.scopeStart)
      .forEach((textScope) =>
        edit.delete(
          textDocument.uri,
          new vscode.Range(
            textDocument.positionAt(textScope.scopeStart),
            textDocument.positionAt(textScope.scopeEnd + 1)
          ),
          {
            needsConfirmation: this._options.skipConfirmRemoving !== true,
            label: removedFunctionLabel,
          }
        )
      );
  }

  protected addTextScopeContent(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    ...insertedTexts: InsertedText[]
  ) {
    const addedFunctionLabel = "Added to file " + textDocument.fileName;
    insertedTexts
      .filter((insertedText) => insertedText.content.length)
      .forEach((insertedText) =>
        edit.insert(
          textDocument.uri,
          textDocument.positionAt(insertedText.where),
          insertedText.content,
          {
            needsConfirmation: this._options.skipConfirmAdding !== true,
            label: addedFunctionLabel,
          }
        )
      );
  }
}
