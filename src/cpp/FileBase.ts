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

  static createIncludeStatements(
    outputFilePath: string,
    ...fileIncludePaths: string[]
  ): string {
    let fileHeader = "";
    fileIncludePaths.forEach((include) => {
      let relFilePath = path.relative(
        path.dirname(outputFilePath),
        path.dirname(include)
      );
      relFilePath = path.join(relFilePath, path.basename(include));
      fileHeader += '#include "' + relFilePath + '"\n';
    });
    fileHeader += "\n";
    return fileHeader;
  }

  readonly directory: string;
  readonly basename: string;
  readonly extension: string;
}
