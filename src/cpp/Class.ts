import { IClass, IClassScope, IParser } from "./TypeInterfaces";
import * as io from "../io";
import { ClassNameGenerator } from "./ClassNameGenerator";
import { asyncForEach } from "../utils";
import {
  ClassScopeFactory,
  IClassScopeFactory,
  StructScopeFactory,
} from "./ClassScope";
import { isAbstractFactorySerializationMode } from "../io";
import { AbstractFactoryClassPublicScope } from "./Factory";
import { remove } from "lodash";
class ClassBodyDeserializer {
  constructor(private readonly _class: IClass) {}

  deserialize(data: io.TextFragment, parser: IParser) {
    this._class.publicScope.deserialize(data, parser);
    this._class.privateScope.deserialize(data, parser);
    this._class.protectedScope.deserialize(data, parser);
  }
}

type ClassType = "struct" | "class";
class ClassSpecifier {
  constructor(
    private readonly _inheritance: string[],
    private readonly _classNameProvider: io.IClassNameProvider,
    private readonly _type: ClassType
  ) {}

  asText(options: io.SerializationOptions): io.Text {
    const serializedName = this._classNameProvider.getClassName(
      options.mode,
      false
    );
    const inheritanceDeclaration = this.getInheritanceDeclaration();
    return io.Text.fromString(
      `${this._type} ${serializedName}${inheritanceDeclaration}`
    );
  }

  private getInheritanceDeclaration(): string {
    if (!this._inheritance.length) {
      return "";
    }
    return `: ${this._inheritance.join(",")}`;
  }
}

class ClassDefinitionSerializer implements io.ISerializable {
  static fromClass(cl: IClass): ClassDefinitionSerializer {
    return new ClassDefinitionSerializer([
      cl.publicScope,
      cl.protectedScope,
      cl.privateScope,
    ]);
  }
  static fromScopes(classScopes: IClassScope[]) {
    return new ClassDefinitionSerializer(classScopes);
  }

  private constructor(private readonly _classScopes: IClassScope[]) {}
  serialize(options: io.SerializationOptions): io.Text {
    return io.serializeArrayWithNewLineSeperation(this._classScopes, options);
  }
}

class ClassDeclarationSerializer implements io.ISerializable {
  private _classSpecifier: ClassSpecifier;
  static fromClass(
    cl: IClass,
    classNameProvider: io.IClassNameProvider,
    inheritance: string[] = cl.inheritance
  ): ClassDeclarationSerializer {
    return new ClassDeclarationSerializer(
      [cl.publicScope, cl.protectedScope, cl.privateScope],
      classNameProvider,
      inheritance
    );
  }
  static fromScopes(
    classScopes: IClassScope[],
    classNameProvider: io.IClassNameProvider,
    inheritance: string[] = []
  ): ClassDeclarationSerializer {
    return new ClassDeclarationSerializer(
      classScopes,
      classNameProvider,
      inheritance
    );
  }
  private constructor(
    private readonly _classScopes: IClassScope[],
    classNameProvider: io.IClassNameProvider,
    inheritance: string[]
  ) {
    this._classSpecifier = new ClassSpecifier(
      inheritance,
      classNameProvider,
      "class"
    );
  }
  serialize(options: io.SerializationOptions): io.Text {
    const classBody = io.serializeArray(this._classScopes, options);
    if (classBody.isEmpty()) {
      return io.Text.createEmpty();
    }
    return this._classSpecifier
      .asText(options)
      .add(" {")
      .append(classBody)
      .addLine("};");
  }
}

class ClassImplDeclarationSerializer implements io.ISerializable {
  private _classDeclarationSerializer: ClassDeclarationSerializer;
  constructor(cl: IClass, classNameProvider: io.IClassNameProvider) {
    this._classDeclarationSerializer = ClassDeclarationSerializer.fromClass(
      cl,
      classNameProvider,
      [`public ${cl.name}`]
    );
  }
  serialize(options: io.SerializationOptions): io.Text {
    return this._classDeclarationSerializer.serialize(options);
  }
}
class AbstractFactorySerializer implements io.ISerializable {
  private _factoryPublicScope: AbstractFactoryClassPublicScope;
  constructor(
    originalClass: IClass,
    private readonly _classNameProvider: io.IClassNameProvider
  ) {
    this._factoryPublicScope = new AbstractFactoryClassPublicScope(
      originalClass,
      this._classNameProvider
    );
  }
  serialize(options: io.SerializationOptions): io.Text {
    if (io.isSourceFileSerializationMode(options.mode)) {
      return ClassDefinitionSerializer.fromScopes([
        this._factoryPublicScope,
      ]).serialize(options);
    } else {
      return ClassDeclarationSerializer.fromScopes(
        [this._factoryPublicScope],
        this._classNameProvider
      ).serialize(options);
    }
  }
}
class ClassBaseUnranged extends io.TextScope implements IClass {
  readonly publicScope: IClassScope;
  readonly privateScope: IClassScope;
  readonly protectedScope: IClassScope;
  private _classDeserializer: ClassBodyDeserializer;
  constructor(
    scope: io.TextScope,
    public readonly name: string,
    public readonly inheritance: string[],
    private readonly _classNameGen: ClassNameGenerator,
    scopeFactory: IClassScopeFactory
  ) {
    super(scope.scopeStart, scope.scopeEnd);

    this.publicScope = scopeFactory.createPublicScope();
    this.privateScope = scopeFactory.createPrivateScope();
    this.protectedScope = scopeFactory.createProtectedScope();

    this._classDeserializer = new ClassBodyDeserializer(this);
  }

