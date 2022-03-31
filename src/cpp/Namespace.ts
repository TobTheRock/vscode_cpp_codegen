import { IClass, IFunction, INamespace, IParser } from "./TypeInterfaces";
import * as io from "../io";
import {
  Configuration,
  SourceFileNamespaceSerialization,
} from "../Configuration";
import clone = require("clone");
import { asyncForEach } from "../utils";
import { Text, TextScope } from "../io";
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
    selection?: TextScope,
    ...modes: io.SerializableMode[]
  ): Promise<void> {
    const subNameInputReceiver: io.INameInputReceiver[] = (
      this.classes as io.INameInputReceiver[]
    ).concat(this.subnamespaces);
    return asyncForEach(subNameInputReceiver, async (receiver) =>
      receiver.provideNames(nameInputProvider, selection, ...modes)
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

  private serializeMembers(options: io.SerializationOptions): io.Text {
    return io
      .serializeArrayWithNewLineSeperation(this.functions, options)
      .append(io.serializeArrayWithNewLineSeperation(this.classes, options))
      .append(io.serializeArray(this.subnamespaces, options));
  }

  private serializeWithNamedDeclaration(
    options: io.SerializationOptions
  ): io.Text {
    const serializedText = this.serializeMembers(options);
    if (serializedText.isEmpty()) {
      return serializedText;
    }

    return Text.createEmpty(options.indentStep)
      .addLine(`namespace ${this.name} {`)
      .addNewLineSeperation()
      .append(serializedText)
      .addLine("}");
  }

  private serializePrepended(options: io.SerializationOptions): io.Text {
    return this.serializeMembers(this.addNamespaceToOptions(options));
  }

  serialize(options: io.SerializationOptions): io.Text {
    if (options.mode === io.SerializableMode.completionItemLabel) {
      return Text.createEmpty(options.indentStep).addLine(
        `namespace ${this.name}`
      );
    }

    const config = Configuration.get(); // TODO pass the config via SerializationOptions

    if (
      config.sourceFileNamespaceSerialization ===
        SourceFileNamespaceSerialization.named ||
      !io.isSourceFileSerializationMode(options.mode)
    ) {
      return this.serializeWithNamedDeclaration(options);
    }
    return this.serializePrepended(options);
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
    selection?: TextScope,
    ...modes: io.SerializableMode[]
  ): Promise<void> {
    const subNameInputReceiver: io.INameInputReceiver[] = (
      this.classes as io.INameInputReceiver[]
    ).concat(this.subnamespaces);
    return asyncForEach(subNameInputReceiver, async (receiver) =>
      receiver.provideNames(nameInputProvider, selection, ...modes)
    );
  }

  serialize(options: io.SerializationOptions) {
    return io
      .serializeArrayWithNewLineSeperation(this.functions, options)
      .append(io.serializeArrayWithNewLineSeperation(this.classes, options))
      .append(io.serializeArray(this.subnamespaces, options));
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
