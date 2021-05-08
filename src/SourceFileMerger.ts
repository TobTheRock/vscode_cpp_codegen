import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { ISignaturable, ISourceFileNamespace } from "./io";

//TODO => utils.ts
function flatten2dArray<T>(array: T[][]): T[] {
  return ([] as T[]).concat(...array);
}

interface InsertedText {
  content: string;
  where: number;
}

interface NamespacePair {
  generated: ISourceFileNamespace;
  existing: ISourceFileNamespace;
}

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

    const text = textDocument.getText();
    const existingSourceFile = new cpp.SourceFile(this._filePath, text);

    const generatedSignatures = flatten2dArray(
      this._generatedSourceFile.namespaces.map((ns) => ns.getAllSignatures())
    );
    const existingSignatures = flatten2dArray(
      existingSourceFile.namespaces.map((ns) => ns.getAllSignatures())
    );

    let removedSignatures = existingSignatures.filter(
      (existingSignature) =>
        !generatedSignatures.some((generatedSignature) =>
          io.compareSignaturables(generatedSignature, existingSignature)
        )
    );
    let namespacesToBeRemoved: ISourceFileNamespace[] = [
      ...existingSourceFile.namespaces,
    ];
    namespacesToBeRemoved.forEach((existingNamespace) =>
      existingNamespace.removeContaining(removedSignatures)
    );
    namespacesToBeRemoved = namespacesToBeRemoved.filter((existingNamespace) =>
      existingNamespace.isEmpty()
    );

    removedSignatures = removedSignatures.filter(
      (signature) =>
        !namespacesToBeRemoved.some((removedNamespace) =>
          removedNamespace.fullyContains(signature.textScope)
        )
    );
    this.deleteTextScope(
      edit,
      textDocument,
      ...namespacesToBeRemoved,
      ...removedSignatures.map((signature) => signature.textScope)
    );

    const namespacesWithAddedSignatures: ISourceFileNamespace[] = [
      ...this._generatedSourceFile.namespaces,
    ].filter((generatedNamespace) => {
      generatedNamespace.removeContaining(existingSignatures);
      return !generatedNamespace.isEmpty();
    });

    this.mergeOrAddNamespaces(
      edit,
      textDocument,
      namespacesWithAddedSignatures,
      existingSourceFile.namespaces,
      text.length
    );
  }

  private mergeOrAddNamespaces(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    namespacesWithAddedSignatures: ISourceFileNamespace[],
    existingNamespaces: ISourceFileNamespace[],
    addContentAt: number
  ) {
    const addedNamespaces = namespacesWithAddedSignatures.filter(
      (generatedNamespace) => {
        return existingNamespaces.every(
          (existingNamespace) =>
            existingNamespace.name !== generatedNamespace.name
        );
      }
    );

    const mergedNamespacePairs = namespacesWithAddedSignatures.reduce<
      NamespacePair[]
    >((acc, generatedNamespace) => {
      const existingMatch = existingNamespaces.find(
        (existingNamespace) =>
          existingNamespace.name === generatedNamespace.name
      );
      if (existingMatch) {
        return acc.concat({
          generated: generatedNamespace,
          existing: existingMatch,
        });
      }
      return acc;
    }, []);

    const addedFunctionContent: InsertedText[] = [];
    mergedNamespacePairs.forEach((mergedNamespacePair) => {
      addedFunctionContent.push(
        ...mergedNamespacePair.generated.signatures.map((signature) => {
          return {
            where: mergedNamespacePair.existing.scopeEnd,
            content: `\n${signature.content}`,
          };
        })
      );
      // yeah yet another recursion.
      if (!mergedNamespacePair.generated.subnamespaces.length) {
        return;
      }
      this.mergeOrAddNamespaces(
        edit,
        textDocument,
        mergedNamespacePair.generated.subnamespaces,
        mergedNamespacePair.existing.subnamespaces,
        mergedNamespacePair.existing.scopeEnd
      );
    });

    this.addTextScopeContent(
      edit,
      textDocument,
      ...addedFunctionContent,
      ...addedNamespaces.map((namespace) => {
        return { where: addContentAt, content: `\n${namespace.serialize()}` };
      })
    );
  }

  private deleteTextScope(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    ...textScopes: io.TextScope[]
  ) {
    const removedFunctionLabel = "Removed from file " + textDocument.fileName;
    textScopes
      .filter((textScope) => textScope.scopeEnd !== textScope.scopeStart)
      .forEach((textScope) =>
        edit.delete(
          textDocument.uri,
          new vscode.Range(
            textDocument.positionAt(textScope.scopeStart),
            textDocument.positionAt(textScope.scopeEnd + 1)
          ),
          { needsConfirmation: true, label: removedFunctionLabel }
        )
      );
  }

  private addTextScopeContent(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    ...insertedTexts: InsertedText[]
  ) {
    const addedFunctionLabel = "Added to file " + textDocument.fileName;
    insertedTexts
      .filter((insertedText) => insertedText.content.length)
      .forEach((insertedText) =>
        edit.insert(
          textDocument.uri,
          textDocument.positionAt(insertedText.where),
          insertedText.content,
          { needsConfirmation: true, label: addedFunctionLabel }
        )
      );
  }

  private _generatedSourceFile: cpp.SourceFile;
}
