import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { NamespaceDefinitionDifference } from "./NamespaceDefinitionDifference";
import { ChangedPair, Difference } from "./TextDocumentManipulation";
import { getActiveEditorIndentStep } from "./utils";

export class SourceFileCompletionItems {
  private readonly _sourceFileSerializeOptions: io.SerializationOptions;
  private readonly _labelSerializeOptions: io.SerializationOptions = {
    mode: io.SerializableMode.completionItemLabel,
  };
  constructor(
    private readonly _sourceFile: cpp.IFile,
    private readonly _headerFile: cpp.IFile
  ) {
    const indentStep = getActiveEditorIndentStep();
    this._sourceFileSerializeOptions = {
      mode: io.SerializableMode.source,
      indentStep,
    };
  }

  getAddedCompletionItems(
    existingFileSelectedScope: io.TextScope
  ): vscode.CompletionItem[] {
    const namespaceDefinitionDiff = new NamespaceDefinitionDifference(
      this._sourceFileSerializeOptions
    );

    let changedPair: ChangedPair<cpp.INamespace> | undefined = {
      existing: this._sourceFile.rootNamespace,
      generated: this._headerFile.rootNamespace,
    };
    let previousChangedPair: ChangedPair<cpp.INamespace>;
    let currentNamespaceDifference: Difference<cpp.INamespace>;

    while (changedPair) {
      previousChangedPair = changedPair;
      currentNamespaceDifference = new Difference(
        changedPair.existing.subnamespaces,
        changedPair.generated.subnamespaces,
        this._sourceFileSerializeOptions
      );
      changedPair = currentNamespaceDifference.changed.find((namespacePair) =>
        namespacePair.existing.fullyContains(existingFileSelectedScope)
      );
    }

    const addedNamespaces = currentNamespaceDifference!.added;
    const addedDefinitions = namespaceDefinitionDiff.getDifference(
      previousChangedPair!.existing,
      previousChangedPair!.generated
    ).added;

    return [
      ...addedNamespaces.map((namespace) =>
        this.createCompletionItem(namespace, vscode.CompletionItemKind.Module)
      ),
      ...addedDefinitions.map((definition) =>
        this.createCompletionItem(definition, vscode.CompletionItemKind.Method)
      ),
    ];
  }

  private createCompletionItem(
    serializable: io.ISerializable,
    kind: vscode.CompletionItemKind
  ): vscode.CompletionItem {
    const label = serializable
      .serialize(this._labelSerializeOptions)
      .toString();
    const completionItem = new vscode.CompletionItem(label, kind);

    const insertText = serializable
      .serialize(this._sourceFileSerializeOptions)
      .toString();
    completionItem.insertText = insertText;

    return completionItem;
  }
}
