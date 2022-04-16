import { INamespace, IParser } from "./TypeInterfaces";
import * as io from "../io";
import * as path from "path";
import { HeaderParser } from "./HeaderParser";
import { SourceParser } from "./SourceParser";
import { Language } from "../Configuration";

export interface IFile extends io.IDeserializable {
  readonly directory: string;
  readonly basename: string;
  readonly extension: string;
  readonly language: Language;
  readonly rootNamespace: INamespace;
}

abstract class FileBase implements IFile {
  constructor(
    filePath: string,
    content: string,
    public language: Language,
    private _parser: IParser
  ) {
    this.directory = path.dirname(filePath);
    this.extension = filePath.split(".").slice(-1)[0];
    this.basename = path.basename(filePath, "." + this.extension);

    const textFragment = content.length
      ? io.TextFragment.createFromString(content)
      : io.TextFragment.createEmpty();

    this.deserialize(textFragment);
  }

  deserialize(data: io.TextFragment): void {
    this._parser.parseComments(data);
    this._rootNamespace = this._parser.parseRootNamespace(data);
  }

  getPath(): string {
    return path.join(this.directory, this.basename) + "." + this.extension;
  }

  get rootNamespace() {
    return this._rootNamespace;
  }

  readonly directory: string;
  readonly basename: string;
  readonly extension: string;
  private _rootNamespace!: INamespace;
}

export class SourceFile extends FileBase {
  constructor(filePath: string, content: string, language: Language) {
    super(filePath, content, language, SourceParser);
  }
}

export class HeaderFile extends FileBase {
  constructor(filePath: string, content: string, language: Language) {
    super(filePath, content, language, HeaderParser);
  }

  serialize(options: io.SerializationOptions): string {
    return this.rootNamespace.serialize(options).toString();
  }
}
