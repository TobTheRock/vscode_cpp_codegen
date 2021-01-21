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
		const fileHandler = io.FileHandler.createFromHeaderFile(textEditor.document, {keepFileNameOnWrite : true});
		if (!fileHandler) {
			console.error("Could not create file handler");
			return;
		}
		try {
			await fileHandler.writeFileAs(io.SerializableMode.source);
		} catch (error) {
			vscode.window.showErrorMessage("Unable to write source file: ", error);
			return;
		}
	}));


	context.subscriptions.push( vscode.commands.registerTextEditorCommand('codegen-cpp.cppInterfaceImplFromHeader', async (textEditor, edit) => {
		const fileHandler = io.FileHandler.createFromHeaderFile(textEditor.document, {askForInterfaceNames : true});
		if (!fileHandler) {
			console.error("Could not create file handler");
			return;
		}
		
		try {
			await fileHandler.writeFileAs(io.SerializableMode.implHeader, io.SerializableMode.implSource);
		} catch (error) {
			vscode.window.showErrorMessage("Unable to create implentation source/header file: ", error);
			return;
		}
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {}
