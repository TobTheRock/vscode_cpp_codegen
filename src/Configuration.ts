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
export module Configuration {
  export function getFileHeaderForCppSource(): string {
    const lines: string[] = getConfigArray(
      "codegen-cpp.FileHeader.ForC++Source"
    );
    let header = "";
    for (const line of lines) {
      header += line + "\n";
    }
    return header;
  }

  export function getFileHeaderForCppHeader(): string {
    const lines: string[] = getConfigArray(
      "codegen-cpp.FileHeader.ForC++Header"
    );
    let header = "";
    for (const line of lines) {
      header += line + "\n";
    }
    return header;
  }

  export function getDeduceFileNames(): boolean {
    return getConfigBool("codegen-cpp.deduceOutputFileNames");
  }

  export function getOutputFileExtensionForCppSource(): string {
    return getConfigString("codegen-cpp.OutputFileExtension.ForC++Source");
  }

  export function getOutputFileExtensionForCppHeader(): string {
    return getConfigString("codegen-cpp.OutputFileExtension.ForC++Header");
  }

  export function getOutputDirectorySelectorMode(): DirectorySelectorMode {
    switch (getConfigString("codegen-cpp.OutputDirectorySelector.Mode")) {
      case DirectorySelectorMode.quickPick:
        return DirectorySelectorMode.quickPick;
      case DirectorySelectorMode.ui:
        return DirectorySelectorMode.ui;

      case DirectorySelectorMode.disabled:
      default:
        return DirectorySelectorMode.disabled;
        break;
    }
  }

  export function getOutputDirectorySelectorIgnoredDirectories(): string[] {
    return getConfigArray(
      "codegen-cpp.OutputDirectorySelector.IgnoredDirectories"
    );
  }

  export function getOutputDirectorySelectorUseGitIgnore(): boolean {
    return getConfigBool("codegen-cpp.OutputDirectorySelector.UseGitIgnore");
  }
}
