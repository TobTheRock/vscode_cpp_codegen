import {
  IClass,
  IFunction,
  IConstructor,
  IDestructor,
  IClassScope,
} from "./TypeInterfaces";
import { HeaderParser } from "../io/HeaderParser";
import * as io from "../io";
import { joinNameScopes } from "./utils";
import { ClassNameGenerator } from "./ClassNameGenerator";

export class ClassConstructor extends io.TextScope implements IConstructor {
  constructor(
    public readonly args: string,
    private readonly _className: string,
    scope: io.TextScope
  ) {
    super(scope.scopeStart, scope.scopeEnd);
  }
  async serialize(options: io.SerializationOptions): Promise<string> {
    let serial = "";
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.implHeader:
        serial = this._className + "(" + this.args + ");";
        break;

      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        serial =
          joinNameScopes(options.nameScope, this._className) +
          "(" +
          this.args +
          ") {\n}";
        break;
      case io.SerializableMode.interfaceHeader:
        break;
    }
    return serial;
  }
}

export class ClassDestructor extends io.TextScope implements IDestructor {
  constructor(
    public readonly virtual: boolean,
    private readonly _className: string,
    scope: io.TextScope
  ) {
    super(scope.scopeStart, scope.scopeEnd);
  }
  async serialize(options: io.SerializationOptions): Promise<string> {
    let serial = "";
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
        serial += this.virtual ? "virtual " : "";
        serial += "~" + this._className + "();";
        break;
      case io.SerializableMode.implHeader:
        serial = "~" + this._className + " ()";
        serial += this.virtual ? " override;\n" : ";\n";
        break;

      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        serial =
          joinNameScopes(options.nameScope, "~" + this._className) +
          "() {\n}\n\n";
        break;
    }
    return serial;
  }
}

class ClassScopeBase implements IClassScope {
  constructor(private readonly _className: string) {}

  extractScopeTextFragment(data: io.TextFragment): io.TextFragment {
    throw new Error("Unimplemented!");
  }

  getScopeHeader(): string {
    throw new Error("Unimplemented!");
  }

  deserialize(data: io.TextFragment) {
    let content: io.TextFragment = this.extractScopeTextFragment(data);
    this.nestedClasses.push(...HeaderParser.parseClasses(content)); //TODO pass prefix aka this._className
    this.constructors.push(
      ...HeaderParser.parseClassConstructor(content, this._className)
    );
    this.memberFunctions.push(
      ...HeaderParser.parseClassMemberFunctions(content)
    );
  }

  async serialize(options: io.SerializationOptions) {
    if (
      !this.constructors.length &&
      !this.nestedClasses.length &&
      !this.memberFunctions.length
    ) {
      return "";
    }

    let serial = "";
    let arrayPrefix = "";
    let arraySuffix = "";
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.implHeader:
        serial += this.getScopeHeader();
        arrayPrefix = "\t";
        arraySuffix = "\n";
        break;
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
      default:
        arraySuffix = "\n\n";
        break;
    }
    serial += await io.serializeArray(
      this.constructors,
      options,
      arrayPrefix,
      arraySuffix
    );
    serial += await io.serializeArray(this.nestedClasses, options, arrayPrefix); // TODO formatting not working for multiline
    serial += await io.serializeArray(
      this.memberFunctions,
      options,
      arrayPrefix,
      arraySuffix
    );

    return serial;
  }

  readonly memberFunctions: IFunction[] = [];
  readonly nestedClasses: IClass[] = [];
  readonly constructors: IConstructor[] = [];
}

class ClassPrivateScope extends ClassScopeBase {
  extractScopeTextFragment(data: io.TextFragment): io.TextFragment {
    return HeaderParser.parseClassPrivateScope(data);
  }

  getScopeHeader(): string {
    return "private:\n";
  }
}
class ClassPublicScope extends ClassScopeBase {
  extractScopeTextFragment(data: io.TextFragment): io.TextFragment {
    return HeaderParser.parseClassPublicScope(data);
  }

  getScopeHeader(): string {
    return "public:\n";
  }
}
class ClassProtectedScope extends ClassScopeBase {
  extractScopeTextFragment(data: io.TextFragment): io.TextFragment {
    return HeaderParser.parseClassProtectedScope(data);
  }

  getScopeHeader(): string {
    return "protected:\n";
  }
}

class StructPrivateScope extends ClassScopeBase {
  extractScopeTextFragment(data: io.TextFragment): io.TextFragment {
    return HeaderParser.parseStructPrivateScope(data);
  }

  getScopeHeader(): string {
    return "private:\n";
  }
}
class StructPublicScope extends ClassScopeBase {
  extractScopeTextFragment(data: io.TextFragment): io.TextFragment {
    return HeaderParser.parseStructPublicScope(data);
  }

  getScopeHeader(): string {
    return "public:\n";
  }
}
class StructProtectedScope extends ClassScopeBase {
  extractScopeTextFragment(data: io.TextFragment): io.TextFragment {
    return HeaderParser.parseStructProtectedScope(data);
  }

