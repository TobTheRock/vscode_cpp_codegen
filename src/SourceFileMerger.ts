import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { IFileMerger, FileMergerOptions } from "./IFileMerger";
import { flatten } from "lodash";
import {
  Difference,
  TextDocumentScopeAdder,
  TextDocumentScopeDeleter,
} from "./TextDocumentDifference";

export class SourceFileMerger implements IFileMerger {
  private _scopeAdder: TextDocumentScopeAdder;
  private _scopeDeleter?: TextDocumentScopeDeleter;
  private _existingSourceFile: cpp.SourceFile;

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
    this._existingSourceFile = new cpp.SourceFile(
      existingDocument.fileName,
      text
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
    const definitionDiff = this.createDefintionDiff(
      existingNamespace.functions,
      generatedNamespace.functions,
      generatedNamespace.classes
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

  private createDefintionDiff(
    existingFunctions: cpp.IFunction[],
    generatedFunctions: cpp.IFunction[],
    generatedClasses: cpp.IClass[]
  ): Difference<cpp.IDefinition> {
    const existingDefinitions = existingFunctions.map((fnct) =>
      cpp.SourceFileDefinition.createFromFunction(fnct, [])
    );
    const generatedDefinitions = flatten(
      generatedClasses.map((cl) =>
        this.extractDefinitionsFromClass(cl, this._serializeOptions.mode)
      )
    );
    generatedDefinitions.push(
      ...generatedFunctions.map((fnct) =>
        cpp.SourceFileDefinition.createFromFunction(fnct, [])
      )
    );

    return new Difference(
      existingDefinitions,
      generatedDefinitions,
      this._serializeOptions
    );
  }

  private extractDefinitionsFromClass(
    cl: cpp.IClass,
    mode: io.SerializableMode,
    namespaceNames: string[] = [],
    parentClassNames: string[] = []
  ): cpp.IDefinition[] {
    const className = mode ? cl.getName(mode) : cl.name;
    const classNames = [...parentClassNames, className];
    const definitions: cpp.IDefinition[] = [];

    definitions.push(
      ...flatten(
        [cl.privateScope, cl.protectedScope, cl.publicScope].map((scope) =>
          this.extractDefinitionsFromClassScope(
            scope,
            namespaceNames,
            classNames,
            mode
          )
        )
      )
    );

    return definitions;
  }

  private extractDefinitionsFromClassScope(
    scope: cpp.IClassScope,
    namespaceNames: string[],
    classNames: string[],
    mode: io.SerializableMode
  ): cpp.IDefinition[] {
    const definitions: cpp.IDefinition[] = scope.constructors.map((ctor) =>
      cpp.SourceFileDefinition.createFromConstructor(
        ctor,
        namespaceNames,
        classNames
      )
    );
    if (scope.destructor) {
      definitions.push(
        cpp.SourceFileDefinition.createFromDestructor(
          scope.destructor,
          namespaceNames,
          classNames
        )
      );
    }
    definitions.push(
      ...scope.memberFunctions.map((fnct) =>
        cpp.SourceFileDefinition.createFromMemberFunction(
          fnct,
          namespaceNames,
          classNames
        )
      )
    );
    definitions.push(
      ...flatten(
        scope.nestedClasses.map((cl) =>
          this.extractDefinitionsFromClass(cl, mode, namespaceNames, classNames)
        )
      )
    );
    return definitions;
  }

  private createDiff<T extends cpp.Comparable<T>>(
    existing: T[],
    generated: T[]
  ) {
    return new Difference(existing, generated, this._serializeOptions);
  }
}
