import * as vscode from "vscode";
import * as cpp from "./cpp";
import * as io from "./io";
import * as path from "path";
import {
  Configuration,
  getLanguage,
  IExtensionConfiguration,
  Language,
} from "./Configuration";
import { createFileFromDocument } from "./utils";
import { SourceFileCompletionItems } from "./SourceFileCompletionItems";

export class SourceFileCompletionProvider
  implements vscode.CompletionItemProvider
{
  constructor(private readonly _config: IExtensionConfiguration) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<
    vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
  > {
    return this.provideCompletionItems_(document, position, token, context);
  }

  private async provideCompletionItems_(
    sourceDocument: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ) {
    const triggerCharacterUsed = this.isTriggerCharacterUsed(context);
    const triggerCharacterNotApplicable =
      triggerCharacterUsed &&
      !this.isTriggerCharacterSolelyInLine(sourceDocument, position);
    if (
      !this._config.sourceFileCompletionProvider.enable ||
      !this.isSourceFile(sourceDocument) ||
      triggerCharacterNotApplicable
    ) {
      return [];
    }

    const language = getLanguage(sourceDocument);
    const headerDocument = await this.getHeaderDocument(
      sourceDocument.uri,
      language
    );
    if (!headerDocument) {
      return [];
    }
    const headerFile = createFileFromDocument(cpp.HeaderFile, headerDocument);
    const sourceFile = createFileFromDocument(cpp.SourceFile, sourceDocument);

    if (!headerFile || !sourceFile) {
      return [];
    }

    const sourceFileCompletionItems = new SourceFileCompletionItems(
      sourceFile,
      headerFile
    );

    const currentScope = this.getCurrentTextScope(sourceDocument, position);
    let completionItems =
      sourceFileCompletionItems.getAddedCompletionItems(currentScope);

    if (triggerCharacterUsed) {
      completionItems = this.setDeleteTriggerCharacterEdit(
        position,
        completionItems
      );
    }

    return completionItems;
  }

  private isSourceFile(sourceDocument: vscode.TextDocument): boolean {
    const extension = path.extname(sourceDocument.fileName);
    return [
      ".cpp",
      ".c",
      ".cc",
      ".cxx",
      ".c++",
      ".cp",
      ".c++",
      ".CPP",
      ".cxx",
      ".C",
      `.${this._config.outputFileExtension.forCppSource}`,
    ].includes(extension);
  }

  private async getHeaderDocument(
    sourceFilePath: vscode.Uri,
    language: Language
  ): Promise<vscode.TextDocument | undefined> {
    const extension = path.extname(sourceFilePath.fsPath);
    const basename = path.basename(sourceFilePath.fsPath, extension);
    const directory = path.dirname(sourceFilePath.fsPath);

    const expectedHeaderExtension =
      language === Language.cpp
        ? this._config.outputFileExtension.forCppHeader
        : this._config.outputFileExtension.forCHeader;
    const expectedHeaderFileName = `${basename}.${expectedHeaderExtension}`;
    const expectedPath = vscode.Uri.file(
      path.join(directory, expectedHeaderFileName)
    );
    try {
      return await vscode.workspace.openTextDocument(expectedPath);
    } catch {
      return;
    }
  }

  private getCurrentTextScope(
    sourceDocument: vscode.TextDocument,
    position: vscode.Position
  ): io.TextScope {
    const currentOffset = sourceDocument.offsetAt(position);
    return new io.TextScope(currentOffset, currentOffset);
  }

  private isTriggerCharacterUsed(context: vscode.CompletionContext): boolean {
    const triggerCharacter = context.triggerCharacter;
    const configuredTriggerCharacter =
      this._config.sourceFileCompletionProvider.trigger;
    return (
      context.triggerKind === vscode.CompletionTriggerKind.TriggerCharacter &&
      triggerCharacter === `${configuredTriggerCharacter}`
    );
  }

  private isTriggerCharacterSolelyInLine(
    sourceDocument: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    const currentLine = sourceDocument.lineAt(position).text;
    const configuredTriggerCharacter =
      this._config.sourceFileCompletionProvider.trigger;
    const escapedConfiguredTriggerCharacter =
      configuredTriggerCharacter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

    const regex = `^(\\s*)${escapedConfiguredTriggerCharacter}(\\s*)$`;
    return RegExp(regex).test(currentLine);
  }

  setDeleteTriggerCharacterEdit(
    position: vscode.Position,
    completionItems: vscode.CompletionItem[]
  ): vscode.CompletionItem[] {
    const deleteRange = new vscode.Range(position, position.translate(0, -1));
    const deleteTriggerCharacterEdit = vscode.TextEdit.delete(deleteRange);

    if (!completionItems.length) {
      const noDefinitionsFoundItem = new vscode.CompletionItem(
        "No definitions found"
      );
      noDefinitionsFoundItem.additionalTextEdits = [deleteTriggerCharacterEdit];
      noDefinitionsFoundItem.insertText = "";
      return [noDefinitionsFoundItem];
    }

    return completionItems.map((item) => {
      item.additionalTextEdits = [deleteTriggerCharacterEdit];
      return item;
    });
  }
}
