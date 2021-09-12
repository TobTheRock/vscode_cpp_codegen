import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { compact, max, maxBy } from "lodash";
import {
  ChangedPair,
  CommonFileMerger,
  FileMergerOptions,
} from "./CommonFileMerger";

export class HeaderFileMerger extends CommonFileMerger {
  constructor(
    options: FileMergerOptions,
    private readonly _generatedHeaderFile: cpp.HeaderFile,
    serializeOptions: io.SerializationOptions
  ) {
    super(options, serializeOptions);
  }

  merge(existingDocument: vscode.TextDocument, edit: vscode.WorkspaceEdit) {
    const text = existingDocument.getText();
    const existingHeaderFile = new cpp.HeaderFile(
      existingDocument.fileName,
      text
    );

    this.mergeNamespace(edit, existingDocument, {
      generated: this._generatedHeaderFile.rootNamespace,
      existing: existingHeaderFile.rootNamespace,
    });
  }

  private handleAddedRemovedAndExtractChanged<
    T extends cpp.Comparable<T> & io.ISerializable & io.TextScope
  >(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    addWhere: number,
    existing: T[],
    generated: T[]
  ): ChangedPair<T>[] {
    const diff = this.createDiff(existing, generated);
    this.addTextScopeContent(
      edit,
      textDocument,
      ...this.createInsertedText(diff.added, addWhere)
    );

    this.deleteTextScope(edit, textDocument, ...diff.removed);

    return diff.changed;
  }

  private mergeNamespace(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    namespacePair: ChangedPair<cpp.INamespace>
  ) {
    const changedClasses = this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      namespacePair.existing.scopeEnd,
      namespacePair.existing.classes,
      namespacePair.generated.classes
    );

    this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      namespacePair.existing.scopeEnd,
      namespacePair.existing.functions,
      namespacePair.generated.functions
    );
    const changedSubNamespaces = this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      namespacePair.existing.scopeEnd,
      namespacePair.existing.subnamespaces,
      namespacePair.generated.subnamespaces
    );

    changedSubNamespaces.forEach(
      this.mergeNamespace.bind(this, edit, textDocument)
    );
    changedClasses.forEach(this.mergeClass.bind(this, edit, textDocument));
  }

  private mergeClass(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    classPair: ChangedPair<cpp.IClass>
  ) {
    this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      classPair.existing.scopeEnd,
      compact([classPair.existing.destructor]),
      compact([classPair.generated.destructor])
    );

    this.mergeClassScope(edit, textDocument, {
      existing: classPair.existing.privateScope,
      generated: classPair.generated.privateScope,
    });

    this.mergeClassScope(edit, textDocument, {
      existing: classPair.existing.protectedScope,
      generated: classPair.generated.protectedScope,
    });

    this.mergeClassScope(edit, textDocument, {
      existing: classPair.existing.publicScope,
      generated: classPair.generated.publicScope,
    });

    // TODO inheritance: Diff<string>; => make it a textscope
  }

  private mergeClassScope(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    classScopePair: ChangedPair<cpp.IClassScope>
  ) {
    const classScopeEnd = this.getClassScopeEnd(classScopePair.existing);

    if (!classScopeEnd) {
      return;
    }

    const changedClasses = this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      classScopeEnd,
      classScopePair.existing.nestedClasses,
      classScopePair.generated.nestedClasses
    );

    this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      classScopeEnd,
      classScopePair.existing.memberFunctions,
      classScopePair.generated.memberFunctions
    );

    this.handleAddedRemovedAndExtractChanged(
      edit,
      textDocument,
      classScopeEnd,
      classScopePair.existing.constructors,
      classScopePair.generated.constructors
    );

    changedClasses.forEach(this.mergeClass.bind(this, edit, textDocument));
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
