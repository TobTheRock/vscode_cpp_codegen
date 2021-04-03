import { workspaceDirectoryFinder } from "./WorkspaceDirectories";
import { SourceFileMerger } from "./SourceFileMerger";
import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Configuration, DirectorySelectorMode } from "./Configuration";

// TODO move interfaces to seperate files
export interface IFile extends io.ISerializable, io.IDeserializable {
  getPath(): string;
  readonly directory: string;
  readonly basename: string;
  readonly extension: string;
}

class DirectoryItem implements vscode.QuickPickItem {
  label: string;
  description: string;
  constructor(
    public readonly absolutePath: string,
    public readonly rootDir: string
  ) {
    this.label = "." + path.sep + path.relative(rootDir, absolutePath);
    this.description = rootDir;
  }
}

export interface FileHandlerOptions {
  outputDirectory?: string;
  keepFileNameOnWrite?: boolean;
  useClassNameAsFileName?: boolean;
  askForInterfaceImplementationNames?: boolean;
}

interface SerializedContent {
  mode: io.SerializableMode;
  content: string;
}
class FileHandlerContext {
  outputDirectory: string = "";
  outputFilename: string = "";
  outputContent: SerializedContent[] = [];
  edit = new vscode.WorkspaceEdit();
}
export class FileHandler {
  private constructor(
    private readonly _file: IFile,
    private readonly _opt: FileHandlerOptions
  ) {}

  static createFromHeaderFile(
    vscDocument: vscode.TextDocument,
    opt: FileHandlerOptions = {}
  ): FileHandler | undefined {
    //TODO check file ending?
    try {
      var file = new cpp.HeaderFile(
        vscDocument.fileName,
        vscDocument.getText()
      );
    } catch (error) {
      vscode.window.showErrorMessage("Unable to parse header file: ", error);
      return;
    }
    return new FileHandler(file, opt);
  }

  async writeFileAs(...modes: io.SerializableMode[]) {
    this._context = new FileHandlerContext();

    if (this._opt.outputDirectory) {
      this._context.outputDirectory = this._opt.outputDirectory;
    } else {
      let mayBeDirectory = await this.selectDirectory(this._file.directory);
      if (!mayBeDirectory) {
        throw Error("No output directory was provided!");
      }
      this._context.outputDirectory = mayBeDirectory;
    }

    await this.serializeAll(modes);

    if (this._opt.keepFileNameOnWrite) {
      this._context.outputFilename = this._file.basename;
    } else if (!this._context.outputFilename.length) {
      let mayBeFileBaseName = await this.askForFileName();
      if (!mayBeFileBaseName?.length) {
        console.log("No input was provided!");
        return;
      }
      this._context.outputFilename = mayBeFileBaseName;
    }

    await this.generateHeaderAndTryWriteAll();
    // await vscode.workspace.applyEdit(this._context.edit);
    return;
  }

  selectDirectory(initialDirectory: string) {
    const mode = Configuration.getOutputDirectorySelectorMode();
    switch (mode) {
      case DirectorySelectorMode.quickPick:
        return this.showDirectoryQuickPick(initialDirectory);

      case DirectorySelectorMode.ui:
        return vscode.window
          .showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            defaultUri: vscode.Uri.file(initialDirectory),
            openLabel: "Select",
            title: "Select an output directory",
          })
          .then((uris) => {
            if (uris?.length) {
              return uris[0].fsPath;
            }
            return undefined;
          });

