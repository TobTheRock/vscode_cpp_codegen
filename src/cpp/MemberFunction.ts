import { IFunction } from "./TypeInterfaces";
import { ClassNameGenerator } from "./ClassNameGenerator";
import * as io from "../io";

export class MemberFunction extends io.TextScope implements IFunction {
  constructor(
    public readonly name: string,
    public readonly returnVal: string,
    public readonly args: string,
    public readonly isConst: boolean,
    private readonly classNameGen: ClassNameGenerator,
    scope: io.TextScope
  ) {
    super(scope.scopeStart, scope.scopeEnd);
  }

  async serialize(mode: io.SerializableMode) {
    let serial = "";

    switch (mode) {
      case io.SerializableMode.source:
        serial = (await this.getHeading(mode)) + " {\n";
        if (this.returnVal !== "void") {
          serial +=
            "\t" + this.returnVal + " returnValue;\n\treturn returnValue;\n";
        }
        serial += "}";
        break;

      case io.SerializableMode.header:
        serial = (await this.getHeading(mode)) + ";";
        break;

      default:
        break;
    }

    return serial;
  }

  protected async getHeading(mode: io.SerializableMode) {
    switch (mode) {
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
          (await this.classNameGen.createName(mode)) +
          "::" +
          this.name +
          " (" +
          this.args +
          ")" +
          (this.isConst ? " const" : "")
        );
      default:
        break;
    }
  }
}

export class VirtualMemberFunction extends MemberFunction {
  constructor(
    name: string,
    returnVal: string,
    args: string,
    isConst: boolean,
    classNameGen: ClassNameGenerator,
    scope: io.TextScope
  ) {
    super(name, returnVal, args, isConst, classNameGen, scope);
  }

  async serialize(mode: io.SerializableMode) {
    let serial = "";

    switch (mode) {
      case io.SerializableMode.header:
        serial = (await super.getHeading(mode)) + " override;";
        break;

      case io.SerializableMode.interfaceHeader:
        serial = "virtual " + (await super.getHeading(mode)) + " =0;";
        break;

      default:
        serial = await super.serialize(mode);
        break;
    }

    return serial;
  }
}
export class StaticMemberFunction extends MemberFunction {
  constructor(
    name: string,
    returnVal: string,
    args: string,
    isConst: boolean,
    classNameGen: ClassNameGenerator,
    scope: io.TextScope
  ) {
    super(name, returnVal, args, isConst, classNameGen, scope);
  }

  async serialize(mode: io.SerializableMode) {
    let serial = "";

    switch (mode) {
      case io.SerializableMode.source:
        serial = (await this.getHeading(mode)) + " {\n";
        if (this.returnVal !== "void") {
          serial +=
            "\t" + this.returnVal + " returnValue;\n\treturn returnValue;\n";
        }
        serial += "}";
        break;

      case io.SerializableMode.header:
        serial = "static " + (await this.getHeading(mode)) + ";";
        break;

      default:
        break;
    }

    return serial;
  }
}

export class PureVirtualMemberFunction extends MemberFunction {
  constructor(
    name: string,
    returnVal: string,
    args: string,
    isConst: boolean,
    classNameGen: ClassNameGenerator,
    scope: io.TextScope
  ) {
    super(name, returnVal, args, isConst, classNameGen, scope);
  }

  async serialize(mode: io.SerializableMode) {
    let serial = "";

    switch (mode) {
      case io.SerializableMode.header:
        serial = "virtual " + (await super.getHeading(mode)) + " =0;";
        break;

      case io.SerializableMode.implHeader:
        serial = (await super.getHeading(mode)) + " override;";
        break;

      case io.SerializableMode.implSource:
        serial = (await this.getHeading(mode)) + " {\n";
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
