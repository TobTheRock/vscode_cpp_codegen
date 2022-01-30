import * as assert from "assert";
import { Done, describe, it, test } from "mocha";
import { callItAsync } from "./utils";
import { HeaderParser } from "../../cpp/HeaderParser";
import { TextFragment, IClassNameProvider, SerializableMode } from "../../io";
import { difference } from "lodash";

const dummyClassNameProvider: IClassNameProvider = {
  originalName: "TestClass",
  getClassName: () => "TestClass",
};
const argData = [
  "",
  "int test",
  "int test1, const Class* test2, void* test3",
  "int \ttest1,\t\n const\n Class* test2\n, void* test3\n\t",
];

suite("Constructor/Destructor Tests", () => {
  describe("Parse constructor", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (arg: string) {
        const testContent = TextFragment.createFromString(
          "TestClass(" + arg + ");"
        );

        let parsedConstructors = HeaderParser.parseClassConstructors(
          testContent,
          dummyClassNameProvider
        );
        assert.strictEqual(parsedConstructors.length, 1);
        const ctor = parsedConstructors[0];
        assert.strictEqual(ctor.args, arg);
      }
    );
  });

  test("Do not parse destructor as constructor", () => {
    const testContent = TextFragment.createFromString("~TestClass();");

    let parsedConstructors = HeaderParser.parseClassConstructors(
      testContent,
      dummyClassNameProvider
    );
    assert.strictEqual(parsedConstructors.length, 0);
  });

  test("Do not parse defaulted constructor", () => {
    const testContent = TextFragment.createFromString("TestClass() = default;");

    let parsedConstructors = HeaderParser.parseClassConstructors(
      testContent,
      dummyClassNameProvider
    );
    assert.strictEqual(parsedConstructors.length, 0);
  });

  test("Serialize as source + header", () => {
    const testContent = TextFragment.createFromString("TestClass();");

    let parsedConstructors = HeaderParser.parseClassConstructors(
      testContent,
      dummyClassNameProvider
    );
    assert.strictEqual(parsedConstructors.length, 1);
    const ctor = parsedConstructors[0];
    let serial = ctor.serialize({ mode: SerializableMode.header }).toString();
    assert.ok(serial.includes("TestClass()"));
    serial = ctor.serialize({ mode: SerializableMode.source }).toString();
    assert.ok(serial.includes("TestClass::TestClass()"));
  });
  const allModes = Object.values(SerializableMode).filter(
    (val) => typeof val === "number"
  ) as SerializableMode[];
  const ctorValidModes = [SerializableMode.header, SerializableMode.source];
  const ctorInvalidModes = difference(allModes, ctorValidModes);

  describe("Does not serialize constructor", function () {
    callItAsync(
      "With modes ${value}",
      ctorInvalidModes,
      async function (mode: SerializableMode) {
        const testContent = TextFragment.createFromString("TestClass();");

        let parsedConstructors = HeaderParser.parseClassConstructors(
          testContent,
          dummyClassNameProvider
        );
        assert.strictEqual(parsedConstructors.length, 1);
        const ctor = parsedConstructors[0];
        assert.ok(
          ctor
            .serialize({
              mode,
            })
            .isEmpty()
        );
      }
    );
  });

  test("parse destructor", () => {
    const testContent = TextFragment.createFromString("~TestClass();");

    let parsedDestructors = HeaderParser.parseClassDestructors(
      testContent,
      dummyClassNameProvider
    );
    assert.strictEqual(parsedDestructors.length, 1);
  });

  test("Ignore defaulted destructor", () => {
    const testContent = TextFragment.createFromString(
      "~TestClass() = default;"
    );

    let parsedConstructors = HeaderParser.parseClassConstructors(
      testContent,
      dummyClassNameProvider
    );
    assert.strictEqual(parsedConstructors.length, 0);
  });

  test("Serialize  destructor as source + header", () => {
    const testContent = TextFragment.createFromString("~TestClass();");

    let parsedDestructors = HeaderParser.parseClassDestructors(
      testContent,
      dummyClassNameProvider
    );
    assert.strictEqual(parsedDestructors.length, 1);
    const dtor = parsedDestructors[0];
    let serial = dtor.serialize({ mode: SerializableMode.header }).toString();
    assert.ok(serial.includes("~TestClass()"));
    serial = dtor.serialize({ mode: SerializableMode.source }).toString();
    assert.ok(serial.includes("TestClass::~TestClass()"));
  });

  describe("Does not serialize destructor", function () {
    callItAsync(
      "With mode ${value}",
      ctorInvalidModes,
      async function (mode: SerializableMode) {
        const testContent = TextFragment.createFromString("~TestClass();");

        let parsedDestructors = HeaderParser.parseClassDestructors(
          testContent,
          dummyClassNameProvider
        );
        assert.strictEqual(parsedDestructors.length, 1);
        const ctor = parsedDestructors[0];
        assert.ok(
          ctor
            .serialize({
              mode,
            })
            .isEmpty()
        );
      }
    );
  });

  test("Serialize  virtual destructor as source + header + impl", () => {
    const testContent = TextFragment.createFromString("virtual ~TestClass();");

    let parsedDestructors = HeaderParser.parseClassDestructors(
      testContent,
      dummyClassNameProvider
    );
    assert.strictEqual(parsedDestructors.length, 1);
    const dtor = parsedDestructors[0];
    let serial = dtor.serialize({ mode: SerializableMode.header }).toString();
    assert.ok(serial.includes("~TestClass()"));
    serial = dtor.serialize({ mode: SerializableMode.implHeader }).toString();
    assert.ok(serial.includes("~TestClass()"));
    assert.ok(serial.includes("override"));
    serial = dtor.serialize({ mode: SerializableMode.source }).toString();
    assert.ok(serial.includes("TestClass::~TestClass()"));
    serial = dtor.serialize({ mode: SerializableMode.implSource }).toString();
    assert.ok(serial.includes("TestClass::~TestClass()"));
  });
});
