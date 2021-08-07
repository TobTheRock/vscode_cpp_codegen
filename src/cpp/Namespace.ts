import { IClass, IFunction, INamespace } from "./TypeInterfaces";
import { HeaderParser } from "../io/HeaderParser";
import * as io from "../io";
import {
  Configuration,
  SourceFileNamespaceSerialization,
} from "../Configuration";
import clone = require("clone");
import { asyncForEach } from "../utils";
export class Namespace extends io.TextScope implements INamespace {
  constructor(name: string, scope: io.TextScope) {
    super(scope.scopeStart, scope.scopeEnd);
    this.name = name;
    this.classes = [];
    this.functions = [];
    this.subnamespaces = [];
  }

  async provideNames(
    nameInputProvider: io.INameInputProvider,
    ...modes: io.SerializableMode[]
  ): Promise<void> {
    const subNameInputReceiver: io.INameInputReceiver[] = (
      this.classes as io.INameInputReceiver[]
    ).concat(this.subnamespaces);
    return asyncForEach(subNameInputReceiver, async (receiver) =>
      receiver.provideNames(nameInputProvider, ...modes)
    );
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

  serialize(options: io.SerializationOptions) {
    const config = Configuration.get();

    let serial = "";
    let prefix = "";
    let suffix = "";
    if (
      config.sourceFileNamespaceSerialization ===
      SourceFileNamespaceSerialization.named
    ) {
      prefix = "namespace " + this.name + " {\n";
      suffix = "}\n";
    } else {
      options = this.addNamespaceToOptions(options);
    }

    serial += io.serializeArray(this.subnamespaces, options);
    serial += io.serializeArray(this.functions, options);
    serial += io.serializeArray(this.classes, options);

    if (!serial.length) {
      return "";
    }

    return prefix + serial + suffix;
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

  async provideNames(
    nameInputProvider: io.INameInputProvider,
    ...modes: io.SerializableMode[]
  ): Promise<void> {
    const subNameInputReceiver: io.INameInputReceiver[] = (
      this.classes as io.INameInputReceiver[]
    ).concat(this.subnamespaces);
    return asyncForEach(subNameInputReceiver, async (receiver) =>
      receiver.provideNames(nameInputProvider, ...modes)
    );
  }

  serialize(options: io.SerializationOptions) {
    let serial: string = io.serializeArray(this.functions, options);
    serial += io.serializeArray(this.classes, options);
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
