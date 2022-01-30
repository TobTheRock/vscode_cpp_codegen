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
  workspaceDirectoryFinder: ui.WorkspaceDirectoryFinder,
  config: IExtensionConfiguration,
  selection?: io.TextScope,
  ...modes: io.SerializableMode[]
) {
  const fileHandler = new HeaderFileHandler(
    headerFile,
    new vscode.WorkspaceEdit(),
    workspaceDirectoryFinder,
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
  console.log("Activating code-gen.cpp!"); // TODO logger!
  let config = Configuration.get();
  let workspaceDirectoryFinder = new ui.WorkspaceDirectoryFinder(config);

  context.subscriptions.push(
    Configuration.registerOnChanged(async (updatedConfig) => {
      if (
        config.outputDirectorySelector.ignoredDirectories !==
          updatedConfig.outputDirectorySelector.ignoredDirectories &&
        config.outputDirectorySelector.useGitIgnore !==
          updatedConfig.outputDirectorySelector.useGitIgnore
      ) {
        workspaceDirectoryFinder = new ui.WorkspaceDirectoryFinder(
          updatedConfig
        );
        await workspaceDirectoryFinder.scan();
      }
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
            workspaceDirectoryFinder,
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
            workspaceDirectoryFinder,
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
            workspaceDirectoryFinder,
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
            workspaceDirectoryFinder,
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
      generateStubsFromHeader(
        headerFile,
        workspaceDirectoryFinder,
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

  await workspaceDirectoryFinder.scan();
}

// this method is called when your extension is deactivated
export function deactivate() {}
