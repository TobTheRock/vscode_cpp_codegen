import * as assert from "assert";
import { describe, test } from "mocha";
import { callItAsync } from "./utils";

import { HeaderParser } from "../../io/HeaderParser";
import { MemberFunction, FriendFunction } from "../../cpp";
import { TextFragment, SerializableMode, IClassNameProvider } from "../../io";

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
  describe("ParseAndSerializeSingle", function () {
    callItAsync(
      "With function arguments ${value}",
      testData,
      async function (data: TestData) {
        const testContent = TextFragment.createFromString(
          "int fncName(" + data.arg + ");"
        );

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

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "int fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "const int* fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "const int* TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tconst int* returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "std::pair<int, void*> fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "std::pair<int, void*> TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tstd::pair<int, void*> returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "int fncName (" + data.arg + ") const;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "int fncName (" + data.arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "int fncName (" + data.arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "int fncName (" + data.arg + ") const override;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "virtual int fncName (" + data.arg + ") =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          ""
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          "int fncName (" + data.arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "virtual int fncName (" + data.arg + ") const =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          ""
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          "int fncName (" + data.arg + ") const override;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "static int fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "virtual int fncName (" + data.arg + ") const =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          "int fncName (" + data.arg + ") const override;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          "int TestClass::fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
          ""
        );

        memberFnct = parsedFunctions[1] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName2");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "virtual int fncName2 (" + data.arg + ") =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          "int fncName2 (" + data.arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          "int TestClass::fncName2 (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
          ""
        );

        memberFnct = parsedFunctions[2] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName3");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "std::shared_ptr<Test>");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "std::shared_ptr<Test> fncName3 (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "std::shared_ptr<Test> ITestClass::fncName3 (" +
            data.argWoInit +
            ") {\n" +
            "\tstd::shared_ptr<Test> returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
          ""
        );

        memberFnct = parsedFunctions[3] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName4");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "void");
        assert.strictEqual(memberFnct.isConst, true);
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "void fncName4 (" + data.arg + ") const;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "void ITestClass::fncName4 (" + data.argWoInit + ") const {\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
          ""
        );

        memberFnct = parsedFunctions[4] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName5");
        assert.strictEqual(memberFnct.args, data.arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "int fncName5 (" + data.arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "int ITestClass::fncName5 (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "friend int fncName (" + data.arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "int fncName (" +
            data.argWoInit +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
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
          await memberFnct.serialize({
            mode: SerializableMode.header,
          }),
          "friend int fncName (" + data.arg + ") const;"
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.source,
          }),
          "int fncName (" +
            data.argWoInit +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );

        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implHeader,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.implSource,
          }),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize({
            mode: SerializableMode.interfaceHeader,
          }),
          ""
        );
      }
    );
  });
});
