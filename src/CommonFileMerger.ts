import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { differenceWith } from "lodash";

export interface InsertedText {
  content: string;
  where: number;
}

export interface FileMergerOptions {
  disableRemoving?: boolean;
  skipConfirmRemoving?: boolean;
  skipConfirmAdding?: boolean;
}
export interface ChangedPair<T> {
  generated: T;
  existing: T;
}
export interface Diff<T> {
  added: T[];
  removed: T[];
  changed: ChangedPair<T>[];
}

export class CommonFileMerger {
  constructor(
    protected readonly _options: FileMergerOptions,
    protected readonly _serializeOptions: io.SerializationOptions
  ) {}

  protected deleteTextScope(
    edit: vscode.WorkspaceEdit,
    textDocument: vscode.TextDocument,
    ...textScopes: io.TextScope[]
  ) {
    if (this._options.disableRemoving) {
      return;
    }

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
          {
            needsConfirmation: this._options.skipConfirmRemoving !== true,
            label: removedFunctionLabel,
          }
        )
      );
  }

  protected addTextScopeContent(
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
          {
            needsConfirmation: this._options.skipConfirmAdding !== true,
            label: addedFunctionLabel,
          }
        )
      );
  }

  protected createDiff<T extends cpp.Comparable<T>>(
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

  protected createInsertedText<T extends io.ISerializable>(
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
}
