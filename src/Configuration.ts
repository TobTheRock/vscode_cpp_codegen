import * as vscode from "vscode";

function getConfigArray<T>(section: string): T[] {
  const config = vscode.workspace.getConfiguration();
  return config.get(section) ?? [];
}

function getConfigString(section: string): string {
  const config = vscode.workspace.getConfiguration();
  return config.get(section) ?? "";
}

function getConfigBool(section: string): boolean {
  const config = vscode.workspace.getConfiguration();
  return config.get(section) ?? false;
}

export enum DirectorySelectorMode {
  disabled = "Disabled",
  quickPick = "QuickPick",
  ui = "UI",
}
function getOutputDirectorySelectorMode(): DirectorySelectorMode {
  switch (getConfigString("codegen-cpp.OutputDirectorySelector.Mode")) {
    case DirectorySelectorMode.quickPick:
      return DirectorySelectorMode.quickPick;
    case DirectorySelectorMode.ui:
      return DirectorySelectorMode.ui;

    case DirectorySelectorMode.disabled:
    default:
      return DirectorySelectorMode.disabled;
  }
}

export enum SourceFileNamespaceSerialization {
  named = "Named",
  prepended = "Prepended",
}
function getSourceFileNamespaceSerialization(): SourceFileNamespaceSerialization {
  switch (getConfigString("codegen-cpp.SourceFileNamespace.Serialization")) {
    case SourceFileNamespaceSerialization.prepended:
      return SourceFileNamespaceSerialization.prepended;
    case SourceFileNamespaceSerialization.named:
    default:
      return SourceFileNamespaceSerialization.named;
  }
}

export enum RefactoringPreview {
  always = "Always",
  never = "Never",
  deletion = "Deletion",
  adding = "Adding",
}
function getRefactorPreview(): RefactoringPreview {
  switch (getConfigString("codegen-cpp.RefactoringPreview")) {
    case RefactoringPreview.adding:
      return RefactoringPreview.adding;
    case RefactoringPreview.deletion:
      return RefactoringPreview.deletion;
    case RefactoringPreview.never:
      return RefactoringPreview.never;
    case RefactoringPreview.always:
    default:
      return RefactoringPreview.always;
  }
}

interface IFileHeaderSection {
  forCppSource: string;
  forCppHeader: string;
}
interface IOutputFileExtensionSection {
  forCppSource: string;
  forCppHeader: string;
  forCSource: string;
  forCHeader: string;
}
interface IOutputDirectorySelectorSection {
  mode: DirectorySelectorMode;
  ignoredDirectories: string[];
  useGitIgnore: boolean;
}

interface IInterfaceSection {
  namePattern: string;
  deduceImplementationName: boolean;
}

interface IAbstractFactorySection {
  namePattern: string;
  deduceImplementationName: boolean;
}

interface ISourceFileCompletionProviderSection {
  trigger: string;
  enable: boolean;
}
export interface IExtensionConfiguration {
  fileHeader: IFileHeaderSection;
  outputFileExtension: IOutputFileExtensionSection;
  outputDirectorySelector: IOutputDirectorySelectorSection;
  deduceOutputFileNames: boolean;
  sourceFileNamespaceSerialization: SourceFileNamespaceSerialization;
  refactoringPreview: RefactoringPreview;
  interface: IInterfaceSection;
  abstractFactory: IAbstractFactorySection;
  sourceFileCompletionProvider: ISourceFileCompletionProviderSection;
}

export class Configuration {
  static get(): IExtensionConfiguration {
    if (!this._config) {
      this._config = this.read();
    }

    return this._config;
  }

  static registerOnChanged(
    callback: (updatedConfig: IExtensionConfiguration) => void | Promise<void>
  ): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("codegen-cpp")) {
        this._config = this.read();
        await callback(this._config);
      }
    });
  }
  private static read(): IExtensionConfiguration {
    const fileHeader: IFileHeaderSection = {
      forCppSource:
        getConfigArray("codegen-cpp.FileHeader.ForC++Source").join("\n") + "\n",
      forCppHeader:
        getConfigArray("codegen-cpp.FileHeader.ForC++Header").join("\n") + "\n",
    };

    const outputFileExtension: IOutputFileExtensionSection = {
      forCppSource: getConfigString(
        "codegen-cpp.OutputFileExtension.ForC++Source"
      ),
      forCppHeader: getConfigString(
        "codegen-cpp.OutputFileExtension.ForC++Header"
      ),
      forCSource: getConfigString("codegen-cpp.OutputFileExtension.ForCSource"),
      forCHeader: getConfigString("codegen-cpp.OutputFileExtension.ForCHeader"),
    };

    const outputDirectorySelector: IOutputDirectorySelectorSection = {
      mode: getOutputDirectorySelectorMode(),
      ignoredDirectories: getConfigArray(
        "codegen-cpp.OutputDirectorySelector.IgnoredDirectories"
      ),
      useGitIgnore: getConfigBool(
        "codegen-cpp.OutputDirectorySelector.UseGitIgnore"
      ),
    };

    const sourceFileNamespaceSerialization =
      getSourceFileNamespaceSerialization();

    const refactoringPreview = getRefactorPreview();

    const interfaceSection = {
      namePattern: getConfigString("codegen-cpp.Interface.NamePattern"),
      deduceImplementationName: getConfigBool(
        "codegen-cpp.Interface.DeduceImplementationName"
      ),
    };

    const abstractFactory = {
      namePattern: getConfigString("codegen-cpp.AbstractFactory.NamePattern"),
      deduceImplementationName: getConfigBool(
        "codegen-cpp.AbstractFactory.DeduceFactoryName"
      ),
    };

    const sourceFileCompletionProvider = {
      trigger: getConfigString(
        "codegen-cpp.SourceFileCompletionProvider.Trigger"
      ),
      enable: getConfigBool("codegen-cpp.SourceFileCompletionProvider.Enable"),
    };

    return {
      fileHeader,
      outputFileExtension,
      outputDirectorySelector,
      deduceOutputFileNames: getConfigBool("codegen-cpp.deduceOutputFileNames"),
      sourceFileNamespaceSerialization,
      refactoringPreview,
      interface: interfaceSection,
      abstractFactory,
      sourceFileCompletionProvider,
    };
  }

  private static _config: IExtensionConfiguration | undefined;
}

export enum Language {
  cpp,
  c,
}

export function getLanguage(document: vscode.TextDocument): Language {
  const languageId = document.languageId;
  if (languageId === "cpp") {
    return Language.cpp;
  } else if (languageId === "c") {
    return Language.c;
  } else {
    return Language.cpp;
  }
}