  getName(mode: io.SerializableMode): string {
    return this._classNameGen.getClassName(mode, false);
  }

  async provideNames(
    nameInputProvider: io.INameInputProvider,
    ...modes: io.SerializableMode[]
  ): Promise<void> {
    const generatePromise = this._classNameGen.generate(
      nameInputProvider,
      ...modes
    );
    const modesForwardedToSubclasses = modes.filter(
      (mode) => mode !== io.SerializableMode.abstractFactoryHeader
    );
    const subclassPromises = asyncForEach(
      [this.publicScope, this.privateScope, this.protectedScope],
      async (scope) =>
        asyncForEach(scope.nestedClasses, (subClass) =>
          subClass.provideNames(
            nameInputProvider,
            ...modesForwardedToSubclasses
          )
        )
    );

    await Promise.all([generatePromise, subclassPromises]);
  }

  equals(other: IClass, mode?: io.SerializableMode): boolean {
    if (mode) {
      return this.getName(mode) === other.getName(mode);
    }
    return this.name === other.name;
  }

  deserialize(data: io.TextFragment, parser: IParser) {
    this._classDeserializer.deserialize(data, parser);
  }

  serialize(options: io.SerializationOptions): io.Text {
    const serializer = this.getSerializerByMode(options.mode);
    return serializer.serialize(options);
  }

  private getSerializerByMode(mode: io.SerializableMode): io.ISerializable {
    if (isAbstractFactorySerializationMode(mode)) {
      return new AbstractFactorySerializer(this, this._classNameGen);
    } else if (io.isSourceFileSerializationMode(mode)) {
      return ClassDefinitionSerializer.fromClass(this);
    } else if (mode === io.SerializableMode.implHeader) {
      return new ClassImplDeclarationSerializer(this, this._classNameGen);
    } else {
      return ClassDeclarationSerializer.fromClass(this, this._classNameGen);
    }
  }
}
export class ClassBase extends io.makeRangedSerializable(ClassBaseUnranged) {}

export class ClassImplementation extends ClassBase {
  constructor(
    scope: io.TextScope,
    name: string,
    inheritance: string[],
    outerClassNameProvider?: io.IClassNameProvider
  ) {
    const classNameGenerator = new ClassNameGenerator(
      name,
      [
        io.SerializableMode.source,
        io.SerializableMode.interfaceHeader,
        io.SerializableMode.header,
        io.SerializableMode.abstractFactoryHeader,
      ],
      outerClassNameProvider
    );
    const classScopeFactory = new ClassScopeFactory(classNameGenerator);
    super(scope, name, inheritance, classNameGenerator, classScopeFactory);
  }
}

export class ClassInterface extends ClassBase {
  constructor(
    scope: io.TextScope,
    name: string,
    inheritance: string[],
    outerClassNameProvider?: io.IClassNameProvider
  ) {
    const classNameGenerator = new ClassNameGenerator(
      name,
      [
        io.SerializableMode.header,
        io.SerializableMode.implHeader,
        io.SerializableMode.implSource,
        io.SerializableMode.abstractFactoryHeader,
      ],
      outerClassNameProvider
    );
    const classScopeFactory = new ClassScopeFactory(classNameGenerator);
    super(scope, name, inheritance, classNameGenerator, classScopeFactory);
  }
}

export class StructImplementation extends ClassBase {
  constructor(
    scope: io.TextScope,
    name: string,
    inheritance: string[],
    outerClassNameProvider?: io.IClassNameProvider
  ) {
    const classNameGenerator = new ClassNameGenerator(
      name,
      [
        io.SerializableMode.source,
        io.SerializableMode.interfaceHeader,
        io.SerializableMode.header,
        io.SerializableMode.abstractFactoryHeader,
      ],
      outerClassNameProvider
    );
    const structScopeFactory = new StructScopeFactory(classNameGenerator);
    super(scope, name, inheritance, classNameGenerator, structScopeFactory);
  }
}

export class StructInterface extends ClassBase {
  constructor(
    scope: io.TextScope,
    name: string,
    inheritance: string[],
    outerClassNameProvider?: io.IClassNameProvider
  ) {
    const classNameGenerator = new ClassNameGenerator(
      name,
      [
        io.SerializableMode.header,
        io.SerializableMode.implHeader,
        io.SerializableMode.implSource,
        io.SerializableMode.abstractFactoryHeader,
      ],
      outerClassNameProvider
    );
    const structScopeFactory = new StructScopeFactory(classNameGenerator);

    super(scope, name, inheritance, classNameGenerator, structScopeFactory);
  }
}
