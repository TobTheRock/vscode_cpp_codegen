import * as io from "../io";
import { IFunction } from "./TypeInterfaces";
import {
  joinNameScopesWithFunctionName,
  removeDefaultInitializersFromArgs,
} from "./utils";

class StandaloneFunctionBase extends io.TextScope implements IFunction {
  constructor(
    public readonly name: string,
    public readonly returnVal: string,
    public readonly args: string,
    scope: io.TextScope
  ) {
    super(scope.scopeStart, scope.scopeEnd);
  }
  equals(other: IFunction): boolean {
    return (
      this.name === other.name &&
      this.args === other.args &&
      this.returnVal === other.returnVal
    );
  }

  serialize(options: io.SerializationOptions) {
    let serial = "";

    switch (options.mode) {
      case io.SerializableMode.source:
        serial =
          this.returnVal +
          " " +
          joinNameScopesWithFunctionName(options.nameScopes, this.name) +
          " (" +
          removeDefaultInitializersFromArgs(this.args) +
          " )" +
          " {\n";
        if (this.returnVal !== "void") {
          serial =
            serial + this.returnVal + " returnValue;\n return returnValue;\n";
        }
        serial += "}\n";
        break;

      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.implHeader:
        serial =
          this.returnVal + " " + this.name + " (" + this.args + " )" + "\n;";
        break;

      default:
        break;
    }

    return serial;
  }
}

export class StandaloneFunction extends io.makeRangedSerializable(
  StandaloneFunctionBase
) {}
