// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as io from "./io";
import { FileHandler } from "./FileHandler";
import { Configuration } from "./Configuration";
import { WorkspaceDirectoryFinder } from "./WorkspaceDirectories";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Activating code-gen.cpp!"); // TODO logger!
  let config = Configuration.get();
  let workspaceDirectoryFinder = await WorkspaceDirectoryFinder.createAndScan(
    config
  );

  context.subscriptions.push(
    Configuration.registerOnChanged(async (updatedConfig) => {
      if (
        config.outputDirectorySelector.ignoredDirectories !==
          updatedConfig.outputDirectorySelector.ignoredDirectories &&
        config.outputDirectorySelector.useGitIgnore !==
          updatedConfig.outputDirectorySelector.useGitIgnore
      ) {
        workspaceDirectoryFinder = await WorkspaceDirectoryFinder.createAndScan(
          updatedConfig
        );
      }
      config = updatedConfig;
    })
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppSourceFromHeader",
      async (textEditor, edit) => {
        const fileHandler = FileHandler.createFromHeaderFile(
          textEditor.document,
          workspaceDirectoryFinder,
          config
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
            ...config,
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
