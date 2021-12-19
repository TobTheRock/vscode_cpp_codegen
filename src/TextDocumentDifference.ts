import { differenceWith } from "lodash";
import * as cpp from "./cpp";
import * as vscode from "vscode";
import * as io from "./io";

interface ChangedPair<T> {
  generated: T;
  existing: T;
}

export class Difference<T extends cpp.Comparable<T>> {
  added: T[];
  removed: T[];
  changed: ChangedPair<T>[];
  private _comparator: (a: T, b: T) => boolean;

  constructor(
    existing: T[],
    generated: T[],
    private readonly _serializeOptions: io.SerializationOptions
  ) {
    this._comparator = (a: T, b: T) => {
      return a.equals(b, this._serializeOptions.mode);
    };
    this.added = differenceWith(generated, existing, this._comparator);
    this.removed = differenceWith(existing, generated, this._comparator);
    this.changed = this.createChangedPairs(existing, generated);
  }

  private createChangedPairs(existing: T[], generated: T[]): ChangedPair<T>[] {
    const addMatchingElement = (
      changedPairs: ChangedPair<T>[],
      existingElement: T
    ) => {
      const matchingGeneratedElement = generated.find((generatedElement) =>
        this._comparator(existingElement, generatedElement)
      );
      if (matchingGeneratedElement) {
        return changedPairs.concat({
          generated: matchingGeneratedElement,
          existing: existingElement,
        });
      }
      return changedPairs;
    };

    return existing.reduce<ChangedPair<T>[]>(addMatchingElement, []);
  }
}

export class TextDocumentScopeDeleter {
  constructor(
    private readonly _existingTextDocument: vscode.TextDocument,
    private readonly _edit: vscode.WorkspaceEdit,
    private readonly _skipConfirm = false
  ) {}

  deleteTextScope(...textScopes: io.TextScope[]) {
    const removedFunctionLabel =
      "Removed from file " + this._existingTextDocument.fileName;
    textScopes
      .filter((textScope) => textScope.scopeEnd !== textScope.scopeStart)
      .forEach((textScope) =>
        this._edit.delete(
          this._existingTextDocument.uri,
          new vscode.Range(
            this._existingTextDocument.positionAt(textScope.scopeStart),
            this._existingTextDocument.positionAt(textScope.scopeEnd + 1)
          ),
          {
            needsConfirmation: this._skipConfirm !== true,
            label: removedFunctionLabel,
          }
        )
      );
  }
}

export class TextDocumentScopeAdder {
  constructor(
    private readonly _existingTextDocument: vscode.TextDocument,
    private readonly _edit: vscode.WorkspaceEdit,
    private readonly _serializeOptions: io.SerializationOptions,
    private readonly _skipConfirm = false
  ) {}

  addTextWithinScope(
    scope: io.TextScope,
    ...serializables: io.ISerializable[]
  ) {
    return this.addTextScopeContent(scope.scopeEnd, ...serializables);
  }

  addTextAfterScope(scope: io.TextScope, ...serializables: io.ISerializable[]) {
    return this.addTextScopeContent(scope.scopeEnd + 1, ...serializables);
  }

  addTextAfter(position: number, ...serializables: io.ISerializable[]) {
    return this.addTextScopeContent(position + 1, ...serializables);
  }

  private addTextScopeContent(
    where: number,
    ...serializables: io.ISerializable[]
  ) {
    const addedFunctionLabel =
      "Added to file " + this._existingTextDocument.fileName;
    const position = this._existingTextDocument.positionAt(where);
    const currentIndentation = this.getCurrentIndentation(position);

    this.createInsertedText(currentIndentation, serializables).forEach(
      (insertedText) => {
        this._edit.insert(
          this._existingTextDocument.uri,
          position,
          insertedText,
          {
            needsConfirmation: this._skipConfirm !== true,
            label: addedFunctionLabel,
          }
        );
      }
    );
  }

  private getCurrentIndentation(position: vscode.Position): string {
    const line = this._existingTextDocument.lineAt(position).text;
    const whiteSpaceMatch = line.match(/\s*/)?.[0] ?? "";
    return whiteSpaceMatch;
  }

  private createInsertedText(
    currentIndentation: string,
    serializables: io.ISerializable[]
  ) {
    return serializables
      .map((serializable) =>
        serializable.serialize(this._serializeOptions).toString()
      )
      .map((content) => content.trim())
      .filter((content) => content.length)
      .map((content) => {
        content = `\n${currentIndentation}${content}`;
        return content;
      });
  }
}
