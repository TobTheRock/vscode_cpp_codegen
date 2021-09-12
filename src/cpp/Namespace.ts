import { IClass, IFunction, INamespace, IParser } from "./TypeInterfaces";
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

  equals(other: INamespace): boolean {
    return this.name === other.name;
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
        SourceFileNamespaceSerialization.named ||
      !io.isSourceFileSerializationMode(options.mode)
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

  deserialize(data: io.TextFragment, parser: IParser) {
    this.subnamespaces = parser.parseNamespaces(data);
    this.classes = parser.parseClasses(data);
    this.functions = parser.parseStandaloneFunctions(data);
  }

  name: string;
  classes: IClass[];
  functions: IFunction[];
  subnamespaces: INamespace[];
}

export class RootNamespace extends io.TextScope implements INamespace {
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
    serial += io.serializeArray(this.subnamespaces, options, undefined, "\n");
    return serial;
  }

  equals(other: INamespace): boolean {
    return this.name === other.name;
  }

  deserialize(data: io.TextFragment, parser: IParser) {
    this.subnamespaces = parser.parseNamespaces(data);
    this.classes = parser.parseClasses(data);
    this.functions = parser.parseStandaloneFunctions(data);
  }

  readonly name: string;
  classes: IClass[];
  functions: IFunction[];
  subnamespaces: INamespace[];
}
