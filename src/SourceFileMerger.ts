import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
// import { ISourceFileNamespace } from "./io";
import {
  CommonFileMerger,
  FileMergerOptions,
  InsertedText,
} from "./CommonFileMerger";
import {
  extractDefinitonsFromNamespace,
  NamespaceDefinitionManipulator,
} from "./cpp/SourceFileDefinition";
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

    const removedScopes = definitionDiff.removed.map((definition) =>
      manipulator.removeDefinition(definition)
    );
    this.deleteTextScope(edit, existingDocument, ...removedScopes);
    //TODO operators without class name?

    for (const definition of definitionDiff.added) {
      const { added, where } = manipulator.addDefinition(definition);
      this.addTextScopeContent(
        edit,
        existingDocument,
        ...this.createInsertedText([added], where.scopeEnd - 1)
      );
    }
  }

  // private checkRemovedDefinitions(
  //   existingSignatures: io.ISignaturable[],
  //   generatedSignatures: io.ISignaturable[],
  //   existingSourceFile: cpp.SourceFile,
  //   existingDocument: vscode.TextDocument,
  //   edit: vscode.WorkspaceEdit
  // ) {
  //   let removedSignatures = existingSignatures.filter(
  //     (existingSignature) =>
  //       !generatedSignatures.some((generatedSignature) =>
  //         io.compareSignaturables(generatedSignature, existingSignature)
  //       )
  //   );
  //   let namespacesToBeRemoved: ISourceFileNamespace[] = [
  //     ...existingSourceFile.rootNamespace,
  //   ];
  //   namespacesToBeRemoved.forEach((existingNamespace) =>
  //     existingNamespace.removeContaining(removedSignatures)
  //   );
  //   namespacesToBeRemoved = namespacesToBeRemoved.filter((existingNamespace) =>
  //     existingNamespace.isEmpty()
  //   );

  //   removedSignatures = removedSignatures.filter(
  //     (signature) =>
  //       !namespacesToBeRemoved.some((removedNamespace) =>
  //         removedNamespace.fullyContains(signature.textScope)
  //       )
  //   );
  //   this.deleteTextScope(
  //     edit,
  //     existingDocument,
  //     ...namespacesToBeRemoved,
  //     ...removedSignatures.map((signature) => signature.textScope)
  //   );
  // }

  // private mergeOrAddNamespaces(
  //   edit: vscode.WorkspaceEdit,
  //   textDocument: vscode.TextDocument,
  //   namespacesWithAddedSignatures: ISourceFileNamespace[],
  //   existingNamespaces: ISourceFileNamespace[],
  //   addContentAt: number
  // ) {
  //   const addedNamespaces = namespacesWithAddedSignatures.filter(
  //     (generatedNamespace) => {
  //       return existingNamespaces.every(
  //         (existingNamespace) =>
  //           existingNamespace.name !== generatedNamespace.name
  //       );
  //     }
  //   );

  //   const mergedNamespacePairs = namespacesWithAddedSignatures.reduce<
  //     NamespacePair[]
  //   >((acc, generatedNamespace) => {
  //     const existingMatch = existingNamespaces.find(
  //       (existingNamespace) =>
  //         existingNamespace.name === generatedNamespace.name
  //     );
  //     if (existingMatch) {
  //       return acc.concat({
  //         generated: generatedNamespace,
  //         existing: existingMatch,
  //       });
  //     }
  //     return acc;
  //   }, []);

  //   const addedFunctionContent: InsertedText[] = [];
  //   mergedNamespacePairs.forEach((mergedNamespacePair) => {
  //     addedFunctionContent.push(
  //       ...mergedNamespacePair.generated.signatures.map((signature) => {
  //         return {
  //           where: mergedNamespacePair.existing.scopeEnd,
  //           content: `\n${signature.content}`,
  //         };
  //       })
  //     );
  //     // yeah yet another recursion.
  //     if (!mergedNamespacePair.generated.subnamespaces.length) {
  //       return;
  //     }
  //     this.mergeOrAddNamespaces(
  //       edit,
  //       textDocument,
  //       mergedNamespacePair.generated.subnamespaces,
  //       mergedNamespacePair.existing.subnamespaces,
  //       mergedNamespacePair.existing.scopeEnd
  //     );
  //   });

  //   this.addTextScopeContent(
  //     edit,
  //     textDocument,
  //     ...addedFunctionContent,
  //     ...addedNamespaces.map((namespace) => {
  //       return { where: addContentAt, content: `\n${namespace.serialize()}` };
  //     })
  //   );
  // }

  // private _generatedSourceFile: cpp.SourceFile;
}
