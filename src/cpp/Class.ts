import {
  IClass,
  IFunction,
  IConstructor,
  IDestructor,
  IClassScope,
} from "./TypeInterfaces";
import { HeaderParser } from "../io/HeaderParser";
import * as io from "../io";
import { joinNameScopesWithFunctionName, joinNameScopes } from "./utils";
import { ClassNameGenerator } from "./ClassNameGenerator";

function getCtorDtorImplName(
  classNameProvider: io.IClassNameProvider,
  options: io.SerializationOptions,
  isDtor: boolean
) {
  const prefix = isDtor ? "~" : "";

  const functionName =
    prefix + classNameProvider.getClassName(options.mode, false);
  const classNameScope = classNameProvider.getClassName(options.mode, true);
  const scopes = options.nameScopes
    ? [...options.nameScopes, classNameScope]
    : [classNameScope];

  return joinNameScopesWithFunctionName(scopes, functionName);
}

export class ClassConstructor extends io.TextScope implements IConstructor {
  constructor(
    public readonly args: string,
    private readonly _classNameProvider: io.IClassNameProvider,
    scope: io.TextScope
  ) {
    super(scope.scopeStart, scope.scopeEnd);
  }
  async serialize(options: io.SerializationOptions): Promise<string> {
    let serial = "";
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.implHeader:
        serial =
          this._classNameProvider.getClassName(options.mode, true) +
          "(" +
          this.args +
          ");";
        break;

      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        serial =
          getCtorDtorImplName(this._classNameProvider, options, false) +
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
    private readonly _classNameProvider: io.IClassNameProvider,
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
        serial +=
          "~" +
          this._classNameProvider.getClassName(options.mode, true) +
          "();";
        break;
      case io.SerializableMode.implHeader:
        serial =
          "~" +
          this._classNameProvider.getClassName(options.mode, true) +
          " ()";
        serial += this.virtual ? " override;\n" : ";\n";
        break;

      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        serial =
          getCtorDtorImplName(this._classNameProvider, options, true) +
          "() {\n}";
        break;
    }
    return serial;
  }
}

class ClassScopeBase implements IClassScope {
  constructor(private readonly _classNameProvider: io.IClassNameProvider) {}

  extractScopeTextFragment(data: io.TextFragment): io.TextFragment {
    throw new Error("Unimplemented!");
  }

  getScopeHeader(): string {
    throw new Error("Unimplemented!");
  }

  deserialize(data: io.TextFragment) {
    let content: io.TextFragment = this.extractScopeTextFragment(data);
    this.nestedClasses.push(
      ...HeaderParser.parseClasses(content, this._classNameProvider)
    );
    this.constructors.push(
      ...HeaderParser.parseClassConstructor(content, this._classNameProvider)
    );
    this.memberFunctions.push(
      ...HeaderParser.parseClassMemberFunctions(
        content,
        this._classNameProvider
      )
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
  constructor(readonly classNameProvider: io.IClassNameProvider) {}
  createPrivateScope(): IClassScope {
    return new ClassPrivateScope(this.classNameProvider);
  }

  createPublicScope(): IClassScope {
    return new ClassPublicScope(this.classNameProvider);
  }

  createProtectedScope(): IClassScope {
    return new ClassProtectedScope(this.classNameProvider);
  }
}

class ClassBase extends io.TextScope implements IClass {
  constructor(
    scope: io.TextScope,
    public readonly name: string,
    public readonly inheritance: string[],
    outerClassNameProvider?: io.IClassNameProvider
  ) {
    super(scope.scopeStart, scope.scopeEnd);

    this._classNameGen = new ClassNameGenerator(name);
    this._classNameProvider = this._classNameGen.getClassNameProvider(
      outerClassNameProvider
    );
    const scopeFactory = this.getScopeFactory(this._classNameProvider);
    this.publicScope = scopeFactory.createPublicScope();
    this.privateScope = scopeFactory.createPrivateScope();
    this.protectedScope = scopeFactory.createProtectedScope();
  }

  protected getScopeFactory(classNameProvider: io.IClassNameProvider) {
    return new ClassScopeFactory(classNameProvider);
  }

  deserialize(data: io.TextFragment) {
    const dtors = HeaderParser.parseClassDestructors(
      data,
      this._classNameProvider
    );
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

    const serializedName = await this._classNameGen.generate(options);

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

    if (this.destructor) {
      serial += (await this.destructor.serialize(options)) + "\n\n";
    }
    serial += await this.publicScope.serialize(options);
    serial += await this.protectedScope.serialize(options);
    serial += await this.privateScope.serialize(options);
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
  private _classNameProvider: io.IClassNameProvider;
}

export class ClassImplementation extends ClassBase {
  constructor(
    scope: io.TextScope,
    name: string,
    inheritance: string[],
    outerClassNameProvider?: io.IClassNameProvider
  ) {
    super(scope, name, inheritance, outerClassNameProvider);
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
    name: string,
    inheritance: string[],
    outerClassNameProvider?: io.IClassNameProvider
  ) {
    super(scope, name, inheritance, outerClassNameProvider);
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
    return new StructPrivateScope(this.classNameProvider);
  }

  createPublicScope(): IClassScope {
    return new StructPublicScope(this.classNameProvider);
  }

  createProtectedScope(): IClassScope {
    return new StructProtectedScope(this.classNameProvider);
  }
}

export class StructImplementation extends ClassImplementation {
  constructor(
    scope: io.TextScope,
    name: string,
    inheritance: string[],
    outerClassNameProvider?: io.IClassNameProvider
  ) {
    super(scope, name, inheritance, outerClassNameProvider);
  }

  protected getScopeFactory(classNameProvider: io.IClassNameProvider) {
    return new StructScopeFactory(classNameProvider);
  }
}

export class StructInterface extends ClassInterface {
  constructor(
    scope: io.TextScope,
    name: string,
    inheritance: string[],
    outerClassNameProvider?: io.IClassNameProvider
  ) {
    super(scope, name, inheritance, outerClassNameProvider);
  }

  protected getScopeFactory(classNameProvider: io.IClassNameProvider) {
    return new StructScopeFactory(classNameProvider);
  }
}
