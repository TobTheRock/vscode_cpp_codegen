// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as io from "./io";
import { FileHandler } from "./FileHandler";
import { Configuration } from "./Configuration";
import { WorkspaceDirectoryFinder } from "./WorkspaceDirectories";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Activating code-gen.cpp!"); // TODO logger!

  const workspaceDirectoryFinder = new WorkspaceDirectoryFinder();
  await workspaceDirectoryFinder.scan();

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppSourceFromHeader",
      async (textEditor, edit) => {
        const fileHandler = FileHandler.createFromHeaderFile(
          textEditor.document,
          workspaceDirectoryFinder,
          { keepFileNameOnWrite: Configuration.getDeduceFileNames() }
        );
        if (!fileHandler) {
          console.error("Could not create file handler");
          return;
        }
        try {
          await fileHandler.writeFileAs(io.SerializableMode.source);
        } catch (error) {
          vscode.window.showErrorMessage(
            "Unable to write source file: " + error.message
          );
          return;
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppInterfaceImplFromHeader",
      async (textEditor, edit) => {
        const fileHandler = FileHandler.createFromHeaderFile(
          textEditor.document,
          workspaceDirectoryFinder,
          {
            askForInterfaceImplementationNames: true,
            useClassNameAsFileName: Configuration.getDeduceFileNames(),
          }
        );
        if (!fileHandler) {
          console.error("Could not create file handler");
          return;
        }

        try {
          await fileHandler.writeFileAs(
            io.SerializableMode.implHeader,
            io.SerializableMode.implSource
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            "Unable to create implentation source/header file: " + error.message
          );
          return;
        }
      }
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
