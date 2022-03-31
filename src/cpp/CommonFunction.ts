import * as io from "../io";
import { IFunction } from "./TypeInterfaces";

export abstract class FunctionBase
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

  protected getHeading(options: io.SerializationOptions): string {
    throw new Error("Method not implemented.");
  }

  protected serializeDefinition(
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

  protected serializeDeclaration(
    text: io.Text,
    options: io.SerializationOptions,
    prefix: string = "",
    postfix: string = ""
  ): io.Text {
    return text.addLine(`${prefix}${this.getHeading(options)}${postfix};`);
  }

  protected serializeCompletionItemLable(
    options: io.SerializationOptions
  ): io.Text {
    return io.Text.createEmpty().addLine(this.getHeading(options));
  }
}
