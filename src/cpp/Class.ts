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

// TODO Nested class handling needs work: we need to pass the surround class name for serialization and signatures => new Class type
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

enum ClassScopeType {
  private,
  public,
  protected,
}
class ClassScope implements IClassScope {
  constructor(
    public readonly type: ClassScopeType,
    private readonly _className: string
  ) {}

  deserialize(data: io.TextFragment) {
    let content: io.TextFragment;
    switch (this.type) {
      case ClassScopeType.protected:
        content = HeaderParser.parseClassProtectedScope(data);
        break;
      case ClassScopeType.public:
        content = HeaderParser.parseClassPublicScope(data);
        break;
      case ClassScopeType.private:
      default:
        content = HeaderParser.parseClassPrivateScope(data);
        break;
    }
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
        switch (this.type) {
          case ClassScopeType.protected:
            serial += "protected:\n";
            break;
          case ClassScopeType.public:
            serial += "public:\n";
            break;
          case ClassScopeType.private:
          default:
            serial += "private:\n";
            break;
        }
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

class ClassBase extends io.TextScope implements IClass {
  constructor(
    scope: io.TextScope,
    public readonly name: string,
    public readonly inheritance: string[]
  ) {
    super(scope.scopeStart, scope.scopeEnd);

    this.publicScope = new ClassScope(ClassScopeType.public, this.name);
    this.privateScope = new ClassScope(ClassScopeType.private, this.name);
    this.protectedScope = new ClassScope(ClassScopeType.protected, this.name);
    this._classNameGen = new ClassNameGenerator(name);
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

export class ClassImpl extends ClassBase {
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
