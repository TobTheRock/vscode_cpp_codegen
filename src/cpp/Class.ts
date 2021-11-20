import {
  IClass,
  IFunction,
  IConstructor,
  IDestructor,
  IClassScope,
  IParser,
} from "./TypeInterfaces";
import * as io from "../io";
import { joinNameScopesWithFunctionName, joinNameScopes } from "./utils";
import { ClassNameGenerator } from "./ClassNameGenerator";
import * as vscode from "vscode";
import { asyncForEach } from "../utils";
import { compact } from "lodash";

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

  equals(other: IConstructor): boolean {
    return this.args === other.args;
  }

  serialize(options: io.SerializationOptions): io.Text {
    const args = `(${this.args});`;
    const text = io.Text.createEmpty(options.indentStep);
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.implHeader:
        text.addLine(
          this._classNameProvider.getClassName(options.mode, true) + args
        );
        break;

      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        text.addLine(
          getCtorDtorImplName(this._classNameProvider, options, false) +
            args +
            " {"
        );
        text.addLine("}");
        break;
      case io.SerializableMode.interfaceHeader:
        break;
    }

    return text;
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
  equals(other: IDestructor): boolean {
    return this.virtual === other.virtual;
  }

  serialize(options: io.SerializationOptions): io.Text {
    const className = this._classNameProvider.getClassName(options.mode, true);
    const text = io.Text.createEmpty(options.indentStep);
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
        text.addLine((this.virtual ? "virtual " : "") + `~${className}();`);
        break;
      case io.SerializableMode.implHeader:
        text.addLine(`~${className}()` + (this.virtual ? " override;" : ";"));
        break;

      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
        text.addLine(
          getCtorDtorImplName(this._classNameProvider, options, true)
        );
        text.add("() {");
        text.addLine("}");
    }
    return text;
  }
}

abstract class ClassScopeBase implements IClassScope {
  destructor?: IDestructor;
  readonly memberFunctions: IFunction[] = [];
  readonly nestedClasses: IClass[] = [];
  readonly constructors: IConstructor[] = [];

  constructor(private readonly _classNameProvider: io.IClassNameProvider) {}

  extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    throw new Error("Unimplemented!");
  }

  getScopeHeader(): string {
    throw new Error("Unimplemented!");
  }

  deserialize(data: io.TextFragment, parser: IParser) {
    let content: io.TextFragment = this.extractScopeTextFragment(data, parser);
    this.nestedClasses.push(
      ...parser.parseClasses(content, this._classNameProvider)
    );
    const dtors = parser.parseClassDestructors(
      content,
      this._classNameProvider
    );
    if (dtors.length > 0) {
      this.destructor = dtors[0];
    }
    this.constructors.push(
      ...parser.parseClassConstructors(content, this._classNameProvider)
    );
    this.memberFunctions.push(
      ...parser.parseClassMemberFunctions(content, this._classNameProvider)
    );
  }

  serialize(options: io.SerializationOptions): io.Text {
    const text = io.Text.createEmpty(options.indentStep);
    let indent = 0;
    if (
      !this.constructors.length &&
      !this.nestedClasses.length &&
      !this.memberFunctions.length
    ) {
      return text;
    }

    let seperateElementsWithNewLine = false;
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.implHeader:
        text.addLine(this.getScopeHeader());
        indent = 1;
        break;
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
      default:
        seperateElementsWithNewLine = true;
        break;
    }

    this.destructor,
      text.append(
        io.serializeArray(
          compact([
            ...this.constructors,
            this.destructor,
            ...this.memberFunctions,
            ...this.nestedClasses,
          ]),
          options,
          seperateElementsWithNewLine
        ),
        indent
      );

    return text;
  }
}

class ClassPrivateScope extends ClassScopeBase {
  extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseClassPrivateScope(data);
  }

  getScopeHeader(): string {
    return "private:";
  }
}
class ClassPublicScope extends ClassScopeBase {
  extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseClassPublicScope(data);
  }

  getScopeHeader(): string {
    return "public:";
  }
}
class ClassProtectedScope extends ClassScopeBase {
  extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseClassProtectedScope(data);
  }

  getScopeHeader(): string {
    return "protected:";
  }
}

