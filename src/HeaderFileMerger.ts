import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { ISignaturable, ISourceFileNamespace } from "./io";
import { compact, differenceWith, max, maxBy, zipWith } from "lodash";
import { CommonFileMerger, FileMergerOptions } from "./CommonFileMerger";

interface InsertedText {
  content: string;
  where: number;
}

interface ChangedPair<T> {
  generated: T;
  existing: T;
}

interface Diff<T> {
  added: T[];
  removed: T[];
  changed: ChangedPair<T>[];
}

interface ClassScopeDiff {
  memberFunctions: Diff<cpp.IFunction>;
  classes: Diff<cpp.IClass>;
  constructors: Diff<cpp.IConstructor>;
}

export class HeaderFileMerger extends CommonFileMerger {
  constructor(
    options: FileMergerOptions,
    private readonly _generatedHeaderFile: cpp.HeaderFile,
    private readonly _serializeOptions: io.SerializationOptions
  ) {
    super(options);
  }

  merge(existingDocument: vscode.TextDocument, edit: vscode.WorkspaceEdit) {
    const text = existingDocument.getText();
    const existingHeaderFile = new cpp.HeaderFile(
      existingDocument.fileName,
      text
    );

    const changedNamespaces = this.handleAddedRemovedAndExtractChanged(
      edit,
      existingDocument,
      text.length,
      existingHeaderFile.namespaces,
      this._generatedHeaderFile.namespaces
    );

    changedNamespaces.forEach(
      this.mergeNamespace.bind(this, edit, existingDocument)
    );
  }

  private createDiff<T extends cpp.Comparable<T>>(
    existing: T[],
    generated: T[]
  ): Diff<T> {
    const comparator = (a: T, b: T) => {
      return a.equals(b, this._serializeOptions.mode);
    };
    const added = differenceWith(generated, existing, comparator);
    const removed = differenceWith(existing, generated, comparator);
    const changed = existing.reduce<ChangedPair<T>[]>(
      (changedAcc, existingElement: T) => {
        const generatedMatchingElement = generated.find((b) =>
          comparator(existingElement, b)
        );
        if (generatedMatchingElement) {
          return changedAcc.concat({
            generated: generatedMatchingElement,
            existing: existingElement,
          });
        }
        return changedAcc;
      },
      []
    );

    return { added, removed, changed };
  }

  private createInsertedText<T extends io.ISerializable>(
    serializables: T[],
    where: number
  ) {
    return serializables
      .map((serializable) => serializable.serialize(this._serializeOptions))
      .filter((content) => content.length)
      .map((content) => {
        where = where + 1;
        content = `\n${content.trim()}`;
        return { content, where };
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
