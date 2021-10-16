import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { IFileMerger, FileMergerOptions } from "./IFileMerger";
import {
  extractDefinitonsFromNamespace,
  NamespaceDefinitionManipulator,
} from "./cpp/SourceFileDefinition";
import { add, uniqWith } from "lodash";
import {
  Difference,
  TextDocumentScopeAdder,
  TextDocumentScopeDeleter,
} from "./TextDocumentDifference";

export class SourceFileMerger implements IFileMerger {
  private _scopeAdder: TextDocumentScopeAdder;
  private _scopeDeleter?: TextDocumentScopeDeleter;
  private _manipulator: NamespaceDefinitionManipulator;

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

    const text = existingDocument.getText();
    const existingSourceFile = new cpp.SourceFile(
      existingDocument.fileName,
      text
    );
    this._manipulator = new NamespaceDefinitionManipulator(
      existingSourceFile.rootNamespace
    );
  }

  merge() {
    const definitionDiff = this.createDefintionDiff();
    this.removeUniqueScopes(definitionDiff.removed);
    this.addDefinitionToNamespaceScopes(definitionDiff.added);
  }

  private createDefintionDiff(): Difference<cpp.IDefinition> {
    const existingDefinitions = this._manipulator.extractDefinitions(
      this._serializeOptions.mode
    );
    const generatedDefinitions = extractDefinitonsFromNamespace(
      this._generatedHeaderFile.rootNamespace,
      this._serializeOptions.mode
    );

    return new Difference(
      existingDefinitions,
      generatedDefinitions,
      this._serializeOptions
    );
  }

  private removeUniqueScopes(removedDefinitions: cpp.IDefinition[]) {
    let removedScopes = removedDefinitions.map((definition) =>
      this._manipulator.removeDefinition(definition)
    );
    removedScopes = uniqWith(removedScopes, (scope, otherScope) =>
      otherScope.fullyContains(scope)
    );
    removedScopes = uniqWith(removedScopes.reverse(), (scope, otherScope) =>
      otherScope.fullyContains(scope)
    );

    this._scopeDeleter?.deleteTextScope(...removedScopes);
  }

  private addDefinitionToNamespaceScopes(addedDefinitions: cpp.IDefinition[]) {
    for (const definition of addedDefinitions) {
      const { added, namespaceWhere } =
        this._manipulator.addDefinition(definition);
      this._scopeAdder.addTextWithinScope(namespaceWhere, added);
    }
  }
}
