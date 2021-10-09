import { MemberFunctionIgnoringClassNames, IFunction } from "./TypeInterfaces";
import {
  removeDefaultInitializersFromArgs,
  joinNameScopesWithMemberFunctionName,
  joinNameScopesWithFunctionName,
} from "./utils";
import * as io from "../io";

class MemberFunctionBase
  extends io.TextScope
  implements IFunction, io.ISerializable
{
  constructor(
    public readonly name: string,
    public readonly returnVal: string,
    public readonly args: string,
    public readonly isConst: boolean,
    scope: io.TextScope,
    private readonly _classNameProvider: io.IClassNameProvider
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
        serial = this.getHeading(options) + " {\n";
        if (this.returnVal.length && this.returnVal !== "void") {
          serial +=
            "\t" + this.returnVal + " returnValue;\n\treturn returnValue;\n";
        }
        serial += "}";
        break;

      case io.SerializableMode.header:
        serial = this.getHeading(options) + ";";
        break;

      default:
        break;
    }

    return serial;
  }

  protected getHeading(options: io.SerializationOptions) {
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.implHeader:
      case io.SerializableMode.interfaceHeader:
        return (
          this.returnVal +
          " " +
          this.name +
          " (" +
          this.args +
          ")" +
          (this.isConst ? " const" : "")
        );
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        return (
          this.returnVal +
          " " +
          joinNameScopesWithMemberFunctionName(
            options.nameScopes,
            this._classNameProvider.getClassName(options.mode, true),
            this.name
          ) +
          " (" +
          removeDefaultInitializersFromArgs(this.args) +
          ")" +
          (this.isConst ? " const" : "")
        );
      default:
        break;
    }
  }
}
export class MemberFunction extends io.makeRangedSerializable(
  MemberFunctionBase
) {}
class VirtualMemberFunctionUnranged extends MemberFunctionBase {
  constructor(
    name: string,
    returnVal: string,
    args: string,
    isConst: boolean,
    scope: io.TextScope,
    classNameProvider: io.IClassNameProvider
  ) {
    super(name, returnVal, args, isConst, scope, classNameProvider);
  }

  serialize(options: io.SerializationOptions) {
    let serial = "";

    switch (options.mode) {
      case io.SerializableMode.header:
        serial = super.getHeading(options) + " override;";
        break;

      case io.SerializableMode.interfaceHeader:
        serial = "virtual " + super.getHeading(options) + " =0;";
        break;

      default:
        serial = super.serialize(options);
        break;
    }

    return serial;
  }
}
export class VirtualMemberFunction extends io.makeRangedSerializable(
  VirtualMemberFunctionUnranged
) {}
class StaticMemberFunctionUnranged extends MemberFunctionBase {
  constructor(
    name: string,
    returnVal: string,
    args: string,
    isConst: boolean,
    scope: io.TextScope,
    classNameProvider: io.IClassNameProvider
  ) {
    super(name, returnVal, args, isConst, scope, classNameProvider);
  }

  serialize(options: io.SerializationOptions) {
    let serial = "";

    switch (options.mode) {
      case io.SerializableMode.source:
        serial = this.getHeading(options) + " {\n";
        if (this.returnVal !== "void") {
          serial +=
            "\t" + this.returnVal + " returnValue;\n\treturn returnValue;\n";
        }
        serial += "}";
        break;

      case io.SerializableMode.header:
        serial = "static " + this.getHeading(options) + ";";
        break;

      default:
        break;
    }

    return serial;
  }
}

export class StaticMemberFunction extends io.makeRangedSerializable(
  StaticMemberFunctionUnranged
) {}

export class PureVirtualMemberFunctionUnranged extends MemberFunctionBase {
  constructor(
    name: string,
    returnVal: string,
    args: string,
    isConst: boolean,
    scope: io.TextScope,
    classNameProvider: io.IClassNameProvider
  ) {
    super(name, returnVal, args, isConst, scope, classNameProvider);
  }

  serialize(options: io.SerializationOptions) {
    let serial = "";

    switch (options.mode) {
      case io.SerializableMode.header:
        serial = "virtual " + super.getHeading(options) + " =0;";
        break;

      case io.SerializableMode.implHeader:
        serial = super.getHeading(options) + " override;";
        break;

      case io.SerializableMode.implSource:
        serial = this.getHeading(options) + " {\n";
        if (this.returnVal !== "void") {
          serial +=
            "\t" + this.returnVal + " returnValue;\n\treturn returnValue;\n";
        }
        serial += "}";
        break;

      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.source:
      default:
        serial = "";
        break;
    }

    return serial;
  }
}

export class PureVirtualMemberFunction extends io.makeRangedSerializable(
  PureVirtualMemberFunctionUnranged
) {}

class FriendFunctionUnranged
  extends io.TextScope
  implements IFunction, MemberFunctionIgnoringClassNames
{
  constructor(
    public readonly name: string,
    public readonly returnVal: string,
    public readonly args: string,
    public readonly isConst: boolean,
    scope: io.TextScope
  ) {
    super(scope.scopeStart, scope.scopeEnd);
  }
  ignoresClassNames: boolean = true;

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
        serial = this.getHeading(options) + " {\n";
        if (this.returnVal.length && this.returnVal !== "void") {
          serial +=
            "\t" + this.returnVal + " returnValue;\n\treturn returnValue;\n";
        }
        serial += "}";
        break;

      case io.SerializableMode.header:
        serial = this.getHeading(options) + ";";
        break;

      default:
        break;
    }

    return serial;
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
          ")" +
          (this.isConst ? " const" : "")
        );
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        return (
          this.returnVal +
          " " +
          joinNameScopesWithFunctionName(options.nameScopes, this.name) +
          " (" +
          removeDefaultInitializersFromArgs(this.args) +
          ")" +
          (this.isConst ? " const" : "")
        );
      default:
        break;
    }
  }
}
export class FriendFunction extends io.makeRangedSerializable(
  FriendFunctionUnranged
) {}
