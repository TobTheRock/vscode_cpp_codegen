import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { CommonFileMerger, FileMergerOptions } from "./CommonFileMerger";
import {
  extractDefinitonsFromNamespace,
  NamespaceDefinitionManipulator,
} from "./cpp/SourceFileDefinition";
import { uniqWith } from "lodash";

export class SourceFileMerger extends CommonFileMerger {
  constructor(
    options: FileMergerOptions,
    private readonly _generatedHeaderFile: cpp.HeaderFile,
    serializeOptions: io.SerializationOptions
  ) {
    super(options, serializeOptions);
  }

  merge(existingDocument: vscode.TextDocument, edit: vscode.WorkspaceEdit) {
    const text = existingDocument.getText();
    const existingSourceFile = new cpp.SourceFile(
      existingDocument.fileName,
      text
    );
    const manipulator = new NamespaceDefinitionManipulator(
      existingSourceFile.rootNamespace
    );

    const existingDefinitions = manipulator.extractDefinitions(
      this._serializeOptions.mode
    );
    const generatedDefinitions = extractDefinitonsFromNamespace(
      this._generatedHeaderFile.rootNamespace,
      this._serializeOptions.mode
    );

    const definitionDiff = this.createDiff(
      existingDefinitions,
      generatedDefinitions
    );

    let removedScopes = definitionDiff.removed.map((definition) =>
      manipulator.removeDefinition(definition)
    );
    removedScopes = uniqWith(removedScopes, (scope, otherScope) =>
      otherScope.fullyContains(scope)
    );
    removedScopes = uniqWith(removedScopes.reverse(), (scope, otherScope) =>
      otherScope.fullyContains(scope)
    );

    this.deleteTextScope(edit, existingDocument, ...removedScopes);

    for (const definition of definitionDiff.added) {
      const { added, where } = manipulator.addDefinition(definition);
      this.addTextScopeContent(
        edit,
        existingDocument,
        ...this.createInsertedText([added], where.scopeEnd - 1)
      );
    }
  }
}
