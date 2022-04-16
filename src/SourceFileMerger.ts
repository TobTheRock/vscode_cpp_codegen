import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { IFileMerger, FileMergerOptions } from "./IFileMerger";
import {
  Difference,
  TextDocumentScopeAdder,
  TextDocumentScopeDeleter,
} from "./TextDocumentManipulation";
import { NamespaceDefinitionDifference } from "./NamespaceDefinitionDifference";
import { getLanguage, Language } from "./Configuration";

export class SourceFileMerger implements IFileMerger {
  private _scopeAdder: TextDocumentScopeAdder;
  private _scopeDeleter?: TextDocumentScopeDeleter;
  private _existingSourceFile: cpp.SourceFile;
  private _definitionDiff: NamespaceDefinitionDifference;

  constructor(
    options: FileMergerOptions,
    private readonly _generatedHeaderFile: cpp.HeaderFile,
    existingDocument: vscode.TextDocument,
    edit: vscode.WorkspaceEdit,
    private readonly _serializeOptions: io.SerializationOptions
  ) {
    this._scopeAdder = new TextDocumentScopeAdder(
      existingDocument,
      edit,
      this._serializeOptions,
      options.skipConfirmAdding
    );

    if (options.disableRemoving !== true) {
      this._scopeDeleter = new TextDocumentScopeDeleter(
        existingDocument,
        edit,
        options.skipConfirmRemoving
      );
    }
    this._definitionDiff = new NamespaceDefinitionDifference(_serializeOptions);

    const text = existingDocument.getText();
    this._existingSourceFile = new cpp.SourceFile(
      existingDocument.fileName,
      text,
      getLanguage(existingDocument)
    );
  }

  merge() {
    this.mergeNamespaceWith(
      this._existingSourceFile.rootNamespace,
      this._generatedHeaderFile.rootNamespace,
      (scope: io.TextScope, ...addedSerializables: io.ISerializable[]) =>
        this._scopeAdder.addTextAfterScope(scope, ...addedSerializables)
    );
  }

  private mergeNamespace(
    existingNamespace: cpp.INamespace,
    generatedNamespace: cpp.INamespace
  ) {
    this.mergeNamespaceWith(
      existingNamespace,
      generatedNamespace,
      (scope: io.TextScope, ...addedSerializables: io.ISerializable[]) =>
        this._scopeAdder.addTextWithinScope(scope, ...addedSerializables)
    );
  }

  private mergeNamespaceWith(
    existingNamespace: cpp.INamespace,
    generatedNamespace: cpp.INamespace,
    adderFunction: (
      scope: io.TextScope,
      ...addedSerializables: io.ISerializable[]
    ) => void
  ) {
    const subNamespaceDiff = this.createNamespaceDiff(
      existingNamespace.subnamespaces,
      generatedNamespace.subnamespaces
    );
    const definitionDiff = this._definitionDiff.getDifference(
      existingNamespace,
      generatedNamespace
    );

    adderFunction(
      existingNamespace,
      ...definitionDiff.added,
      ...subNamespaceDiff.added
    );

    this._scopeDeleter?.deleteTextScope(
      ...definitionDiff.removed,
      ...subNamespaceDiff.removed
    );

    subNamespaceDiff.changed.forEach((namespacePair) =>
      this.mergeNamespace(namespacePair.existing, namespacePair.generated)
    );
  }

  private createNamespaceDiff(
    existingNamespaces: cpp.INamespace[],
    generatedNamespaces: cpp.INamespace[]
  ) {
    const generatedNonEmptyNamespaces = generatedNamespaces.filter(
      (namespace) => !this.isNamespaceEmpty(namespace)
    );
    const diff = this.createDiff(
      existingNamespaces,
      generatedNonEmptyNamespaces
    );
    return diff;
  }

  private isNamespaceEmpty(namespace: cpp.INamespace): boolean {
    return (
      (!namespace.functions.length &&
        !namespace.classes.length &&
        !namespace.subnamespaces.length) ||
      namespace.serialize(this._serializeOptions).isEmpty() // TODO this might be quite inefficent => find a better way
    );
  }

  private createDiff<T extends cpp.Comparable<T>>(
    existing: T[],
    generated: T[]
  ) {
    return new Difference(existing, generated, this._serializeOptions);
  }
}
