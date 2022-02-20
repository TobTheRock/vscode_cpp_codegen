import { IMemberFunctionIgnoringClassNames, IFunction } from "./TypeInterfaces";
import {
  removeDefaultInitializersFromArgs,
  joinNameScopesWithMemberFunctionName,
  joinNameScopesWithFunctionName,
} from "./utils";
import * as io from "../io";
import { FunctionBase } from "./CommonFunction";
export class MemberFunctionBase
  extends FunctionBase
  implements IFunction, io.ISerializable
{
  constructor(
    name: string,
    returnVal: string,
    args: string,
    public readonly isConst: boolean,
    scope: io.TextScope,
    private readonly _classNameProvider: io.IClassNameProvider
  ) {
    super(name, returnVal, args, scope);
  }

  serialize(options: io.SerializationOptions): io.Text {
    const text = io.Text.createEmpty(options.indentStep);
    switch (options.mode) {
      case io.SerializableMode.source:
        return this.serializeDefinition(text, options);
      case io.SerializableMode.header:
        return this.serializeDeclaration(text, options);
      default:
        return text;
    }
  }

  protected getHeading(options: io.SerializationOptions) {
    if (io.isSourceFileSerializationMode(options.mode)) {
      return (
        this.returnVal +
        " " +
        joinNameScopesWithMemberFunctionName(
          options.nameScopes,
          this._classNameProvider.getClassName(options.mode, true),
          this.name
        ) +
        "(" +
        removeDefaultInitializersFromArgs(this.args) +
        ")" +
        (this.isConst ? " const" : "")
      );
    } else {
      return (
        this.returnVal +
        " " +
        this.name +
        "(" +
        this.args +
        ")" +
        (this.isConst ? " const" : "")
      );
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

  serialize(options: io.SerializationOptions): io.Text {
    const text = io.Text.createEmpty(options.indentStep);

    switch (options.mode) {
      case io.SerializableMode.header:
        return this.serializeDeclaration(text, options, undefined, " override");
      case io.SerializableMode.interfaceHeader:
        return this.serializeDeclaration(text, options, "virtual ", " =0");
      default:
        return super.serialize(options);
    }
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

  serialize(options: io.SerializationOptions): io.Text {
    const text = io.Text.createEmpty(options.indentStep);

    switch (options.mode) {
      case io.SerializableMode.source:
        return this.serializeDefinition(text, options);
      case io.SerializableMode.header:
        return this.serializeDeclaration(text, options, "static ");
      default:
        return text;
    }
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

  serialize(options: io.SerializationOptions): io.Text {
    const text = io.Text.createEmpty(options.indentStep);

    switch (options.mode) {
      case io.SerializableMode.header:
        return this.serializeDeclaration(text, options, "virtual ", " =0");

      case io.SerializableMode.implHeader:
        return this.serializeDeclaration(text, options, undefined, " override");

      case io.SerializableMode.implSource:
        return this.serializeDefinition(text, options);

      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.source:
      default:
        return text;
    }
  }
}

export class PureVirtualMemberFunction extends io.makeRangedSerializable(
  PureVirtualMemberFunctionUnranged
) {}

class FriendFunctionUnranged
  extends FunctionBase
  implements IFunction, IMemberFunctionIgnoringClassNames
{
  ignoresClassNames: boolean = true;

  constructor(
    name: string,
    returnVal: string,
    args: string,
    public readonly isConst: boolean,
    scope: io.TextScope
  ) {
    super(name, returnVal, args, scope);
  }

  serialize(options: io.SerializationOptions): io.Text {
    const text = io.Text.createEmpty(options.indentStep);

    switch (options.mode) {
      case io.SerializableMode.source:
        return this.serializeDefinition(text, options);
      case io.SerializableMode.header:
        return this.serializeDeclaration(text, options);
      default:
        return text;
    }
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
          "(" +
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
          "(" +
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
