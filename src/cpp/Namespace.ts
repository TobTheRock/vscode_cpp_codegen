import { IClass, IFunction, INamespace } from "./TypeInterfaces";
import { HeaderParser } from "../io/HeaderParser";
import * as io from "../io";
import {
  Configuration,
  SourceFileNamespaceSerialization,
} from "../Configuration";
import clone = require("clone");
export class Namespace extends io.TextScope implements INamespace {
  constructor(name: string, scope: io.TextScope) {
    super(scope.scopeStart, scope.scopeEnd);
    this.name = name;
    this.classes = [];
    this.functions = [];
    this.subnamespaces = [];
  }

  private addNamespaceToOptions(
    options: io.SerializationOptions
  ): io.SerializationOptions {
    const newOptions = clone(options);

    newOptions.nameScopes
      ? newOptions.nameScopes.push(this.name)
      : (newOptions.nameScopes = [this.name]);

    return newOptions;
  }

  async serialize(options: io.SerializationOptions) {
    const config = Configuration.get();

    let serial = "";
    let suffix = "";
    if (
      config.sourceFileNamespaceSerialization ===
      SourceFileNamespaceSerialization.named
    ) {
      serial = "namespace " + this.name + " {\n";
      suffix = "}\n";
    } else {
      options = this.addNamespaceToOptions(options);
    }

    serial += await io.serializeArray(this.subnamespaces, options);
    serial += await io.serializeArray(this.functions, options);
    serial += await io.serializeArray(this.classes, options);

    serial += suffix;

    return serial;
  }

  deserialize(data: io.TextFragment) {
    this.subnamespaces = HeaderParser.parseNamespaces(data);
    this.classes = HeaderParser.parseClasses(data);
    this.functions = HeaderParser.parseStandaloneFunctiones(data);
  }

  name: string;
  classes: IClass[];
  functions: IFunction[];
  subnamespaces: INamespace[];
}

export class NoneNamespace extends io.TextScope implements INamespace {
  constructor(scope: io.TextScope) {
    super(scope.scopeStart, scope.scopeEnd);
    this.name = "";
    this.classes = [];
    this.functions = [];
    this.subnamespaces = [];
  }

  async serialize(options: io.SerializationOptions) {
    let serial: string = await io.serializeArray(this.functions, options);
    serial += await io.serializeArray(this.classes, options);
    return serial;
  }

  deserialize(data: io.TextFragment) {
    this.classes = HeaderParser.parseClasses(data);
    this.functions = HeaderParser.parseStandaloneFunctiones(data);
  }

  readonly name: string;
  classes: IClass[];
  functions: IFunction[];
  subnamespaces: INamespace[];
  private readonly _nameInputProvider: io.INameInputProvider | undefined;
}
