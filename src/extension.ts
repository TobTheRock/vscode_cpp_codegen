// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as io from "./io";
import * as cpp from "./cpp";
import * as ui from "./ui";
import {
  Configuration,
  getLanguage,
  IExtensionConfiguration,
} from "./Configuration";
import { HeaderFileHandler } from "./HeaderFileHandler";
import { createFileFromDocument, getErrorMessage } from "./utils";
import { SourceFileCompletionProvider } from "./SourceFileCompletionProvider";

export async function activate(context: vscode.ExtensionContext) {
  let config = Configuration.get();
  setSupportedHeaderExtensions(config);

  context.subscriptions.push(
    Configuration.registerOnChanged(async (updatedConfig) => {
      config = updatedConfig;
      registerCompletionProvider(config);
      setSupportedHeaderExtensions(config);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppSourceFromHeader",
      async (textEditor, edit) => {
        await createSourceFromHeader(textEditor);
      }
    ),
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppSourceFromHeaderSelection",
      async (textEditor, edit) => {
        const selection = getSelection(textEditor);
        await createSourceFromHeader(textEditor, selection);
      }
    ),
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppInterfaceImplFromHeader",
      async (textEditor, edit) => {
        await createImplFromHeader(textEditor);
      }
    ),
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppInterfaceImplFromHeaderSelection",
      async (textEditor, edit) => {
        const selection = getSelection(textEditor);
        await createImplFromHeader(textEditor, selection);
      }
    ),
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppAbstractFactoryFromHeader",
      async (textEditor, edit) => {
        await createAbstractFactory(textEditor);
      }
    ),
    vscode.commands.registerTextEditorCommand(
      "codegen-cpp.cppAbstractFactoryFromHeaderSelection",
      async (textEditor, edit) => {
        const selection = getSelection(textEditor);
        await createAbstractFactory(textEditor, selection);
      }
    )
  );

  registerCompletionProvider(config);

  async function createSourceFromHeader(
    textEditor: vscode.TextEditor,
    selection?: io.TextScope
  ) {
    createHeaderFileAndGenerateStubs(
      textEditor,
      config,
      selection,
      io.SerializableMode.source
    );
  }

  async function createImplFromHeader(
    textEditor: vscode.TextEditor,
    selection?: io.TextScope
  ) {
    createHeaderFileAndGenerateStubs(
      textEditor,
      config,
      selection,
      io.SerializableMode.implHeader,
      io.SerializableMode.implSource
    );
  }

  async function createAbstractFactory(
    textEditor: vscode.TextEditor,
    selection?: io.TextScope
  ) {
    createHeaderFileAndGenerateStubs(
      textEditor,
      config,
      selection,
      io.SerializableMode.abstractFactoryHeader
    );
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}

function setSupportedHeaderExtensions(config: IExtensionConfiguration) {
  const supportedHeaderExtensions = [
    `.${config.outputFileExtension.forCppHeader}`,
    `.${config.outputFileExtension.forCHeader}`,
    ".h",
    ".hpp",
    ".hh",
    ".hxx",
    ".h++",
    ".H",
    ".HPP",
    ".HH",
    ".HXX",
    ".H++",
  ];
  vscode.commands.executeCommand(
    "setContext",
    "codegen-cpp.headerFileExt",
    supportedHeaderExtensions
  );
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

async function createHeaderFileAndGenerateStubs(
  textEditor: vscode.TextEditor,
  config: IExtensionConfiguration,
  selection?: io.TextScope,
  ...modes: io.SerializableMode[]
) {
  const headerFile = createHeaderFile(textEditor);
  if (headerFile) {
    await generateStubsFromHeader(headerFile, config, selection, ...modes);
  }
}

function createHeaderFile(
  textEditor: vscode.TextEditor
): cpp.HeaderFile | undefined {
  return createFileFromDocument(cpp.HeaderFile, textEditor.document);
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

function registerCompletionProvider(config: IExtensionConfiguration) {
  vscode.languages.registerCompletionItemProvider(
    ["c", "cpp"],
    new SourceFileCompletionProvider(config),
    config.sourceFileCompletionProvider.trigger
  );
}
