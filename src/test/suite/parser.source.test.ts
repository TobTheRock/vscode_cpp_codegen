import * as assert from "assert";
import { Done, describe, it, test } from "mocha";
import { callItAsync } from "./utils";
import { SourceParser } from "../../io/SourceParser";
import {
  TextFragment,
  SerializableMode,
  ISerializable,
  TextScope,
  compareSignaturables,
} from "../../io";

const argData = [
  "",
  "int test",
  "int test1, const Class* test2, void* test3",
  "int \ttest1,\t\n const\n Class* test2\n, void* test3\n\t",
];
suite("Parser Source Files Tests", () => {
  describe("ParseStandaloneSignatures", function () {
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
            const int* fncName3(${arg}) {
                //FUNCTION BODY
            }
        `
        );
        const signatures = SourceParser.parseSignatures(testData);
        assert.strictEqual(signatures.length, 3);

        const argWithoutSpaces = `${arg}`.replace(/\s/g, "");
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: [],
              signature: `fncName(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: [],
              signature: `fncName2(${argWithoutSpaces})const`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: [],
              signature: `fncName3(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
      }
    );
  });

  describe("ParseStandaloneSingleSignatureWithBody", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testStr = `int fncName(${arg}) {
            if (working) {
            }}`;
        const testData = TextFragment.createFromString(testStr);
        const signatures = SourceParser.parseSignatures(testData);
        assert.strictEqual(signatures.length, 1);

        const argWithoutSpaces = `${arg}`.replace(/\s/g, "");

        assert.strictEqual(
          signatures[0].signature,
          `fncName(${argWithoutSpaces})`
        );
        assert.deepStrictEqual(signatures[0].namespaces, []);
        assert.strictEqual(signatures[0].textScope.scopeStart, 0);
        assert.strictEqual(
          signatures[0].textScope.scopeEnd,
          testStr.length - 1
        );
        assert.strictEqual(signatures[0].content, testStr);
      }
    );
  });

  describe("ParseMemberFunctionSignature", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testData = TextFragment.createFromString(
          `
            int TestClass::fncName(${arg}) {
                //FUNCTION BODY
            }
            std::shared_ptr<int> TestClass::fncName2(${arg})  const {
                //FUNCTION BODY
            }
            const int* TestClass::fncName3(${arg}) {
                //FUNCTION BODY
            }
        `
        );
        const signatures = SourceParser.parseSignatures(testData);
        assert.strictEqual(signatures.length, 3);

        const argWithoutSpaces = `${arg}`.replace(/\s/g, "");
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["TestClass"],
              signature: `fncName(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["TestClass"],
              signature: `fncName2(${argWithoutSpaces})const`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["TestClass"],
              signature: `fncName3(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
      }
    );
  });

  describe("FunctionSignatureHasCorrectTextScope", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testDataStr = `
        int TestClass::fncName(${arg}) {
            //FUNCTION BODY
        }
        `;
        const testData = TextFragment.createFromString(testDataStr);
        const signatures = SourceParser.parseSignatures(testData);
        assert.strictEqual(signatures.length, 1);

        const sigStart = testDataStr.indexOf("int");
        const sigEnd = testDataStr.indexOf("}");
        assert.strictEqual(signatures[0].textScope.scopeStart, sigStart);
        assert.strictEqual(signatures[0].textScope.scopeEnd, sigEnd);
      }
    );
  });

  describe("ParseExplicitNamespaceSignature", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testData = TextFragment.createFromString(
          `
            int namespace::TestClass::fncName(${arg}) {
                //FUNCTION BODY
            }
            std::shared_ptr<int> namespace::standAloneFnc(${arg})  const {
                //FUNCTION BODY
            }
            const int* namespace::namespace2::TestClass::fncName2(${arg}) {
                //FUNCTION BODY
            }
        `
        );
        const signatures = SourceParser.parseSignatures(testData);
        assert.strictEqual(signatures.length, 3);

        const argWithoutSpaces = `${arg}`.replace(/\s/g, "");
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["namespace", "TestClass"],
              signature: `fncName(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["namespace"],
              signature: `standAloneFnc(${argWithoutSpaces})const`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["namespace", "namespace2", "TestClass"],
              signature: `fncName2(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
      }
    );
  });

  describe("ParseImplicitNamespaceSignature", function () {
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
        const signatures = SourceParser.parseSignatures(testData);
        assert.strictEqual(signatures.length, 3);

        const argWithoutSpaces = `${arg}`.replace(/\s/g, "");
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["namespaceName", "TestClass"],
              signature: `fncName(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["namespaceName"],
              signature: `standAloneFnc(${argWithoutSpaces})const`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["namespaceName", "namespaceName2", "TestClass"],
              signature: `fncName2(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
      }
    );
  });

  describe("ParseImplicitAndExplicitNamespaceSignature", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testData = TextFragment.createFromString(
          `
            namespace namespaceName {
                int namespaceName2::TestClass::fncName(${arg}) {
                    //FUNCTION BODY
                }

            }}
        `
        );
        const signatures = SourceParser.parseSignatures(testData);
        assert.strictEqual(signatures.length, 1);

        const argWithoutSpaces = `${arg}`.replace(/\s/g, "");
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["namespaceName", "namespaceName2", "TestClass"],
              signature: `fncName(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
      }
    );
  });

  describe("ParseConstructorSignature", function () {
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
        const signatures = SourceParser.parseSignatures(testData);
        assert.strictEqual(signatures.length, 1);

        const argWithoutSpaces = `${arg}`.replace(/\s/g, "");
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["ClassName"],
              signature: `ClassName(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
      }
    );
  });

  describe("ParseConstructorWithInitializerListSignature", function () {
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
        const signatures = SourceParser.parseSignatures(testData);
        assert.strictEqual(signatures.length, 1);

        const argWithoutSpaces = `${arg}`.replace(/\s/g, "");
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["ClassName"],
              signature: `ClassName(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
      }
    );
  });

  describe("ParseConstructorWithExplicitNamespaceSignature", function () {
    callItAsync(
      "With arguments ${value}",
      argData,
      async function (arg: string) {
        const testData = TextFragment.createFromString(
          `
            namespace::ClassName::ClassName(${arg}) {
                //CTOR BODY
            }
        `
        );
        const signatures = SourceParser.parseSignatures(testData);
        assert.strictEqual(signatures.length, 1);

        const argWithoutSpaces = `${arg}`.replace(/\s/g, "");
        assert.strictEqual(
          signatures.filter((sig) =>
            compareSignaturables(sig, {
              namespaces: ["namespace", "ClassName"],
              signature: `ClassName(${argWithoutSpaces})`,
              textScope: new TextScope(0, 0),
              content: "",
            })
          ).length,
          1
        );
      }
    );
  });

  test("ParseDestructorSignature", () => {
    const testData = TextFragment.createFromString(
      `
            ClassName::~ClassName() {
                //BODY
            }
        `
    );
    const signatures = SourceParser.parseSignatures(testData);
    assert.strictEqual(signatures.length, 1);
    assert.strictEqual(
      signatures.filter((sig) =>
        compareSignaturables(sig, {
          namespaces: ["ClassName"],
          signature: `~ClassName()`,
          textScope: new TextScope(0, 0),
          content: "",
        })
      ).length,
      1);
  });

  test("ParseDestructorWithExplicitNamespaceSignature", () => {
    const testData = TextFragment.createFromString(
      `
            namespace::ClassName::~ClassName() {
                //BODY
            }
        `
    );
    const signatures = SourceParser.parseSignatures(testData);
    assert.strictEqual(signatures.length, 1);
    assert.strictEqual(
      signatures.filter((sig) =>
        compareSignaturables(sig, {
          namespaces: ["namespace", "ClassName"],
          signature: `~ClassName()`,
          textScope: new TextScope(0, 0),
          content: "",
        })
      ).length,
      1
    );
  });

});

