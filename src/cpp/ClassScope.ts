import {
  IClass,
  IFunction,
  IConstructor,
  IDestructor,
  IClassScope,
  IParser,
} from "./TypeInterfaces";
import * as io from "../io";
import { EmptySerializer, joinNameScopesWithFunctionName } from "./utils";
import { compact } from "lodash";
import { IClassNameProvider, isSourceFileSerializationMode, Text } from "../io";

type ScopeType = "private" | "public" | "protected";
function getScopeSerializableMembers(scope: IClassScope): io.ISerializable[] {
  return compact([
    ...scope.constructors,
    scope.destructor,
    ...scope.memberFunctions,
    ...scope.nestedClasses,
  ]);
}
class ClassScopeDefinitionSerializer implements io.ISerializable {
  constructor(private readonly _scope: IClassScope) {}

  serialize(options: io.SerializationOptions): io.Text {
    return io.serializeArrayWithNewLineSeperation(
      getScopeSerializableMembers(this._scope),
      options
    );
  }
}

class ClassScopeDeclarationSerializer implements io.ISerializable {
  constructor(
    private readonly _scope: IClassScope,
    private readonly _scopeType: ScopeType
  ) {}

  serialize(options: io.SerializationOptions): io.Text {
    const text = Text.createEmpty(options.indentStep);
    const serializedMembers = io.serializeArray(
      getScopeSerializableMembers(this._scope),
      options
    );
    if (!serializedMembers.isEmpty()) {
      text.addLine(`${this._scopeType}:`);
      text.append(serializedMembers, 1);
    }
    return text;
  }
}

export abstract class ClassScopeBase implements IClassScope {
  destructor?: IDestructor;
  readonly memberFunctions: IFunction[] = [];
  readonly nestedClasses: IClass[] = [];
  readonly constructors: IConstructor[] = [];

  constructor(
    private readonly _classNameProvider: io.IClassNameProvider,
    private readonly _scopeType: ScopeType
  ) {}

  protected extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
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
    if (
      !this.constructors.length &&
      !this.nestedClasses.length &&
      !this.memberFunctions.length
    ) {
      return io.Text.createEmpty();
    }
    const serializer = this.getSerializerByMode(options.mode);
    return serializer.serialize(options);
  }

  private getSerializerByMode(mode: io.SerializableMode) {
    if (isSourceFileSerializationMode(mode)) {
      return new ClassScopeDefinitionSerializer(this);
    } else {
      return new ClassScopeDeclarationSerializer(this, this._scopeType);
    }
  }
}
export class ClassPrivateScope extends ClassScopeBase {
  constructor(classNameProvider: IClassNameProvider) {
    super(classNameProvider, "private");
  }
  protected extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseClassPrivateScope(data);
  }
}
export class ClassPublicScope extends ClassScopeBase {
  constructor(classNameProvider: IClassNameProvider) {
    super(classNameProvider, "public");
  }
  protected extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseClassPublicScope(data);
  }

  protected getScopeHeader(): string {
    return "public:";
  }
}
export class ClassProtectedScope extends ClassScopeBase {
  constructor(classNameProvider: IClassNameProvider) {
    super(classNameProvider, "protected");
  }
  protected extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseClassProtectedScope(data);
  }
}

export class StructPrivateScope extends ClassScopeBase {
  constructor(classNameProvider: IClassNameProvider) {
    super(classNameProvider, "private");
  }
  protected extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseStructPrivateScope(data);
  }
}
export class StructPublicScope extends ClassScopeBase {
  constructor(classNameProvider: IClassNameProvider) {
    super(classNameProvider, "public");
  }
  protected extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseStructPublicScope(data);
  }
}
export class StructProtectedScope extends ClassScopeBase {
  constructor(classNameProvider: IClassNameProvider) {
    super(classNameProvider, "protected");
  }
  protected extractScopeTextFragment(
    data: io.TextFragment,
    parser: IParser
  ): io.TextFragment {
    return parser.parseStructProtectedScope(data);
  }
}

export interface IClassScopeFactory {
  createPrivateScope(): IClassScope;
  createPublicScope(): IClassScope;
  createProtectedScope(): IClassScope;
}
export class ClassScopeFactory implements IClassScopeFactory {
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

export class StructScopeFactory implements IClassScopeFactory {
  constructor(readonly classNameProvider: io.IClassNameProvider) {}
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
