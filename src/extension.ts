// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as io from "./io";
import * as cpp from "./cpp";
import * as ui from "./ui";
import { Configuration, IExtensionConfiguration } from "./Configuration";
import { HeaderFileHandler } from "./HeaderFileHandler";
import { getErrorMessage } from "./utils";

function createHeaderFile(
  textEditor: vscode.TextEditor
): cpp.HeaderFile | undefined {
  try {
    return new cpp.HeaderFile(
      textEditor.document.fileName,
      textEditor.document.getText()
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      "Unable to parse header file: " + getErrorMessage(error)
    );
    return;
  }
}

function getSelection(textEditor: vscode.TextEditor): io.TextScope | undefined {
  const selectionStart = textEditor.document.offsetAt(
    textEditor.selection.start
  );
  const selectionEnd = textEditor.document.offsetAt(textEditor.selection.end);

  if (selectionEnd === selectionStart) {
    return;
  }

  return new io.TextScope(selectionStart, selectionEnd);
}

async function generateStubsFromHeader(
  headerFile: cpp.HeaderFile,
  config: IExtensionConfiguration,
  selection?: io.TextScope,
  ...modes: io.SerializableMode[]
) {
  const fileHandler = new HeaderFileHandler(
    headerFile,
    new vscode.WorkspaceEdit(),
    config
  );
  try {
    if (selection) {
      await fileHandler.writeFileSelectionAs(selection, ...modes);
    } else {
      await fileHandler.writeFileAs(...modes);
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      "Unable to generate stubs: " + getErrorMessage(error)
    );
  }
}

export async function activate(context: vscode.ExtensionContext) {
  let config = Configuration.get();

  context.subscriptions.push(
    Configuration.registerOnChanged(async (updatedConfig) => {
      config = updatedConfig;
    })
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppSourceFromHeader",
      async (textEditor, edit) => {
        const headerFile = createHeaderFile(textEditor);
        if (headerFile) {
          await generateStubsFromHeader(
            headerFile,
            config,
            undefined,
            io.SerializableMode.source
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppSourceFromHeaderSelection",
      async (textEditor, edit) => {
        const headerFile = createHeaderFile(textEditor);
        if (headerFile) {
          const selection = getSelection(textEditor);
          await generateStubsFromHeader(
            headerFile,
            config,
            selection,
            io.SerializableMode.source
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppInterfaceImplFromHeader",
      async (textEditor, edit) => {
        const headerFile = createHeaderFile(textEditor);
        if (headerFile) {
          await generateStubsFromHeader(
            headerFile,
            config,
            undefined,
            io.SerializableMode.implHeader,
            io.SerializableMode.implSource
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppInterfaceImplFromHeaderSelection",
      async (textEditor, edit) => {
        const headerFile = createHeaderFile(textEditor);
        if (headerFile) {
          const selection = getSelection(textEditor);
          await generateStubsFromHeader(
            headerFile,
            config,
            selection,
            io.SerializableMode.implSource,
            io.SerializableMode.implHeader
          );
        }
      }
    )
  );

  async function createAbstractFactory(
    textEditor: vscode.TextEditor,
    selection?: io.TextScope
  ) {
    const headerFile = createHeaderFile(textEditor);
    if (headerFile) {
      await generateStubsFromHeader(
        headerFile,
        config,
        selection,
        io.SerializableMode.abstractFactoryHeader
      );
    }
  }

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppAbstractFactoryFromHeader",
      async (textEditor, edit) => {
        await createAbstractFactory(textEditor);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppAbstractFactoryFromHeaderSelection",
      async (textEditor, edit) => {
        const selection = getSelection(textEditor);
        await createAbstractFactory(textEditor, selection);
      }
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