  getScopeHeader(): string {
    return "protected:\n";
  }
}

class ClassScopeFactory {
  constructor(readonly name: string) {}
  createPrivateScope(): IClassScope {
    return new ClassPrivateScope(this.name);
  }

  createPublicScope(): IClassScope {
    return new ClassPublicScope(this.name);
  }

  createProtectedScope(): IClassScope {
    return new ClassProtectedScope(this.name);
  }
}

class ClassBase extends io.TextScope implements IClass {
  constructor(
    scope: io.TextScope,
    public readonly name: string,
    public readonly inheritance: string[]
  ) {
    super(scope.scopeStart, scope.scopeEnd);

    const scopeFactory = this.getScopeFactory();
    this.publicScope = scopeFactory.createPublicScope();
    this.privateScope = scopeFactory.createPrivateScope();
    this.protectedScope = scopeFactory.createProtectedScope();
    this._classNameGen = new ClassNameGenerator(name);
  }

  protected getScopeFactory() {
    return new ClassScopeFactory(this.name);
  }

  deserialize(data: io.TextFragment) {
    const dtors = HeaderParser.parseClassDestructors(data, this.name);
    if (dtors.length > 1) {
      throw new Error("Class " + this.name + " has multiple destructors!");
    } else if (dtors.length === 1) {
      this.destructor = dtors[0];
    }
    this.publicScope.deserialize(data);
    this.privateScope.deserialize(data);
    this.protectedScope.deserialize(data);
  }

  async serialize(options: io.SerializationOptions) {
    let serial = "";
    let suffix = "";

    const serializedName = await this._classNameGen.createName(options);

    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
        serial += this.getHeaderSerialStart(serializedName);
        suffix = "};";
        break;
      case io.SerializableMode.implHeader:
        serial += this.getHeaderSerialStart(serializedName, [
          "public " + this.name,
        ]);
        suffix = "};\n";
        break;
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
      default:
        break;
    }

    const newOptions: io.SerializationOptions = {
      mode: options.mode,
      nameScope: joinNameScopes(options.nameScope, serializedName),
      nameInputProvider: options.nameInputProvider,
    };

    if (this.destructor) {
      serial += await this.destructor.serialize(newOptions);
    }
    serial += await this.publicScope.serialize(newOptions);
    serial += await this.protectedScope.serialize(newOptions);
    serial += await this.privateScope.serialize(newOptions);
    serial += suffix;
    return serial;
  }

  getHeaderSerialStart(
    serializedName: string,
    inheritance: string[] = this.inheritance
  ) {
    let serial = "class " + serializedName;
    inheritance.forEach((inheritedClass, index) => {
      if (index === 0) {
        serial += " : ";
      }
      serial += inheritedClass;
      if (index < inheritance.length - 1) {
        serial += ", ";
      }
    });

    serial += " {\n";

    return serial;
  }

  readonly publicScope: IClassScope;
  readonly privateScope: IClassScope;
  readonly protectedScope: IClassScope;
  destructor: IDestructor | undefined;
  private readonly _classNameGen: ClassNameGenerator;
}

export class ClassImplementation extends ClassBase {
  constructor(
    scope: io.TextScope,
    public readonly name: string,
    public readonly inheritance: string[]
  ) {
    super(scope, name, inheritance);
  }

  async serialize(options: io.SerializationOptions) {
    let serial = "";
    switch (options.mode) {
      case io.SerializableMode.implHeader:
      case io.SerializableMode.implSource:
        break;
      case io.SerializableMode.source:
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.header:
      default:
        serial = await super.serialize(options);
        break;
    }
    return serial;
  }
}

export class ClassInterface extends ClassBase {
  constructor(
    scope: io.TextScope,
    public readonly name: string,
    public readonly inheritance: string[]
  ) {
    super(scope, name, inheritance);
  }

  async serialize(options: io.SerializationOptions) {
    let serial = "";
    switch (options.mode) {
      case io.SerializableMode.source:
        //TODO warning
        break;
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.header:
      case io.SerializableMode.implHeader:
      case io.SerializableMode.implSource:
      default:
        serial = await super.serialize(options);
        break;
    }
    return serial;
  }
}

class StructScopeFactory extends ClassScopeFactory {
  createPrivateScope(): IClassScope {
    return new StructPrivateScope(this.name);
  }

  createPublicScope(): IClassScope {
    return new StructPublicScope(this.name);
  }

  createProtectedScope(): IClassScope {
    return new StructProtectedScope(this.name);
  }
}

export class StructImplementation extends ClassImplementation {
  constructor(
    scope: io.TextScope,
    public readonly name: string,
    public readonly inheritance: string[]
  ) {
    super(scope, name, inheritance);
  }

  protected getScopeFactory() {
    return new StructScopeFactory(this.name);
  }
}

export class StructInterface extends ClassInterface {
  constructor(
    scope: io.TextScope,
    public readonly name: string,
    public readonly inheritance: string[]
  ) {
    super(scope, name, inheritance);
  }

  protected getScopeFactory() {
    return new StructScopeFactory(this.name);
  }
}
