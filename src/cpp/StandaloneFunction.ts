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

  protected getHeading(options: io.SerializationOptions) {
    const friendPrefix = "friend ";
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.implHeader:
      case io.SerializableMode.interfaceHeader:
        return (
          friendPrefix +
          this.returnVal +
          " " +
          this.name +
          " (" +
          this.args +
          ")"
        );
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        return (
          this.returnVal +
          " " +
          joinNameScopesWithFunctionName(options.nameScopes, this.name) +
          " (" +
          removeDefaultInitializersFromArgs(this.args) +
          ")"
        );
      default:
        break;
    }
  }

  serialize(options: io.SerializationOptions): io.Text {
    const text = io.Text.createEmpty(options.indentStep);

    switch (options.mode) {
      case io.SerializableMode.source:
        return this.addDefinition(text, options);

      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.implHeader:
        return this.addDeclaration(text, options);

      default:
        return text;
    }
  }
}

export class StandaloneFunction extends io.makeRangedSerializable(
  StandaloneFunctionBase
) {}
