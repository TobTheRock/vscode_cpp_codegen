import { compact, flatten, isEqual, last, zip } from "lodash";

import * as io from "../io";
import {
  IClass,
  IClassScope,
  IDefinition,
  ignoresClassNames,
  INamespace,
  isDefinition,
} from "./TypeInterfaces";
import { IConstructor, IDestructor, IFunction } from ".";

export class SourceFileDefinition extends io.TextScope implements IDefinition {
  readonly name: string;
  readonly classNames: string[];
  constructor(
    name: string,
    public readonly returnVal: string,
    public readonly args: string,
    public readonly namespaceNames: string[],
    classNames: string[],
    scope: io.TextScope,
    private _serializable: io.ISerializable
  ) {
    super(scope.scopeStart, scope.scopeEnd);

    const splittedName = name.split(/\s+/);
    const splittedClassName = splittedName[0].split("::");
    this.name =
      splittedClassName[splittedClassName.length - 1] +
      splittedName.slice(1).join();
    this.classNames = splittedClassName
      .slice(0, splittedClassName.length - 1)
      .concat(classNames);
  }

  static createFromFunction(
    fnct: IFunction,
    namespaceNames: string[]
  ): SourceFileDefinition {
    return new SourceFileDefinition(
      fnct.name,
      fnct.returnVal,
      fnct.args,
      namespaceNames,
      [],
      fnct as io.TextScope,
      fnct as io.ISerializable
    );
  }

  static createFromMemberFunction(
    fnct: IFunction,
    namespaceNames: string[],
    classNames: string[]
  ): SourceFileDefinition {
    if (ignoresClassNames(fnct)) {
      classNames = [];
    }
    return new SourceFileDefinition(
      fnct.name,
      fnct.returnVal,
      fnct.args,
      namespaceNames,
      classNames,
      fnct as io.TextScope,
      fnct as io.ISerializable
    );
  }

  static createFromDestructor(
    dtor: IDestructor,
    namespaceNames: string[],
    classNames: string[]
  ): SourceFileDefinition {
    const className = last(classNames)!;
    return new SourceFileDefinition(
      "~" + className,
      "",
      "",
      namespaceNames,
      classNames,
      dtor as io.TextScope,
      dtor as io.ISerializable
    );
  }

  static createFromConstructor(
    ctor: IConstructor,
    namespaceNames: string[],
    classNames: string[]
  ): SourceFileDefinition {
    const className = last(classNames)!;
    return new SourceFileDefinition(
      className,
      "",
      ctor.args,
      namespaceNames,
      classNames,
      ctor as io.TextScope,
      ctor as io.ISerializable
    );
  }

  serialize(options: io.SerializationOptions): io.Text {
    return this._serializable.serialize(options);
  }

  equals(other: IFunction): boolean {
    let nameMatching: boolean;

    if (isDefinition(other)) {
      const otherDef = other as IDefinition;
      nameMatching =
        this.name === other.name &&
        isEqual(
          [...this.namespaceNames, ...this.classNames],
          [...otherDef.namespaceNames, ...otherDef.classNames]
        );
    } else {
      nameMatching =
        other.name ===
        [...this.namespaceNames, ...this.classNames, this.name].join("::");
    }

    return (
      nameMatching &&
      this.compareArguments(other) &&
      this.returnVal === other.returnVal
    );
  }

  private compareArguments(other: IFunction): boolean {
    const ownArgs = compact(this.args.split(/,/));
    const otherArgs = compact(other.args.split(/,/));

    if (ownArgs.length !== otherArgs.length) {
      return false;
    }

    for (const args of zip(ownArgs, otherArgs)) {
      const ownArg = compact(args[0]?.split(/\s+/));
      const otherArg = compact(args[1]?.split(/\s+/));
      const ownArgWithoutLast = ownArg?.slice(0, -1);
      const otherArgWithoutLast = otherArg?.slice(0, -1);

      if (
        !isEqual(ownArg, otherArg) &&
        !isEqual(ownArg, otherArgWithoutLast) &&
        !isEqual(ownArgWithoutLast, otherArg) &&
        !isEqual(ownArgWithoutLast, otherArgWithoutLast)
      ) {
        return false;
      }
    }

    return true;
  }
}

export function extractDefinitionsFromNamespace(
  namespace: INamespace,
  mode: io.SerializableMode,
  namespaceNames: string[] = []
) {
  return [
    ...namespace.functions.map((funct) =>
      SourceFileDefinition.createFromFunction(funct, namespaceNames)
    ),
    ...flatten(
      namespace.classes.map((cl) => extractDefinitionsFromClass(cl, mode))
    ),
  ];
}

// TODO this is recursive, how to differ from the non recursive extractDefinitionsFromNamespace?
export function extractDefinitionsFromClass(
  cl: IClass,
  mode: io.SerializableMode,
  namespaceNames: string[] = [],
  parentClassNames: string[] = []
): IDefinition[] {
  const className = mode ? cl.getName(mode) : cl.name;
  const classNames = [...parentClassNames, className];
  const definitions: IDefinition[] = [];

  definitions.push(
    ...flatten(
      [cl.privateScope, cl.protectedScope, cl.publicScope].map((scope) =>
        extractDefinitionsFromClassScope(
          scope,
          namespaceNames,
          classNames,
          mode
        )
      )
    )
  );

  return definitions;
}

function extractDefinitionsFromClassScope(
  scope: IClassScope,
  namespaceNames: string[],
  classNames: string[],
  mode: io.SerializableMode
): IDefinition[] {
  const definitions: IDefinition[] = scope.constructors.map((ctor) =>
    SourceFileDefinition.createFromConstructor(ctor, namespaceNames, classNames)
  );
  if (scope.destructor) {
    definitions.push(
      SourceFileDefinition.createFromDestructor(
        scope.destructor,
        namespaceNames,
        classNames
      )
    );
  }
  definitions.push(
    ...scope.memberFunctions.map((fnct) =>
      SourceFileDefinition.createFromMemberFunction(
        fnct,
        namespaceNames,
        classNames
      )
    )
  );
  definitions.push(
    ...flatten(
      scope.nestedClasses.map((cl) =>
        extractDefinitionsFromClass(cl, mode, namespaceNames, classNames)
      )
    )
  );
  return definitions;
}
