import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { compact, max, maxBy } from "lodash";
import { FileMergerOptions, IFileMerger } from "./IFileMerger";
import {
  Difference,
  TextDocumentScopeAdder,
  TextDocumentScopeDeleter,
} from "./TextDocumentDifference";

export class HeaderFileMerger implements IFileMerger {
  private _scopeAdder: TextDocumentScopeAdder;
  private _scopeDeleter?: TextDocumentScopeDeleter;
  private _existingHeaderFile: cpp.HeaderFile;
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
    this._existingHeaderFile = new cpp.HeaderFile(
      existingDocument.fileName,
      text
    );
  }

  merge() {
    this.mergeNamespace(
      this._existingHeaderFile.rootNamespace,
      this._generatedHeaderFile.rootNamespace
    );
  }

  private mergeNamespace(
    existingNamespace: cpp.INamespace,
    generatedNamespace: cpp.INamespace
  ) {
    const classDiff = this.createDiff(
      existingNamespace.classes,
      generatedNamespace.classes
    );
    const functionDiff = this.createDiff(
      existingNamespace.functions,
      generatedNamespace.functions
    );
    const subNamespaceDiff = this.createDiff(
      existingNamespace.subnamespaces,
      generatedNamespace.subnamespaces
    );

    this._scopeAdder.addTextWithinScope(
      existingNamespace,
      ...classDiff.added,
      ...functionDiff.added,
      ...subNamespaceDiff.added
    );
    this._scopeDeleter?.deleteTextScope(
      ...classDiff.removed,
      ...functionDiff.removed,
      ...subNamespaceDiff.removed
    );

    subNamespaceDiff.changed.forEach((namespacePair) =>
      this.mergeNamespace(namespacePair.existing, namespacePair.generated)
    );
    classDiff.changed.forEach((classPair) =>
      this.mergeClass(classPair.existing, classPair.generated)
    );
  }

  private mergeClass(exisitingClass: cpp.IClass, generatedClass: cpp.IClass) {
    const destructorDiff = this.createDiff(
      compact([exisitingClass.destructor]),
      compact([generatedClass.destructor])
    );
    this._scopeAdder.addTextAfterScope(exisitingClass, ...destructorDiff.added);
    this._scopeDeleter?.deleteTextScope(...destructorDiff.removed);

    this.mergeClassScope(
      exisitingClass.privateScope,
      generatedClass.privateScope
    );
    this.mergeClassScope(
      exisitingClass.protectedScope,
      generatedClass.protectedScope
    );
    this.mergeClassScope(
      exisitingClass.publicScope,
      generatedClass.publicScope
    );

    // TODO inheritance: Diff<string>; => make it a textscope
  }

  private mergeClassScope(
    exisitingClassScope: cpp.IClassScope,
    generatedClassScope: cpp.IClassScope
  ) {
    const classScopeEnd = this.getClassScopeEnd(exisitingClassScope);
    if (!classScopeEnd) {
      return;
    }

    const nestedClassDiff = this.createDiff(
      exisitingClassScope.nestedClasses,
      generatedClassScope.nestedClasses
    );

    const memberFunctionDiff = this.createDiff(
      exisitingClassScope.memberFunctions,
      generatedClassScope.memberFunctions
    );

    const constructorDiff = this.createDiff(
      exisitingClassScope.constructors,
      generatedClassScope.constructors
    );

    this._scopeAdder.addTextAfter(
      classScopeEnd,
      ...nestedClassDiff.added,
      ...memberFunctionDiff.added,
      ...constructorDiff.added
    );
    this._scopeDeleter?.deleteTextScope(
      ...nestedClassDiff.removed,
      ...memberFunctionDiff.removed,
      ...constructorDiff.removed
    );

    nestedClassDiff.changed.forEach((classPair) =>
      this.mergeClass(classPair.existing, classPair.generated)
    );
  }

  private createDiff<T extends cpp.Comparable<T>>(
    existing: T[],
    generated: T[]
  ) {
    return new Difference(existing, generated, this._serializeOptions);
  }

  private getClassScopeEnd(classScope: cpp.IClassScope): number | undefined {
    const maxMemberFunctionScope = this.maxScopeEnd(classScope.memberFunctions);
    const maxNestedClassScope = this.maxScopeEnd(classScope.nestedClasses);
    const maxConstructorScope = this.maxScopeEnd(classScope.constructors);

    return max([
      maxConstructorScope,
      maxMemberFunctionScope,
      maxNestedClassScope,
    ]);
  }

  private maxScopeEnd<T extends io.TextScope>(scopes: T[]): number | undefined {
    return maxBy(scopes.map((scope) => scope.scopeEnd));
  }
}
