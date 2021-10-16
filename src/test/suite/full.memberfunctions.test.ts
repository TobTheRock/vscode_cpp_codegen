import * as assert from "assert";
import { describe, test } from "mocha";
import { callItAsync } from "./utils";

import { HeaderParser } from "../../cpp/HeaderParser";
import {} from "../../cpp";
import {
  TextFragment,
  SerializableMode,
  IClassNameProvider,
  TextScope,
} from "../../io";
import {
  MemberFunction,
  FriendFunction,
  PureVirtualMemberFunction,
  VirtualMemberFunction,
  StaticMemberFunction,
} from "../../cpp/MemberFunction";

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

const testClassName = "TestClass";
const testInterfaceName = "ITestClass";
const testClassNameProvider: IClassNameProvider = {
  originalName: testClassName,
  getClassName: (mode: SerializableMode) => {
    switch (mode) {
      case SerializableMode.implHeader:
      case SerializableMode.implSource:
        return testClassName;
      case SerializableMode.interfaceHeader:
        return testInterfaceName;
      default:
        return testClassName;
    }
  },
};
const testInterfaceNameProvider: IClassNameProvider = {
  originalName: testInterfaceName,
  getClassName: (mode: SerializableMode) => {
    switch (mode) {
      case SerializableMode.implHeader:
      case SerializableMode.implSource:
        return testClassName;
      case SerializableMode.interfaceHeader:
        return testInterfaceName;
      default:
        return testInterfaceName;
    }
  },
};

