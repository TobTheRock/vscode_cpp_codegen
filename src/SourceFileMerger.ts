import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
export class SourceFileMerger {
  constructor(private _filePath: string, generatedSourceFileContent: string) {
    this._generatedSourceFile = new cpp.SourceFile(
      _filePath,
      generatedSourceFileContent
    );
  }

  async merge(edit: vscode.WorkspaceEdit) {
    const textDocument = await vscode.workspace.openTextDocument(
      this._filePath
    );
    const textDocumentUri = textDocument.uri;
    const text = textDocument.getText();

    const existingSourceFile = new cpp.SourceFile(this._filePath, text);
    const existingSignatures = existingSourceFile.getSignatures();
    const generatedSignatures = this._generatedSourceFile.getSignatures();

    const addedSignatures = generatedSignatures.filter(
      (generatedSignature) =>
        !existingSignatures.some((existingSignature) =>
          io.compareSignaturables(generatedSignature, existingSignature)
        )
    );
    const addedFunctionLabel =
      "Added functions to file " + textDocument.fileName;

    const removedSignatures = existingSignatures.filter(
      (existingSignature) =>
        !generatedSignatures.some((generatedSignature) =>
          io.compareSignaturables(generatedSignature, existingSignature)
        )
    );
    const removedFunctionLabel =
      "Removed functions from file " + textDocument.fileName;

    //TODO MAKE confirmation configurable
    addedSignatures.forEach(
      (addedSignature) =>
        //TODO add sorted ?
        edit.insert(
          textDocument.uri,
          textDocument.positionAt(text.length - 1),
          addedSignature.content + "\n"
        ),
      { needsConfirmation: true, label: addedFunctionLabel }
    );

    removedSignatures.forEach((removedSignature) =>
      edit.delete(
        textDocument.uri,
        new vscode.Range(
          textDocument.positionAt(removedSignature.textScope.scopeStart),
          textDocument.positionAt(removedSignature.textScope.scopeEnd + 1)
        ),
        { needsConfirmation: true, label: removedFunctionLabel }
      )
    );

    return true;
  }

  private _generatedSourceFile: cpp.SourceFile;
}
