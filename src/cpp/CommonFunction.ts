import * as io from "../io";
import { IFunction } from "./TypeInterfaces";

export class FunctionBase
  extends io.TextScope
  implements IFunction, io.ISerializable
{
  constructor(
    public readonly name: string,
    public readonly returnVal: string,
    public readonly args: string,
    scope: io.TextScope
  ) {
    super(scope.scopeStart, scope.scopeEnd);
  }

  equals(other: IFunction, mode?: io.SerializableMode): boolean {
    return (
      this.name === other.name &&
      this.args === other.args &&
      this.returnVal === other.returnVal
    );
  }

  serialize(options: io.SerializationOptions): io.Text {
    throw new Error("Method not implemented.");
  }

  protected getHeading(options: io.SerializationOptions) {
    throw new Error("Method not implemented.");
  }

  protected addDefinition(
    text: io.Text,
    options: io.SerializationOptions
  ): io.Text {
    text.addLine(this.getHeading(options) + " {");
    if (this.returnVal.length && this.returnVal !== "void") {
      text
        .addLine(this.returnVal + " returnValue;", 1)
        .addLine("return returnValue;", 1);
    }
    text.addLine("}");
    return text;
  }

  protected addDeclaration(
    text: io.Text,
    options: io.SerializationOptions,
    prefix: string = "",
    postfix: string = ""
  ): io.Text {
    return text.addLine(`${prefix}${this.getHeading(options)}${postfix};`);
  }
}