suite("Full Member Function Tests", () => {
  const indentStep = "\t";

  describe("ParseAndSerializeSingle", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testStr = "int fncName(" + data.arg + ");";
        const testContent = TextFragment.createFromString(testStr);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);
        const memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(memberFnct.scopeStart, 0);
        assert.strictEqual(memberFnct.scopeEnd, testStr.length - 1);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "int fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
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
        const testStr = "const int* fncName(" + data.arg + ");";
        const testContent = TextFragment.createFromString(testStr);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "const int*");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(memberFnct.scopeStart, 0);
        assert.strictEqual(memberFnct.scopeEnd, testStr.length - 1);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "const int* fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "const int* TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tconst int* returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
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
        const testStr = "std::pair<int, void*> fncName(" + data.arg + ");";
        const testContent = TextFragment.createFromString(testStr);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "std::pair<int, void*>");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(memberFnct.scopeStart, 0);
        assert.strictEqual(memberFnct.scopeEnd, testStr.length - 1);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "std::pair<int, void*> fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "std::pair<int, void*> TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tstd::pair<int, void*> returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
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
        const testStr = "int fncName(" + data.arg + ") const;";
        const testContent = TextFragment.createFromString(testStr);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);
        assert.strictEqual(memberFnct.scopeStart, 0);
        assert.strictEqual(memberFnct.scopeEnd, testStr.length - 1);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "int fncName (" + data.arg + ") const;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
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
        const testStr = "virtual int fncName(" + data.arg + ")  ;";
        const testContent = TextFragment.createFromString(testStr);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(memberFnct.scopeStart, 0);
        assert.strictEqual(memberFnct.scopeEnd, testStr.length - 1);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "int fncName (" + data.arg + ") override;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
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
        const testStr = "int fncName(" + data.arg + ")  override;";
        const testContent = TextFragment.createFromString(testStr);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(memberFnct.scopeStart, 0);
        assert.strictEqual(memberFnct.scopeEnd, testStr.length - 1);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "int fncName (" + data.arg + ") override;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
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
        const testStr = "virtual int fncName(" + data.arg + ")   const;";
        const testContent = TextFragment.createFromString(testStr);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);
        assert.strictEqual(memberFnct.scopeStart, 0);
        assert.strictEqual(memberFnct.scopeEnd, testStr.length - 1);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "int fncName (" + data.arg + ") const override;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
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
        const testStr = "virtual int fncName(" + data.arg + ") =0;";
        const testContent = TextFragment.createFromString(testStr);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testInterfaceNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(memberFnct.scopeStart, 0);
        assert.strictEqual(memberFnct.scopeEnd, testStr.length - 1);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "virtual int fncName (" + data.arg + ") =0;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          ""
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          "int fncName (" + data.arg + ") override;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
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
        const testStr = "virtual int fncName(" + data.arg + ")   const = 0;";
        const testContent = TextFragment.createFromString(testStr);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);
        assert.strictEqual(memberFnct.scopeStart, 0);
        assert.strictEqual(memberFnct.scopeEnd, testStr.length - 1);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "virtual int fncName (" + data.arg + ") const =0;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          ""
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          "int fncName (" + data.arg + ") const override;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
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
        const testStr = "static int fncName(" + data.arg + ");";
        const testContent = TextFragment.createFromString(testStr);

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(memberFnct.scopeStart, 0);
        assert.strictEqual(memberFnct.scopeEnd, testStr.length - 1);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "static int fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
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
        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testInterfaceNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 5);

        let memberFnct: MemberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "virtual int fncName (" + data.arg + ") const =0;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          "int fncName (" + data.arg + ") const override;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
          ""
        );

        memberFnct = parsedFunctions[1] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName2");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "virtual int fncName2 (" + data.arg + ") =0;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          "int fncName2 (" + data.arg + ") override;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          "int TestClass::fncName2 (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
          ""
        );

        memberFnct = parsedFunctions[2] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName3");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "std::shared_ptr<Test>");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "std::shared_ptr<Test> fncName3 (" + data.arg + ");"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "std::shared_ptr<Test> ITestClass::fncName3 (" +
            data.argWoInit +
            ") {\n" +
            "\tstd::shared_ptr<Test> returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
          ""
        );

        memberFnct = parsedFunctions[3] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName4");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "void");
        assert.strictEqual(memberFnct.isConst, true);
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "void fncName4 (" + data.arg + ") const;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "void ITestClass::fncName4 (" + data.argWoInit + ") const {\n}"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
          ""
        );

        memberFnct = parsedFunctions[4] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName5");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "int fncName5 (" + data.arg + ") override;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "int ITestClass::fncName5 (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
          "virtual int fncName5 (" + data.arg + ") =0;"
        );
      }
    );
  });

  describe("parse and serialize single friend function", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "friend int fncName(" + data.arg + ");"
        );

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);
        assert.ok(parsedFunctions[0] instanceof FriendFunction);

        let memberFnct: FriendFunction = parsedFunctions[0] as FriendFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "friend int fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "int fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
          ""
        );
      }
    );
  });

  describe("parse and serialize single const friend function", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "friend int fncName (" + data.arg + ") const;"
        );

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          testClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);
        assert.ok(parsedFunctions[0] instanceof FriendFunction);

        let memberFnct: FriendFunction = parsedFunctions[0] as FriendFunction;
        assert.strictEqual(memberFnct.name, "fncName");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.header,
            })
            .toString(),
          "friend int fncName (" + data.arg + ") const;"
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.source,
              indentStep,
            })
            .toString(),
          "int fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implHeader,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.implSource,
              indentStep,
            })
            .toString(),
          ""
        );
        assert.strictEqual(
          memberFnct
            .serialize({
              mode: SerializableMode.interfaceHeader,
            })
            .toString(),
          ""
        );
      }
    );
  });
  describe("Do not serialize if not in selection", function () {
    callItAsync(
      "With function arguments ${value}",
      [
        PureVirtualMemberFunction,
        VirtualMemberFunction,
        MemberFunction,
        StaticMemberFunction,
        FriendFunction,
      ],
      async function (memberFunctionType: any) {
        const rangeEnd = 42;
        const range = new TextScope(0, 42);
        const memberfunction = new memberFunctionType(
          "testName",
          "void",
          "",
          false,
          range,
          { getClassName: () => "TestClass", originalName: "TestClass" }
        );

        const selection = new TextScope(rangeEnd + 1, rangeEnd * 2);
        const serial = memberfunction
          .serialize({
            mode: SerializableMode.source,
            range: selection,
          })
          .toString();
        assert.strictEqual(serial.length, 0);
      }
    );
  });

  describe("Serialize if in selection", function () {
    callItAsync(
      "With function arguments ${value}",
      [
        VirtualMemberFunction,
        MemberFunction,
        StaticMemberFunction,
        FriendFunction,
      ],
      async function (memberFunctionType: any) {
        const rangeEnd = 42;
        const range = new TextScope(0, 42);
        const memberfunction = new memberFunctionType(
          "testName",
          "void",
          "",
          false,
          range,
          { getClassName: () => "TestClass", originalName: "TestClass" }
        );
        const rangeFull = new TextScope(0, rangeEnd);
        const rangePartialStart = new TextScope(0, rangeEnd / 2);
        const rangePartialEnd = new TextScope(rangeEnd / 2, rangeEnd - 1);

        [rangeFull, rangePartialStart, rangePartialEnd].forEach(
          async (range) => {
            const serial = memberfunction.serialize({
              mode: SerializableMode.source,
              indentStep,
              range,
            });
            assert.ok(serial.length);
          }
        );
      }
    );
  });
});
