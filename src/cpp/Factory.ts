import { IClass, IFunction } from "./TypeInterfaces";
import { Configuration } from "../Configuration";
import { NamePattern } from "../NamePattern";
import { MemberFunctionBase } from "./MemberFunction";
import * as io from "../io";
import { ClassScopeBase } from "./ClassScope";
import { ClassDefaultVirtualDestructor } from "./ClassConstructor";

class PureVirtualFactoryMethod extends MemberFunctionBase {
  constructor(
    name: string,
    returnValue: string,
    classNameProvider: io.IClassNameProvider
  ) {
    super(
      name,
      returnValue,
      "",
      true,
      io.TextScope.createEmpty(),
      classNameProvider
    );
  }
  serialize(options: io.SerializationOptions): io.Text {
    const text = io.Text.createEmpty(options.indentStep);
    switch (options.mode) {
      case io.SerializableMode.abstractFactoryHeader:
        return this.serializeDeclaration(text, options, "virtual ", " = 0");
      default:
        return text;
    }
  }
}
export class AbstractFactoryClassPublicScope extends ClassScopeBase {
  memberFunctions: IFunction[];
  constructor(cl: IClass, classNameProvider: io.IClassNameProvider) {
    super(classNameProvider, "public");
    const config = Configuration.get(); // TODO pass the config via SerializationOptions
    const namePattern = new NamePattern(config);
    const methodName = `create${
      namePattern.deduceImplementationName(cl.name) ?? cl.name
    }`;
    this.memberFunctions = [
      new PureVirtualFactoryMethod(methodName, cl.name, classNameProvider),
    ];
    this.destructor = new ClassDefaultVirtualDestructor(
      classNameProvider,
      io.TextScope.createEmpty()
    );
  }
  deserialize(): void {
    return;
  }
}
