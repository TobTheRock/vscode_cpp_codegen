import * as io from "../io";
import { FunctionBase } from "./CommonFunction";
import { IFunction } from "./TypeInterfaces";
import {
  joinNameScopesWithFunctionName,
  removeDefaultInitializersFromArgs,
} from "./utils";

class StandaloneFunctionBase extends FunctionBase implements IFunction {
  constructor(
    public readonly name: string,
    public readonly returnVal: string,
    public readonly args: string,
    scope: io.TextScope
  ) {
    super(name, returnVal, args, scope);
  }

  protected getHeading(options: io.SerializationOptions): string {
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.implHeader:
      case io.SerializableMode.interfaceHeader:
        return this.returnVal + " " + this.name + "(" + this.args + ")";

      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        return `${this.returnVal} ${this.getDefinitionSignature(options)}`;

      case io.SerializableMode.completionItemLabel:
        return this.getDefinitionSignature(options);

      default:
        return "";
    }
  }
  private getDefinitionSignature(options: io.SerializationOptions): string {
    return (
      joinNameScopesWithFunctionName(options.nameScopes, this.name) +
      "(" +
      removeDefaultInitializersFromArgs(this.args) +
      ")"
    );
  }

  serialize(options: io.SerializationOptions): io.Text {
    const text = io.Text.createEmpty(options.indentStep);

    switch (options.mode) {
      case io.SerializableMode.source:
        return this.serializeDefinition(text, options);

      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.implHeader:
        return this.serializeDeclaration(text, options);

      case io.SerializableMode.completionItemLabel:
        return this.serializeCompletionItemLable(options);

      default:
        return text;
    }
  }
}

export class StandaloneFunction extends io.makeRangedSerializable(
  StandaloneFunctionBase
) {}
