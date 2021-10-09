import * as assert from "assert";
import { test, beforeEach } from "mocha";
import { HeaderParser } from "../../cpp/HeaderParser";
import {
  extractDefinitonsFromNamespace,
  NamespaceDefinitionManipulator,
  SourceFileDefinition,
} from "../../cpp/SourceFileDefinition";
import { SourceParser } from "../../cpp/SourceParser";
import { StandaloneFunction } from "../../cpp/StandaloneFunction";
import { TextFragment, TextScope } from "../../io";

suite("SourceFileDefinition Tests", () => {
  let nNamespacesGenerated: number = 0;
  const emptyScope = TextScope.createEmpty();
  beforeEach(() => {
    nNamespacesGenerated = 0;
  });

  test("comparing with different name", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      [],
      [],
      emptyScope
    );
    let func2 = new SourceFileDefinition(
      `fncName2`,
      `void`,
      "",
      [],
      [],
      emptyScope
    );
    assert.ok(func.equals(func));
    assert.ok(!func.equals(func2));
  });

  test("comparing with different return value", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      [],
      [],
      emptyScope
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `int`,
      "",
      [],
      [],
      emptyScope
    );
    assert.ok(func.equals(func));
    assert.ok(!func.equals(func2));
  });

  test("comparing with different arguments", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      [],
      [],
      emptyScope
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "int",
      [],
      [],
      emptyScope
    );
    assert.ok(func.equals(func));
    assert.ok(!func.equals(func2));
  });

  test("comparing with different namespaces", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "Namespace2"],
      [],
      emptyScope
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1"],
      [],
      emptyScope
    );
    let func3 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace2"],
      [],
      emptyScope
    );
    assert.ok(func.equals(func));
    assert.ok(!func.equals(func2));
    assert.ok(!func.equals(func3));
  });

  test("comparing with class defintion", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "Namespace2"],
      [],
      emptyScope
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1"],
      ["ClassName"],

      emptyScope
    );
    let func3 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "ClassName"],
      [],

      emptyScope
    );
    assert.ok(!func.equals(func2));
    assert.ok(func3.equals(func2));
  });

  test("comparing with function with explicit namespaces", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "Namespace2"],
      [],
      emptyScope
    );
    let func2 = new StandaloneFunction(
      `Namespace1::ClassName::fncName`,
      `void`,
      "",
      emptyScope
    );
    let func3 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "ClassName"],
      [],
      emptyScope
    );
    let func4 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1"],
      ["ClassName"],

      emptyScope
    );
    assert.ok(!func.equals(func2));
    assert.ok(func3.equals(func2));
    assert.ok(func4.equals(func2));
  });

  test("comparing with different class names", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "Namespace2"],
      ["ClassName"],
      emptyScope
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1"],
      ["ClassName2"],
      emptyScope
    );

    assert.ok(func.equals(func));
    assert.ok(!func.equals(func2));
  });

  test("comparing with different argument variable names", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "int arg1, void* arg2",
      [],
      [],
      emptyScope
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "int , void*",
      [],
      [],
      emptyScope
    );
    let func3 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "int arg3, void* arg4",
      [],
      [],
      emptyScope
    );

    assert.ok(func.equals(func2));
    assert.ok(func2.equals(func));
    assert.ok(func.equals(func3));
    assert.ok(func2.equals(func3));
  });

  test("should set namespaces properly", () => {
    let func = new SourceFileDefinition(
      `Namespace2::fncName`,
      `void`,
      "",
      ["Namespace1"],
      [],
      emptyScope
    );
    assert.deepStrictEqual(["Namespace1"], func.namespaceNames);
    assert.deepStrictEqual(["Namespace2"], func.classNames);
  });

  test("Should extract function definition without namespace", function () {
    const testData = TextFragment.createFromString(
      `
        int fncName() {
            //FUNCTION BODY
        }
    `
    );
    const namespace = SourceParser.parseRootNamespace(testData);
    const expectedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      [],
      [],
      emptyScope
    );

    const definitons = extractDefinitonsFromNamespace(namespace);
    assert.strictEqual(definitons.length, 1);
    assert.ok(expectedDefinition.equals(definitons[0]));
  });

  test("Should extract function definition with implicit namespace", function () {
    const testData = TextFragment.createFromString(
      `
          int Namespace1::fncName() {
            //FUNCTION BODY
        }
    `
    );
    const namespace = SourceParser.parseRootNamespace(testData);
    const expectedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["Namespace1"],
      [],
      emptyScope
    );

    const definitons = extractDefinitonsFromNamespace(namespace);
    assert.strictEqual(definitons.length, 1);
    assert.ok(expectedDefinition.equals(definitons[0]));
  });

  test("Should extract function definition with explicit namespace", function () {
    const testData = TextFragment.createFromString(
      `
        namespace Namespace1 {
            int fncName() {
              //FUNCTION BODY
          }
        }

    `
    );
    const namespace = SourceParser.parseRootNamespace(testData);
    const expectedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["Namespace1"],
      [],
      emptyScope
    );

    const definitons = extractDefinitonsFromNamespace(namespace);
    assert.strictEqual(definitons.length, 1);
    assert.ok(expectedDefinition.equals(definitons[0]));
  });

  test("Should extract function definitions with explicit nested namespace", function () {
    const testData = TextFragment.createFromString(
      `
        namespace Namespace1 {
          int Namespace2::fncName() {
            //FUNCTION BODY
          }
          namespace Namespace2 {
            int fncName() {
              //FUNCTION BODY
            }
          }
        }

    `
    );
    const namespace = SourceParser.parseRootNamespace(testData);
    const expectedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["Namespace1", "Namespace2"],
      [],
      emptyScope
    );

    const definitons = extractDefinitonsFromNamespace(namespace);
    assert.strictEqual(definitons.length, 2);
    assert.ok(expectedDefinition.equals(definitons[0]));
    assert.ok(expectedDefinition.equals(definitons[1]));
  });

  test("Should extract function definitions with multiple nested namespaces", function () {
    const testData = TextFragment.createFromString(
      `
        namespace Namespace1 {
          namespace Namespace2 {
            int fncName() {
              //FUNCTION BODY
            }
          }
          namespace Namespace3 {
            int fncName() {
              //FUNCTION BODY
            }
          }
        }

    `
    );
    const namespace = SourceParser.parseRootNamespace(testData);
    const expectedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["Namespace1", "Namespace2"],
      [],
      emptyScope
    );
    const expectedDefinition2 = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["Namespace1", "Namespace3"],
      [],
      emptyScope
    );

    const definitons = extractDefinitonsFromNamespace(namespace);
    assert.strictEqual(definitons.length, 2);
    assert.ok(expectedDefinition.equals(definitons[0]));
    assert.ok(expectedDefinition2.equals(definitons[1]));
  });

  test("Should extract member function definition from class", function () {
    const testData = TextFragment.createFromString(
      `
      class ClassName {
        int fncName();
      };
    `
    );
    const namespace = HeaderParser.parseRootNamespace(testData);
    const expectedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["ClassName"],
      [],
      emptyScope
    );

    const definitons = extractDefinitonsFromNamespace(namespace);
    assert.strictEqual(definitons.length, 1);
    assert.ok(expectedDefinition.equals(definitons[0]));
  });

  test("Should extract destructor from class", function () {
    const testData = TextFragment.createFromString(
      `
      class ClassName {
        ~ClassName();
      };
    `
    );
    const namespace = HeaderParser.parseRootNamespace(testData);
    const expectedDefinition = new SourceFileDefinition(
      "~ClassName",
      "",
      "",
      ["ClassName"],
      [],
      emptyScope
    );

    const definitons = extractDefinitonsFromNamespace(namespace);
    assert.strictEqual(definitons.length, 1);
    assert.ok(expectedDefinition.equals(definitons[0]));
  });

  test("Should extract constructor from class", function () {
    const testData = TextFragment.createFromString(
      `
      class ClassName {
        ClassName(int);
      };
    `
    );
    const namespace = HeaderParser.parseRootNamespace(testData);
    const expectedDefinition = new SourceFileDefinition(
      "ClassName",
      "",
      "int",
      ["ClassName"],
      [],
      emptyScope
    );

    const definitons = extractDefinitonsFromNamespace(namespace);
    assert.strictEqual(definitons.length, 1);
    assert.ok(expectedDefinition.equals(definitons[0]));
  });

  test("Should extract member function definition  from class in namespace", function () {
    const testData = TextFragment.createFromString(
      `
      namespace NameSpace1 {
        class ClassName {
          int fncName();
        };
      }
    `
    );
    const namespace = HeaderParser.parseRootNamespace(testData);
    const expectedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["NameSpace1", "ClassName"],
      [],
      emptyScope
    );

    const definitons = extractDefinitonsFromNamespace(namespace);
    assert.strictEqual(definitons.length, 1);
    assert.ok(expectedDefinition.equals(definitons[0]));
  });

  test("Should extract member function definition from nested class", function () {
    const testData = TextFragment.createFromString(
      `
      class ClassName {
        class ClassName2 {
          int fncName();
          };
      };
    `
    );
    const namespace = HeaderParser.parseRootNamespace(testData);
    const expectedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["ClassName", "ClassName2"],
      [],
      emptyScope
    );

    const definitons = extractDefinitonsFromNamespace(namespace);
    assert.strictEqual(definitons.length, 1);
    assert.ok(expectedDefinition.equals(definitons[0]));
  });

  test("Should find existing namespace when adding definition", function () {
    const testData = TextFragment.createFromString(
      `
      namespace NameSpace1 {
      }
    `
    );
    const addedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["NameSpace1"],
      [],
      emptyScope
    );

    const namespace = SourceParser.parseRootNamespace(testData);
    const manipulator = new NamespaceDefinitionManipulator(namespace);
    const { added, where } = manipulator.addDefinition(addedDefinition);

    assert.deepStrictEqual(where, namespace.subnamespaces[0]);
    assert.deepStrictEqual(added, addedDefinition);
    assert.strictEqual(namespace.subnamespaces[0].functions.length, 1);
  });

  test("Should find existing nested namespace when adding definition", function () {
    const testData = TextFragment.createFromString(
      `
      namespace NameSpace1 {
        namespace NameSpace2 {
        }
        namespace NameSpace3 {
        }
      }
    `
    );
    const addedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["NameSpace1", "NameSpace2"],
      [],
      emptyScope
    );

    const namespace = SourceParser.parseRootNamespace(testData);
    const manipulator = new NamespaceDefinitionManipulator(namespace);
    const { added, where } = manipulator.addDefinition(addedDefinition);
    const expectedNamespace = namespace.subnamespaces[0].subnamespaces[0];

    assert.strictEqual(namespace.subnamespaces.length, 1);
    assert.strictEqual(namespace.subnamespaces[0].subnamespaces.length, 2);
    assert.deepStrictEqual(where, expectedNamespace);
    assert.deepStrictEqual(added, addedDefinition);
    assert.strictEqual(expectedNamespace.functions.length, 1);
  });

  test("Should add new namespaces", function () {
    const testData = TextFragment.createFromString(` `);
    const addedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["NameSpace1", "NameSpace2"],
      [],
      emptyScope
    );

    const namespace = SourceParser.parseRootNamespace(testData);
    const manipulator = new NamespaceDefinitionManipulator(namespace);
    const { added } = manipulator.addDefinition(addedDefinition);

    assert.strictEqual(namespace.subnamespaces.length, 1);
    assert.strictEqual(namespace.subnamespaces[0].subnamespaces.length, 1);
    assert.deepStrictEqual(added, namespace.subnamespaces[0]);
    assert.strictEqual(
      namespace.subnamespaces[0].subnamespaces[0].functions.length,
      1
    );
  });

  test("Should add new namespaces only once", function () {
    const testData = TextFragment.createFromString(` `);
    const addedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["NameSpace1", "NameSpace2"],
      [],
      emptyScope
    );

    const namespace = SourceParser.parseRootNamespace(testData);
    const manipulator = new NamespaceDefinitionManipulator(namespace);
    manipulator.addDefinition(addedDefinition);
    manipulator.addDefinition(addedDefinition);

    assert.strictEqual(namespace.subnamespaces.length, 1);
    assert.strictEqual(namespace.subnamespaces[0].subnamespaces.length, 1);
  });

  test("Should add new namespaces to existing", function () {
    const testData = TextFragment.createFromString(`
    namespace NameSpace1 {
    }
    `);
    const addedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      ["NameSpace1", "NameSpace2", "NameSpace3"],
      [],
      emptyScope
    );

    const namespace = SourceParser.parseRootNamespace(testData);
    const manipulator = new NamespaceDefinitionManipulator(namespace);
    const { added } = manipulator.addDefinition(addedDefinition);

    assert.strictEqual(namespace.subnamespaces.length, 1);
    assert.strictEqual(namespace.subnamespaces[0].subnamespaces.length, 1);
    assert.strictEqual(
      namespace.subnamespaces[0].subnamespaces[0].subnamespaces.length,
      1
    );
    assert.deepStrictEqual(added, namespace.subnamespaces[0].subnamespaces[0]);
    assert.strictEqual(
      namespace.subnamespaces[0].subnamespaces[0].subnamespaces[0].functions
        .length,
      1
    );
  });

  test("Should remove definition from namespace", function () {
    const testStr = `
    namespace NameSpace1 {
      void fncName() {};
      void fncName2() {};
    }
  `;
    const testData = TextFragment.createFromString(testStr);
    const definition = new SourceFileDefinition(
      "fncName",
      "void",
      "",
      ["NameSpace1"],
      [],
      new TextScope(42, 666)
    );

    const namespace = SourceParser.parseRootNamespace(testData);
    const manipulator = new NamespaceDefinitionManipulator(namespace);
    const scope = manipulator.removeDefinition(definition);

    assert.strictEqual(namespace.subnamespaces[0].functions.length, 1);
    assert.strictEqual(
      namespace.subnamespaces[0].functions[0].name,
      "fncName2"
    );
    assert.strictEqual(scope.scopeStart, 42);
    assert.strictEqual(scope.scopeEnd, 666);
  });

  test("Should remove empty namespaces", function () {
    const nsToBeRemovedStr = `namespace NameSpace1 {
        namespace NameSpace2 {
        void fncName() {};
        }
      }`;
    const testStr = `${nsToBeRemovedStr}
    namespace NameSpace3 {}
  `;
    const testData = TextFragment.createFromString(testStr);
    const definition = new SourceFileDefinition(
      "fncName",
      "void",
      "",
      ["NameSpace1", "NameSpace2"],
      [],
      emptyScope
    );

    const namespace = SourceParser.parseRootNamespace(testData);
    const manipulator = new NamespaceDefinitionManipulator(namespace);
    const scope = manipulator.removeDefinition(definition);

    assert.strictEqual(namespace.subnamespaces.length, 1);
    assert.strictEqual(namespace.subnamespaces[0].name, "NameSpace3");
    assert.strictEqual(scope.scopeStart, testStr.indexOf(nsToBeRemovedStr));
    assert.strictEqual(
      scope.scopeEnd,
      testStr.indexOf(nsToBeRemovedStr) + nsToBeRemovedStr.length - 1
    );
  });

  test("Should extract friend functions", function () {
    const testData = TextFragment.createFromString(`
      class TestClass {
        friend int fncName();
      };
    `);
    const expectedDefinition = new SourceFileDefinition(
      "fncName",
      "int",
      "",
      [],
      [],
      emptyScope
    );
    const namespace = HeaderParser.parseRootNamespace(testData);
    const defintions = extractDefinitonsFromNamespace(namespace);

    assert.strictEqual(defintions.length, 1);
    assert.ok(expectedDefinition.equals(defintions[0]));
  });

  test("Should extract cast operator functions", function () {
    const headerData = TextFragment.createFromString(`
      class TestClass { 
        operator std::string() const;
      };
    `);
    const headerNamespace = HeaderParser.parseRootNamespace(headerData);
    const sourceData = TextFragment.createFromString(`
    TestClass::operator std::string() const
      {
          return bla;
      }
    `);
    const sourceNamespace = SourceParser.parseRootNamespace(sourceData);

    const headerDefintions = extractDefinitonsFromNamespace(headerNamespace);
    const sourceDefintions = extractDefinitonsFromNamespace(sourceNamespace);

    assert.strictEqual(headerDefintions.length, 1);
    assert.strictEqual(sourceDefintions.length, 1);
    assert.ok(sourceDefintions[0].equals(headerDefintions[0]));
  });
});
