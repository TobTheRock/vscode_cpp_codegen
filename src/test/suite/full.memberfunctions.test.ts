import * as assert from "assert";
import { Done, describe, it, test } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { callItAsync } from "./utils";

import { HeaderParser } from "../../io/HeaderParser";
import { ClassNameGenerator, MemberFunction } from "../../cpp";
import { TextFragment, SerializableMode } from "../../io";

const args = [
  "",
  "int test",
  "int test1, const Class* test2, void* test3",
  "int \ttest1,\t\n const\n Class* test2\n, void* test3\n\t",
  "int test = 3",
  "int test = int()",
  "int test = int{}",
  "int test = int{}, void* test2, std::shared_ptr<Test> test3 = nullptr, Test test4 = Test(1,2,3,4), char* test5",
];
const argsWoInit = [
  "",
  "int test",
  "int test1, const Class* test2, void* test3",
  "int \ttest1,\t\n const\n Class* test2\n, void* test3\n\t",
  "int test",
  "int test",
  "int test",
  "int test, void* test2, std::shared_ptr<Test> test3, Test test4, char* test5",
];

class TestData {
  constructor(public arg: string, public argWoInit: string) {}

  public toString() {
    return this.arg;
  }
}
const testData = Array.from(args, (arg, idx) => {
  return new TestData(arg, argsWoInit[idx]);
});

suite("Full Member Function Tests", () => {
  describe("ParseAndSerializeSingle", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {

        const testContent = TextFragment.createFromString(
          "int fncName(" + data.arg + ");"
        );
        const testClassName = "TestClass";
        const classNameGen = new ClassNameGenerator(testClassName, false);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );
      }
    );
  });

  describe("ParseAndSerializeSingleWithConstReturn", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "const int* fncName(" + data.arg + ");"
        );
        const testClassName = "TestClass";
        const classNameGen = new ClassNameGenerator(testClassName, false);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "const int*");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "const int* fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "const int* TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tconst int* returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );
      }
    );
  });

  describe("ParseAndSerializeSingleWithWhitespaceInReturn", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "std::pair<int, void*> fncName(" + data.arg + ");"
        );
        const testClassName = "TestClass";
        const classNameGen = new ClassNameGenerator(testClassName, false);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "std::pair<int, void*>");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "std::pair<int, void*> fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "std::pair<int, void*> TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tstd::pair<int, void*> returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );
      }
    );
  });

  describe("ParseAndSerializeSingleConst", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "int fncName(" + data.arg + ") const;"
        );
        const testClassName = "TestClass";
        const classNameGen = new ClassNameGenerator(testClassName, false);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName (" + data.arg + ") const;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );
      }
    );
  });

  describe("ParseAndSerializeSingleVirtual", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "virtual int fncName(" + data.arg + ")  ;"
        );
        const testClassName = "TestClass";
        const classNameGen = new ClassNameGenerator(testClassName, false);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName (" + data.arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          "virtual int fncName (" + data.arg + ") =0;"
        );
      }
    );
  });

  describe("ParseAndSerializeSingleVirtualOverride", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "int fncName(" + data.arg + ")  override;"
        );
        const testClassName = "TestClass";
        const classNameGen = new ClassNameGenerator(testClassName, false);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName (" + data.arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          "virtual int fncName (" + data.arg + ") =0;"
        );
      }
    );
  });

  describe("ParseAndSerializeSingleVirtualConst", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "virtual int fncName(" + data.arg + ")   const;"
        );
        const testClassName = "TestClass";
        const classNameGen = new ClassNameGenerator(testClassName, false);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName (" + data.arg + ") const override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          "virtual int fncName (" + data.arg + ") const =0;"
        );
      }
    );
  });

  describe("ParseAndSerializeSinglePureVirtual", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "virtual int fncName(" + data.arg + ") =0;"
        );
        const testClassName = "ITestClass";
        const classNameGen = new ClassNameGenerator(testClassName, true);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "virtual int fncName (" + data.arg + ") =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          ""
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          "int fncName (" + data.arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );
      }
    );
  });

  describe("ParseAndSerializeSinglePureVirtualConst", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "virtual int fncName(" + data.arg + ")   const = 0;"
        );
        const testClassName = "ITestClass";
        const classNameGen = new ClassNameGenerator(testClassName, true);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "virtual int fncName (" + data.arg + ") const =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          ""
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          "int fncName (" + data.arg + ") const override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );
      }
    );
  });

  describe("ParseAndSerializeSingleStatic", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "static int fncName(" + data.arg + "); "
        );
        const testClassName = "TestClass";
        const classNameGen = new ClassNameGenerator(testClassName, false);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "static int fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );
      }
    );
  });

  describe("ParseMultipleMixedType", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(`
		virtual int fncName(${data.arg})   const = 0;
		virtual int fncName2(${data.arg}) =0;
		std::shared_ptr<Test> fncName3(${data.arg});
		void fncName4(${data.arg}) const;
		virtual int fncName5(${data.arg});
		`);
        const testClassName = "ITestClass";
        const classNameGen = new ClassNameGenerator(testClassName, true);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 5);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "virtual int fncName (" + data.arg + ") const =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          "int fncName (" + data.arg + ") const override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );

        memberFnct = parsedFunctions[1] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName2");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "virtual int fncName2 (" + data.arg + ") =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          "int fncName2 (" + data.arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          "int TestClass::fncName2 (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );

        memberFnct = parsedFunctions[2] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName3");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "std::shared_ptr<Test>");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "std::shared_ptr<Test> fncName3 (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "std::shared_ptr<Test> ITestClass::fncName3 (" +
            data.argWoInit +
            ") {\n" +
            "\tstd::shared_ptr<Test> returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );

        memberFnct = parsedFunctions[3] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName4");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "void");
        assert.strictEqual(memberFnct.isConst, true);
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "void fncName4 (" + data.arg + ") const;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "void ITestClass::fncName4 (" + data.argWoInit + ") const {\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );

        memberFnct = parsedFunctions[4] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName5");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName5 (" + data.arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int ITestClass::fncName5 (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          "virtual int fncName5 (" + data.arg + ") =0;"
        );
      }
    );
  });
});
