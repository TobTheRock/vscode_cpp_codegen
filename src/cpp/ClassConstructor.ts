import * as io from "../io";
import { IConstructor, IDestructor } from "./TypeInterfaces";
import { joinNameScopesWithFunctionName } from "./utils";

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
    return this.args === other.args; // TODO we should compare class names as well
  }

  serialize(options: io.SerializationOptions): io.Text {
    const args = `(${this.args})`;
    const text = io.Text.createEmpty(options.indentStep);
    switch (options.mode) {
      case io.SerializableMode.header:
        text.addLine(
          this._classNameProvider.getClassName(options.mode, true) + args + ";"
        );
        break;

      case io.SerializableMode.source:
        text.addLine(
          getCtorDtorImplName(this._classNameProvider, options, false) +
            args +
            " {"
        );
        text.addLine("}");
        break;
      default:
        break;
    }

    return text;
  }
}
export class ClassDestructor extends io.TextScope implements IDestructor {
  public readonly virtual: boolean = false;
  constructor(
    private readonly _classNameProvider: io.IClassNameProvider,
    scope: io.TextScope
  ) {
    super(scope.scopeStart, scope.scopeEnd);
  }
  equals(other: IDestructor): boolean {
    return this.virtual === other.virtual; // TODO we should compare class names as well
  }

  serialize(options: io.SerializationOptions): io.Text {
    const className = this._classNameProvider.getClassName(options.mode, true);
    const text = io.Text.createEmpty(options.indentStep);
    switch (options.mode) {
      case io.SerializableMode.header:
        text.addLine(`~${className}();`);
        break;

      case io.SerializableMode.source:
        text.addLine(
          getCtorDtorImplName(this._classNameProvider, options, true)
        );
        text.add("() {");
        text.addLine("}");
    }
    return text;
  }
}
export class ClassVirtualDestructor
  extends io.TextScope
  implements IDestructor
{
  public readonly virtual: boolean = true;
  constructor(
    private readonly _classNameProvider: io.IClassNameProvider,
    scope: io.TextScope
  ) {
    super(scope.scopeStart, scope.scopeEnd);
  }
  equals(other: IDestructor): boolean {
    return this.virtual === other.virtual; // TODO we should compare class names as well
  }

  serialize(options: io.SerializationOptions): io.Text {
    const className = this._classNameProvider.getClassName(options.mode, true);
    const text = io.Text.createEmpty(options.indentStep);
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.abstractFactoryHeader:
        text.addLine(`virtual ~${className}();`);
        break;
      case io.SerializableMode.implHeader:
        text.addLine(`~${className}() override;`);
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
// TODO cleanup duplications
export class ClassDefaultVirtualDestructor
  extends io.TextScope
  implements IDestructor
{
  public readonly virtual: boolean = true;
  constructor(
    private readonly _classNameProvider: io.IClassNameProvider,
    scope: io.TextScope
  ) {
    super(scope.scopeStart, scope.scopeEnd);
  }
  equals(other: IDestructor): boolean {
    return this.virtual === other.virtual; // TODO we should compare class names as well
  }

  serialize(options: io.SerializationOptions): io.Text {
    const className = this._classNameProvider.getClassName(options.mode, true);
    const text = io.Text.createEmpty(options.indentStep);
    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.interfaceHeader:
      case io.SerializableMode.abstractFactoryHeader:
        text.addLine(`virtual ~${className}() = default;`);
        break;
      case io.SerializableMode.implHeader:
        text.addLine(`~${className}() override;`);
        break;
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
