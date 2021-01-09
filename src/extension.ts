// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as io from './io';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Activating code-gen.cpp!'); // TODO logger!

	let disposable = vscode.commands.registerTextEditorCommand('codegen-cpp.cppSourceFromHeader', (textEditor, edit) => {
		let file:io.TextFile;
        try {
			file = io.TextFile.createFromHeaderFile(textEditor.document);
		} catch (error) {
			vscode.window.showErrorMessage("Unable to parse header file: ", error); // TODO wrap error/warn/info messages
			return;
		}

        try {
			file.writeAs(io.SerializableMode.Source);
		} catch (error) {
			vscode.window.showErrorMessage("Unable write source file: ", error);
			return;
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