class StructPrivateScope extends ClassScopeBase {
  extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseStructPrivateScope(data);
  }

  getScopeHeader(): string {
    return "private:";
  }
}
class StructPublicScope extends ClassScopeBase {
  extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseStructPublicScope(data);
  }

  getScopeHeader(): string {
    return "public:";
  }
}
class StructProtectedScope extends ClassScopeBase {
  extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseStructProtectedScope(data);
  }

  getScopeHeader(): string {
    return "protected:";
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

class ClassBaseUnranged extends io.TextScope implements IClass {
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

  getName(mode: io.SerializableMode): string {
    return this._classNameGen.has({ mode })
      ? this._classNameGen.get({ mode })
      : this.name;
  }

  async provideNames(
    nameInputProvider: io.INameInputProvider,
    ...modes: io.SerializableMode[]
  ): Promise<void> {
    const generatePromises = this._classNameGen.generate(
      nameInputProvider,
      ...modes.filter(this.acceptSerializableMode)
    );

    const subclassPromises = asyncForEach(
      [this.publicScope, this.privateScope, this.protectedScope],
      async (scope) =>
        asyncForEach(scope.nestedClasses, (subClass) =>
          subClass.provideNames(nameInputProvider, ...modes)
        )
    );

    return Promise.all([generatePromises, subclassPromises]).then(
      () => undefined
    );
  }

  protected acceptSerializableMode(mode: io.SerializableMode): boolean {
    throw new Error("Method not implemented.");
  }

  equals(other: IClass, mode?: io.SerializableMode): boolean {
    if (mode) {
      return this.getName(mode) === other.getName(mode);
    }
    return this.name === other.name;
  }

  protected getScopeFactory(classNameProvider: io.IClassNameProvider) {
    return new ClassScopeFactory(classNameProvider);
  }

  deserialize(data: io.TextFragment, parser: IParser) {
    this.publicScope.deserialize(data, parser);
    this.privateScope.deserialize(data, parser);
    this.protectedScope.deserialize(data, parser);
  }

  private serializeMembers(
    options: io.SerializationOptions,
    seperateElementsWithNewLine: boolean
  ): io.Text {
    return io.serializeArray(
      [this.publicScope, this.protectedScope, this.privateScope],
      options,
      seperateElementsWithNewLine
    );
  }

  private serializeSource(
    text: io.Text,
    options: io.SerializationOptions
  ): io.Text {
    return this.serializeMembers(options, true);
  }

  private serializeHeader(
    text: io.Text,
    options: io.SerializationOptions
  ): io.Text {
    const serializedName = this._classNameGen.get(options);

    return text
      .addLine(this.getHeaderSerialStart(serializedName))
      .append(this.serializeMembers(options, false))
      .addLine("};");
  }

  private serializeImplHeader(
    text: io.Text,
    options: io.SerializationOptions
  ): io.Text {
    const serializedName = this._classNameGen.get(options);

    return text
      .addLine(
        this.getHeaderSerialStart(serializedName, ["public " + this.name])
      )
      .append(this.serializeMembers(options, false))
      .addLine("};");
  }

  serialize(options: io.SerializationOptions): io.Text {
    const text = io.Text.createEmpty(options.indentStep);

    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
        return this.serializeHeader(text, options);
      case io.SerializableMode.implHeader:
        return this.serializeImplHeader(text, options);
      case io.SerializableMode.source:
      case io.SerializableMode.implSource:
      default:
        return this.serializeSource(text, options);
    }
  }

  private getHeaderSerialStart(
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

    serial += " {";

    return serial;
  }

  readonly publicScope: IClassScope;
  readonly privateScope: IClassScope;
  readonly protectedScope: IClassScope;
  private readonly _classNameGen: ClassNameGenerator;
  private _classNameProvider: io.IClassNameProvider;
}
class ClassBase extends io.makeRangedSerializable(ClassBaseUnranged) {}

export class ClassImplementation extends ClassBase {
  constructor(
    scope: io.TextScope,
    name: string,
    inheritance: string[],
    outerClassNameProvider?: io.IClassNameProvider
  ) {
    super(scope, name, inheritance, outerClassNameProvider);
  }

  protected acceptSerializableMode(mode: io.SerializableMode): boolean {
    switch (mode) {
      case io.SerializableMode.implHeader:
      case io.SerializableMode.implSource:
        return false;
      case io.SerializableMode.source:
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.header:
      default:
        return true;
    }
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
  protected acceptSerializableMode(mode: io.SerializableMode): boolean {
    switch (mode) {
      case io.SerializableMode.source:
        //TODO warning
        return false;
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.header:
      case io.SerializableMode.implHeader:
      case io.SerializableMode.implSource:
      default:
        return true;
    }
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
