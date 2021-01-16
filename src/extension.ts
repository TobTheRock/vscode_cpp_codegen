// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as io from './io';
import * as cpp from './cpp';
import { SerializableMode } from './io';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Activating code-gen.cpp!'); // TODO logger!

	context.subscriptions.push(vscode.commands.registerTextEditorCommand('codegen-cpp.cppSourceFromHeader', async (textEditor, edit) => {
		let file: cpp.HeaderFile;
        try {
			file = new cpp.HeaderFile(textEditor.document.fileName, textEditor.document.getText());
		} catch (error) {
			vscode.window.showErrorMessage("Unable to parse header file: ", error);
			return;
		}
		const fileHandler = new io.FileHandler(file);
		await fileHandler.writeFileAs(file.basename, io.SerializableMode.source);
	}));


	context.subscriptions.push( vscode.commands.registerTextEditorCommand('codegen-cpp.cppInterfaceImplFromHeader', async (textEditor, edit) => {
		let file: cpp.HeaderFile;
        try {
			file = new cpp.HeaderFile(textEditor.document.fileName, textEditor.document.getText());
		} catch (error) {
			vscode.window.showErrorMessage("Unable to parse header file '", textEditor.document.fileName, "' :" , error);
			return;
		}
		const fileHandler = new io.FileHandler(file);
		//TODO get implementation name from user, pass to ClassNameGenerator
		await vscode.window.showInputBox({
            "prompt": "File base name of generated files:",
			"placeHolder": (file.basename + "Impl")
        }).then(input => {
            if (!input?.length) {
                throw Error("No file base name was provided!");
            }
            else {
                return input as string;
            }
        }).then((input) => {
            return fileHandler.writeFileAs(input, io.SerializableMode.implHeader, io.SerializableMode.implSource);
        },
            (error: Error) => {
                vscode.window.showWarningMessage(error.message);
        });
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {}
