import { FileBase } from "./FileBase";
import * as io from "../io";

export class SourceFile extends FileBase {
  constructor(filePath: string, content: string) {
    super(filePath);
    const fileContent = io.TextFragment.createFromString(content);
    io.SourceParser.parseComments(fileContent);
    this.namespaces = io.SourceParser.parseNamespaces(fileContent);
  }

  static generateFileHeader(
    outputFilePath: string,
    fileHeader: string,
    ...fileIncludePaths: string[]
  ): string {
    fileHeader += "\n";
    fileHeader += super.createIncludeStatements(
      outputFilePath,
      ...fileIncludePaths
    );
    return fileHeader;
  }

  readonly namespaces: io.ISourceFileNamespace[];
}
