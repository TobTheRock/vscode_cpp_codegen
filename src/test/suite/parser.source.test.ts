import * as assert from "assert";
import { describe, test } from "mocha";
import { callItAsync } from "./utils";
import { TextFragment } from "../../io";
import { IFunction } from "../../cpp";
import { SourceParser } from "../../cpp/SourceParser";

const argData = [
  "",
  "int test",
  "int test1, const Class* test2, void* test3",
  "int \ttest1,\t\n const\n Class* test2\n, void* test3\n\t",
];

function compareFunctions(
  a: IFunction,
  name: string,
  args: string,
  returnVal: string
): boolean {
  return a.name === name && a.args === args && a.returnVal === returnVal;
}

suite("Parser Source Files Tests", () => {
  describe("Parse standalone definitions", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testData = TextFragment.createFromString(
          `
            int fncName(${arg}) {
                //FUNCTION BODY
            }
            std::shared_ptr<int> fncName2(${arg})  const {
                //FUNCTION BODY
            }
            const int* namespace::namespace2::TestClass::fncName3(${arg}) {
                //FUNCTION BODY
            }
        `
        );
        const namespace = SourceParser.parseRootNamespace(testData);
        const functions = namespace.functions;
        assert.strictEqual(functions.length, 3);

        assert.ok(compareFunctions(functions[0], "fncName", arg, "int"));
        assert.ok(
          compareFunctions(
            functions[1],
            "fncName2",
            arg,
            "std::shared_ptr<int>"
          )
        );
        assert.ok(
          compareFunctions(
            functions[2],
            "namespace::namespace2::TestClass::fncName3",
            arg,
            "const int*"
          )
        );
      }
    );
  });

  describe("Parse standalone single defintion with body containing brackets", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testStr = `int fncName(${arg}) {
            if (working) {
            }}`;
        const testData = TextFragment.createFromString(testStr);
        const namespace = SourceParser.parseRootNamespace(testData);
        const functions = namespace.functions;
        assert.strictEqual(functions.length, 1);
        assert.ok(compareFunctions(functions[0], "fncName", arg, "int"));
      }
    );
  });

  describe("Definition has correct text scope", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testDataStr = `
        int fncName(${arg}) {
            //FUNCTION BODY
        }

        syncData TestClass::anotherFnc(){}`;
        const testData = TextFragment.createFromString(testDataStr);
        const namespace = SourceParser.parseRootNamespace(testData);
        const functions = namespace.functions;
        assert.strictEqual(functions.length, 2);

        const sigStart = testDataStr.indexOf("int");
        const sigEnd = testDataStr.indexOf("syncData") - 1;
        assert.strictEqual(functions[0].scopeStart, sigStart);
        assert.strictEqual(functions[0].scopeEnd, sigEnd);
      }
    );
  });

  describe("Parse definitions within namespace", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testData = TextFragment.createFromString(
          `
            namespace namespaceName {
                int TestClass::fncName(${arg}) {
                    //FUNCTION BODY
                }
                std::shared_ptr<int> standAloneFnc(${arg})  const {
                    //FUNCTION BODY
                }

              namespace namespaceName2 {
                  const int* TestClass::fncName2(${arg}) {
                      //FUNCTION BODY
                  }

            }}
        `
        );
        const namespaces = SourceParser.parseNamespaces(testData);
        assert.strictEqual(namespaces.length, 1);

        let namespace = namespaces[0];
        let functions = namespace.functions;
        assert.strictEqual(functions.length, 2);

        assert.ok(
          compareFunctions(functions[0], "TestClass::fncName", arg, "int")
        );
        assert.ok(
          compareFunctions(
            functions[1],
            "standAloneFnc",
            arg,
            "std::shared_ptr<int>"
          )
        );
        assert.strictEqual(namespace.subnamespaces.length, 1);

        namespace = namespace.subnamespaces[0];
        functions = namespace.functions;
        assert.strictEqual(functions.length, 1);

        assert.ok(
          compareFunctions(
            functions[0],
            "TestClass::fncName2",
            arg,
            "const int*"
          )
        );
      }
    );
  });

  describe("Parse definitions with and without namespace", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testData = TextFragment.createFromString(
          `
          std::shared_ptr<int> standAloneFnc(${arg})  const {
              //FUNCTION BODY
          }
          namespace namespaceName {
                int TestClass::fncName(${arg}) {
                    //FUNCTION BODY
                }

          }
        `
        );
        const namespaces = SourceParser.parseNamespaces(testData);
        assert.strictEqual(namespaces.length, 1);

        let namespace = namespaces[0];
        let functions = namespace.functions;
        assert.strictEqual(functions.length, 1);

        assert.ok(
          compareFunctions(functions[0], "TestClass::fncName", arg, "int")
        );
        assert.strictEqual(namespace.subnamespaces.length, 0);

        namespace = SourceParser.parseRootNamespace(testData);
        functions = namespace.functions;
        assert.strictEqual(functions.length, 1);
        assert.strictEqual(namespace.subnamespaces.length, 0);
        assert.ok(
          compareFunctions(
            functions[0],
            "standAloneFnc",
            arg,
            "std::shared_ptr<int>"
          )
        );
      }
    );
  });

  describe("Parse constructor definition as standalone function", function () {
    callItAsync(
      "With arguments ${value}",
      argData,
      async function (arg: string) {
        const testData = TextFragment.createFromString(
          `
            ClassName::ClassName(${arg}) {
                //CTOR BODY
            }
        `
        );
        const namespace = SourceParser.parseRootNamespace(testData);
        let functions = namespace.functions;
        assert.strictEqual(functions.length, 1);

        assert.ok(
          compareFunctions(functions[0], "ClassName::ClassName", arg, "")
        );
      }
    );
  });

  describe("Parse constructor definition with initializer list", function () {
    callItAsync(
      "With arguments ${value}",
      argData,
      async function (arg: string) {
        const testData = TextFragment.createFromString(
          `
            ClassName::ClassName(${arg})
            : _bla(42)
            , _xyz(12)
            {
                //CTOR BODY
            }
        `
        );
        const namespace = SourceParser.parseRootNamespace(testData);
        let functions = namespace.functions;
        assert.strictEqual(functions.length, 1);

        assert.ok(
          compareFunctions(functions[0], "ClassName::ClassName", arg, "")
        );
      }
    );
  });

  test("Parse destructor definition", () => {
    const testData = TextFragment.createFromString(
      `
            ClassName::~ClassName() {
                //BODY
            }
        `
    );
    const namespace = SourceParser.parseRootNamespace(testData);
    let functions = namespace.functions;
    assert.strictEqual(functions.length, 1);

    assert.ok(compareFunctions(functions[0], "ClassName::~ClassName", "", ""));
  });

  test("Ignore static assignments", function () {
    const testData = TextFragment.createFromString(
      `
        const utils::JsonDelimiter JsonObject::DELIM(LIM_OBJECT_L, LIM_OBJECT_R);
        int fncName() {
            //FUNCTION BODY
        }
    `
    );
    const namespace = SourceParser.parseRootNamespace(testData);
    const functions = namespace.functions;
    assert.strictEqual(functions.length, 1);

    assert.ok(compareFunctions(functions[0], "fncName", "", "int"));
  });
});
