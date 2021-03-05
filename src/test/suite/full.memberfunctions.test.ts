import * as assert from "assert";
import { Done, describe, it, test } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { callItAsync } from "./utils";

import { HeaderParser } from "../../io/HeaderParser";
import { ClassNameGenerator, MemberFunction } from "../../cpp";
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

suite("Full Member Function Tests", () => {
  describe("ParseAndSerializeSingle", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "int fncName(" + arg + ");"
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName (" + arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            arg +
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

        done();
      }
    );
  });

  describe("ParseAndSerializeSingleWithConstReturn", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "const int* fncName(" + arg + ");"
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "const int*");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "const int* fncName (" + arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "const int* TestClass::fncName (" +
            arg +
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

        done();
      }
    );
  });

  describe("ParseAndSerializeSingleWithWhitespaceInReturn", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "std::pair<int, void*> fncName(" + arg + ");"
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "std::pair<int, void*>");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "std::pair<int, void*> fncName (" + arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "std::pair<int, void*> TestClass::fncName (" +
            arg +
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

        done();
      }
    );
  });

  describe("ParseAndSerializeSingleConst", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "int fncName(" + arg + ") const;"
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName (" + arg + ") const;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            arg +
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

        done();
      }
    );
  });

  describe("ParseAndSerializeSingleVirtual", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "virtual int fncName(" + arg + ")  ;"
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName (" + arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            arg +
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
          "virtual int fncName (" + arg + ") =0;"
        );

        done();
      }
    );
  });

  describe("ParseAndSerializeSingleVirtualOverride", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "int fncName(" + arg + ")  override;"
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName (" + arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            arg +
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
          "virtual int fncName (" + arg + ") =0;"
        );

        done();
      }
    );
  });

  describe("ParseAndSerializeSingleVirtualConst", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "virtual int fncName(" + arg + ")   const;"
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName (" + arg + ") const override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            arg +
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
          "virtual int fncName (" + arg + ") const =0;"
        );
        done();
      }
    );
  });

  describe("ParseAndSerializeSinglePureVirtual", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "virtual int fncName(" + arg + ") =0;"
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "virtual int fncName (" + arg + ") =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          ""
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          "int fncName (" + arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          "int TestClass::fncName (" +
            arg +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );

        done();
      }
    );
  });

  describe("ParseAndSerializeSinglePureVirtualConst", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "virtual int fncName(" + arg + ")   const = 0;"
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "virtual int fncName (" + arg + ") const =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          ""
        );

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          "int fncName (" + arg + ") const override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          "int TestClass::fncName (" +
            arg +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );

        done();
      }
    );
  });

  describe("ParseAndSerializeSingleStatic", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "static int fncName(" + arg + "); "
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);

        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "static int fncName (" + arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int TestClass::fncName (" +
            arg +
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

        done();
      }
    );
  });

  describe("ParseMultipleMixedType", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(`
		virtual int fncName(${arg})   const = 0;
		virtual int fncName2(${arg}) =0;
		std::shared_ptr<Test> fncName3(${arg});
		void fncName4(${arg}) const;
		virtual int fncName5(${arg});
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, true);
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "virtual int fncName (" + arg + ") const =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          "int fncName (" + arg + ") const override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          "int TestClass::fncName (" +
            arg +
            ") const {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );

        memberFnct = parsedFunctions[1] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName2");
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "virtual int fncName2 (" + arg + ") =0;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          ""
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implHeader),
          "int fncName2 (" + arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.implSource),
          "int TestClass::fncName2 (" +
            arg +
            ") {\n" +
            "\tint returnValue;\n\treturn returnValue;\n}"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.interfaceHeader),
          ""
        );

        memberFnct = parsedFunctions[2] as MemberFunction;
        assert.strictEqual(memberFnct.name, "fncName3");
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "std::shared_ptr<Test>");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "std::shared_ptr<Test> fncName3 (" + arg + ");"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "std::shared_ptr<Test> ITestClass::fncName3 (" +
            arg +
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "void");
        assert.strictEqual(memberFnct.isConst, true);
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "void fncName4 (" + arg + ") const;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "void ITestClass::fncName4 (" + arg + ") const {\n}"
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
        assert.strictEqual(memberFnct.args, arg);
        assert.strictEqual(memberFnct.returnVal, "int");
        assert.strictEqual(memberFnct.isConst, false);
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.header),
          "int fncName5 (" + arg + ") override;"
        );
        assert.strictEqual(
          await memberFnct.serialize(SerializableMode.source),
          "int ITestClass::fncName5 (" +
            arg +
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
          "virtual int fncName5 (" + arg + ") =0;"
        );

        done();
      }
    );
  });

  test("ParseCommentedSingle", (done) => {
    const testContent = TextFragment.createFromString("//int fncName();");
    const testClassName = "TestClass";
    const classNameGen = new ClassNameGenerator(testClassName, false);

    HeaderParser.parseComments(testContent);
    let parsedFunctions = HeaderParser.parseClassMemberFunctions(
      testContent,
      classNameGen
    );
    assert.strictEqual(parsedFunctions.length, 0);

    done();
  });

  describe("ParseBlockCommented", function () {
    callItAsync(
      "With function arguments ${value}",
      argData,
      async function (done: Done, arg: string) {
        const testContent = TextFragment.createFromString(
          "/* int fncName(" + arg + "); */"
        );
        const testClassName = "TestClass";
        const classNameGen = new ClassNameGenerator(testClassName, false);

        HeaderParser.parseComments(testContent);
        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          classNameGen
        );
        assert.strictEqual(parsedFunctions.length, 0);

        done();
      }
    );
  });

  test("ParseCommentedAndNonCommented", (done) => {
    const testContent = TextFragment.createFromString(`
		int fncName(); 
		//void fncName2();
		int fncName3();`);
    const testClassName = "TestClass";
    const classNameGen = new ClassNameGenerator(testClassName, false);

    HeaderParser.parseComments(testContent);
    let parsedFunctions = HeaderParser.parseClassMemberFunctions(
      testContent,
      classNameGen
    );
    assert.strictEqual(parsedFunctions.length, 2);

    done();
  });
});
