import { INamespace } from "./TypeInterfaces";
import { HeaderParser } from "../io/HeaderParser";
import * as io from "../io";
import { FileBase } from "./FileBase";
import { IFile } from "../FileHandler";

export class HeaderFile extends FileBase implements IFile {
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

  serialize(options: io.SerializationOptions) {
    return io.serializeArray(this._namespaces, options);
  }

  static generateFileHeader(
    outputFilePath: string,
    fileHeader: string,
    ...fileIncludePaths: string[]
  ): string {
    fileHeader += "\n#pragma once\n\n"; // TODO config for include guards
    fileHeader += super.createIncludeStatements(
      outputFilePath,
      ...fileIncludePaths
    );
    return fileHeader;
  }

  private readonly _namespaces: INamespace[];
}
