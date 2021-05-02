import { INamespace } from "./TypeInterfaces";
import { HeaderParser } from "../io/HeaderParser";
import { Configuration } from "../Configuration";
import * as io from "../io";
import * as path from "path";

export class FileBase {
  protected constructor(filePath: string) {
    this.directory = path.dirname(filePath);
    this.extension = filePath.split(".").slice(-1)[0];
    this.basename = path.basename(filePath, "." + this.extension);
  }

  getPath(): string {
    return path.join(this.directory, this.basename) + "." + this.extension;
  }

  readonly directory: string;
  readonly basename: string;
  readonly extension: string;
}

export class SourceFile extends FileBase {
  constructor(filePath: string, content: string) {
    super(filePath);
    const fileContent = io.TextFragment.createFromString(content);
    io.SourceParser.parseComments(fileContent);
    this.namespaces = io.SourceParser.parseNamespaces(fileContent);
  }

  readonly namespaces: io.ISourceFileNamespace[];
}

export class HeaderFile extends FileBase implements io.IFile {
  constructor(filePath: string, content: string) {
    super(filePath);
    this._namespaces = [];
    this.deserialize(io.TextFragment.createFromString(content));
  }

  deserialize(fileContent: io.TextFragment) {
    HeaderParser.parseComments(fileContent);
    this._namespaces.push(...HeaderParser.parseNamespaces(fileContent));
    this._namespaces.push(...HeaderParser.parseNoneNamespaces(fileContent));
  }

  async serialize(options: io.SerializationOptions): Promise<string> {
    return await io.serializeArray(this._namespaces, options, undefined, "\n");
  }

  private readonly _namespaces: INamespace[];
}
