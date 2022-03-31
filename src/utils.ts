import * as vscode from "vscode";

export async function asyncForEach<Type>(
  array: Type[],
  asyncIterator: (item: Type, index: number) => void | Promise<void>,
  onReject?: (error: any) => void
): Promise<void> {
  const promises = array.map((item: Type, index: number) =>
    asyncIterator(item, index)
  );
  const allPromise = Promise.all(promises);
  if (onReject) {
    allPromise.catch((error) => onReject(error));
  }
  await allPromise;
}

export async function awaitMapEntries<KeyType, ValueType>(
  map: Map<KeyType, Promise<ValueType>>
): Promise<Map<KeyType, ValueType>> {
  const syncedMap = new Map<KeyType, ValueType>();
  for (const [key, value] of map) {
    const syncedValue = await value;
    syncedMap.set(key, syncedValue);
  }
  return syncedMap;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "UNKOWN";
}
type FileConstructor<T> = new (name: string, content: string) => T;
export function createCppFileFromDocument<T>(
  ctor: FileConstructor<T>,
  document: vscode.TextDocument
): T | undefined {
  try {
    return new ctor(document.fileName, document.getText());
  } catch (error) {
    vscode.window.showErrorMessage(
      "Unable to parse file: " + getErrorMessage(error)
    );
    return;
  }
}
export function getActiveEditorIndentStep(): string {
  const activeEditor = vscode.window.activeTextEditor;
  const useSpaces = activeEditor?.options.insertSpaces;
  const tabSize = activeEditor?.options.tabSize as number;

  return useSpaces && tabSize ? " ".repeat(tabSize) : "\t";
}