      case DirectorySelectorMode.disabled:
      default:
        return initialDirectory;
    }
  }

  async showDirectoryQuickPick(
    defaultValue: string = ""
  ): Promise<string | undefined> {
    const disposables: vscode.Disposable[] = [];
    try {
      return await new Promise<string | undefined>((resolve) => {
        const workspaceDirs = workspaceDirectoryFinder.getDirectories();
        const workspaceRootDirs = workspaceDirectoryFinder.getRootDirectories();

        const quickPickInput = vscode.window.createQuickPick<DirectoryItem>();
        quickPickInput.placeholder = "Select output directory...";
        quickPickInput.items = workspaceDirs; //TODO large directories
        if (path.isAbsolute(defaultValue)) {
          for (let index = 0; index < workspaceRootDirs.length; index++) {
            const rootDir = workspaceRootDirs[index];
            if (defaultValue.startsWith(rootDir)) {
              quickPickInput.value = new DirectoryItem(
                defaultValue,
                rootDir
              ).label;
              break;
            }
          }
        } else {
          quickPickInput.value = defaultValue;
        }

        let lastItem = quickPickInput.items[0];
        disposables.push(
          quickPickInput.onDidChangeValue((value) => {
            return value;
          }),
          quickPickInput.onDidChangeActive((items) => {
            const item = items[0];
            if (item && lastItem !== item) {
              quickPickInput.value = item.label;
              lastItem = item;
            }
          }),
          quickPickInput.onDidAccept(() => {
            resolve(quickPickInput.selectedItems[0].absolutePath);
            quickPickInput.hide();
          }),
          quickPickInput.onDidHide(() => {
            resolve(undefined);
            quickPickInput.dispose();
          })
        );
        quickPickInput.show();
      });
    } catch (error) {
      console.error("Could not open directory: ", error.message);
    } finally {
      disposables.forEach((d) => d.dispose());
    }
  }

  async askForFileName(): Promise<string | undefined> {
    let input = await vscode.window.showInputBox({
      prompt: "File base name of generated file(s):",
      placeHolder: this._file.basename,
    });

    return input;
  }

  private async generateHeaderAndTryWriteAll() {
    this._context.outputContent.forEach(async (serialized) => {
      const outputFilePath = path.join(
        this._context.outputDirectory,
        this.deduceOutputFilename(serialized.mode)
      );
      //TODO pretify output (configurable?)
      const outputContent =
        this.generateFileHeader(serialized.mode, outputFilePath) +
        serialized.content;
      if (!fs.existsSync(outputFilePath)) {
        await this.writeAndOpenFile(outputFilePath, outputContent);
      } else {
        switch (serialized.mode) {
          case io.SerializableMode.source:
            const sourceFileMerger = new SourceFileMerger(
              outputFilePath,
              outputContent
            );
            await sourceFileMerger.merge(this._context.edit);
            break;

          default:
            vscode.window.showErrorMessage(
              "Merging header files is not implemented yet"
            );
            break;
        }
      }

      return vscode.workspace.applyEdit(this._context.edit);
    });
  }

  private async writeAndOpenFile(
    outputFilePath: string,
    content: string
  ): Promise<void> {
    // TODO use edit
    try {
      await vscode.workspace.fs.writeFile(
        vscode.Uri.parse(outputFilePath),
        Buffer.from(content, "utf8")
      );
      await vscode.window.showTextDocument(vscode.Uri.file(outputFilePath));
    } catch (error) {
      vscode.window.showErrorMessage(error.message);
    }
  }

  private async serializeAll(modes: io.SerializableMode[]) {
    const nameInputProvider: io.INameInputProvider = {
      getInterfaceName: this._opt.askForInterfaceImplementationNames
        ? this.getInterfaceName.bind(this)
        : undefined,
    };

    return modes.reduce(async (accumulate, mode) => {
      await accumulate;
      let content = await this._file.serialize({ mode, nameInputProvider });
      this._context.outputContent.push({ mode, content });
    }, Promise.resolve());
  }

  private deduceOutputFilename(
    mode: io.SerializableMode,
    fileBaseName: string = this._context.outputFilename
  ): string {
    let deductedFilename: string;

    deductedFilename = fileBaseName;
    switch (mode) {
      // TODO make file endings configurable
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.implHeader:
        deductedFilename +=
          "." + Configuration.getOutputFileExtensionForCppHeader();
        break;
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        deductedFilename +=
          "." + Configuration.getOutputFileExtensionForCppSource();
        break;
    }
    return deductedFilename;
  }

  private generateFileHeader(
    mode: io.SerializableMode,
    outputFilePath: string
  ): string {
    let fileHeader = "";
    switch (mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
        fileHeader = cpp.HeaderFile.generateFileHeader(outputFilePath, "");
        break;
      case io.SerializableMode.implHeader:
        fileHeader = cpp.HeaderFile.generateFileHeader(
          outputFilePath,
          this._file.getPath()
        );
        break;
      case io.SerializableMode.source:
        fileHeader = cpp.SourceFile.generateFileHeader(
          outputFilePath,
          this._file.getPath()
        );
        break;
      case io.SerializableMode.implSource:
        // TODO find a nicer way to provide the path of the header path
        const headerOutputFilePath = path.join(
          path.dirname(outputFilePath),
          this.deduceOutputFilename(
            io.SerializableMode.header,
            path.basename(outputFilePath, ".cpp")
          )
        );
        fileHeader = cpp.SourceFile.generateFileHeader(
          outputFilePath,
          headerOutputFilePath
        );
        break;
    }
    return fileHeader;
  }

  private async getInterfaceName(origName: string): Promise<string> {
    let input = await vscode.window.showInputBox({
      prompt: "Enter name for implementation of interface:" + origName,
      placeHolder: origName + "Impl",
    });

    if (!input?.length) {
      throw new Error(
        "Aborting, no name was provided for interface: " + origName
      );
    }

    if (
      this._opt.useClassNameAsFileName &&
      !this._context.outputFilename.length
    ) {
      this._context.outputFilename = input;
    }

    return input;
  }

  private _context = new FileHandlerContext();
}
