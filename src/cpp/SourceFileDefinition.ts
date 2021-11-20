import TreeModel = require("tree-model");
import {
  compact,
  dropWhile,
  flatten,
  head,
  isEqual,
  last,
  remove,
  reverse,
  zip,
} from "lodash";

import * as io from "../io";
import {
  IClass,
  IDefinition,
  ignoresClassNames,
  INamespace,
  isDefinition,
} from "./TypeInterfaces";
import { IClassScope, IConstructor, IDestructor, IFunction } from ".";
import { Namespace } from "./Namespace";

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
export interface AddDefinitionReturn {
  added: io.ISerializable;
  namespaceWhere: io.TextScope;
}

export class NamespaceDefinitionManipulator {
  private _rootNode: TreeModel.Node<INamespace>;
  private _model: TreeModel;

  constructor(rootNamespace: INamespace) {
    this._model = new TreeModel({ childrenPropertyName: "subnamespaces" });
    this._rootNode = this._model.parse(rootNamespace);
  }

  extractDefinitions(mode?: io.SerializableMode): IDefinition[] {
    const definitions: IDefinition[] = [];
    this._rootNode.walk((node) => {
      const namespaceNames = this.getNamespaceNames(node);
      const newDefinitions = node.model.functions.map((fnct: IFunction) =>
        SourceFileDefinition.createFromFunction(fnct, namespaceNames)
      );
      newDefinitions.push(
        ...flatten(
          node.model.classes.map((cl: IClass) =>
            this.extractDefinitionsFromClass(cl, namespaceNames, [], mode)
          )
        )
      );
      definitions.push(...newDefinitions);
      return true;
    });

    return definitions;
  }

  addDefinition(definition: IDefinition): AddDefinitionReturn {
    let parentNode = this._rootNode;

    const namespacesToBeAdded = dropWhile(
      definition.namespaceNames,
      (_, index) => {
        const node = this.findNodeFromNamespaceNames(
          definition.namespaceNames.slice(0, index + 1),
          parentNode
        );
        if (!node) {
          return false;
        }
        parentNode = node;
        return true;
      }
    );

    const addedSerializable = this.addNestedNamespacesWithDefinition(
      parentNode,
      namespacesToBeAdded,
      definition
    );
    return {
      added: addedSerializable,
      namespaceWhere: parentNode.model as io.TextScope,
    };
  }

  removeDefinition(definition: IDefinition): io.TextScope {
    const node = this.findNodeFromNamespaceNames(definition.namespaceNames);
    if (!node) {
      return definition;
    }

    const namespaceNames = this.getNamespaceNames(node);
    remove(node.model.functions, (fnct: IFunction) =>
      definition.equals(
        SourceFileDefinition.createFromFunction(fnct, namespaceNames)
      )
    );

    let scopeToBeRemoved = definition as io.TextScope;
    for (const nodeInPath of reverse(node.getPath())) {
      if (this.isNamespaceEmpty(nodeInPath.model) && !nodeInPath.isRoot()) {
        nodeInPath.drop();
        scopeToBeRemoved = nodeInPath.model;
      } else {
        break;
      }
    }

    return scopeToBeRemoved;
  }

  private getNamespaceNames(node: TreeModel.Node<INamespace>): string[] {
    return node
      .getPath()
      .map((node) => node.model.name)
      .filter((name) => name.length);
  }

  private findNodeFromNamespaceNames(
    namespaceNames: string[],
    rootNode: TreeModel.Node<INamespace> = this._rootNode
  ): TreeModel.Node<INamespace> | undefined {
    return rootNode.first((node) =>
      isEqual(this.getNamespaceNames(node), namespaceNames)
    );
  }

  private extractDefinitionsFromClassScope(
    scope: IClassScope,
    namespaceNames: string[],
    classNames: string[],
    mode?: io.SerializableMode
  ): IDefinition[] {
    const definitions: IDefinition[] = scope.constructors.map((ctor) =>
      SourceFileDefinition.createFromConstructor(
        ctor,
        namespaceNames,
        classNames
      )
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
          this.extractDefinitionsFromClass(cl, namespaceNames, classNames, mode)
        )
      )
    );
    return definitions;
  }

  private extractDefinitionsFromClass(
    cl: IClass,
    namespaceNames: string[],
    parentClassNames: string[],
    mode?: io.SerializableMode
  ): IDefinition[] {
    const className = mode ? cl.getName(mode) : cl.name;
    const classNames = [...parentClassNames, className];
    const definitions: IDefinition[] = [];

    definitions.push(
      ...flatten(
        [cl.privateScope, cl.protectedScope, cl.publicScope].map((scope) =>
          this.extractDefinitionsFromClassScope(
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

  private addNestedNamespacesWithDefinition(
    rootNode: TreeModel.Node<INamespace>,
    namespaceNames: string[],
    definition: IDefinition
  ): io.ISerializable {
    const namespaces = namespaceNames.map(
      (namespaceName) =>
        new Namespace(namespaceName, io.TextScope.createEmpty())
    );

    for (let index = 1; index < namespaces.length; index++) {
      const namespace = namespaces[index];
      namespaces[index - 1].subnamespaces.push(namespace);
    }

    (last(namespaces) ?? rootNode.model).functions.push(definition);

    const firstNamespace = head(namespaces);
    if (firstNamespace) {
      rootNode.addChild(this._model.parse(firstNamespace));
    }

    return firstNamespace ?? definition;
  }

  private isNamespaceEmpty(namespace: INamespace): boolean {
    return (
      !namespace.functions.length &&
      !namespace.classes.length &&
      !namespace.subnamespaces.length
    );
  }
}

export function extractDefinitonsFromNamespace(
  rootNamespace: INamespace,
  mode?: io.SerializableMode
): IDefinition[] {
  return new NamespaceDefinitionManipulator(rootNamespace).extractDefinitions(
    mode
  );
}
