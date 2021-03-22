import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { Done, describe } from "mocha";
// import * as myExtension from '../../extension';
import { HeaderParser } from "../../io/HeaderParser";
import { IClass, ClassInterface, ClassImpl, IClassScope } from "../../cpp";
import { callItAsync } from "./utils";

import {
  TextFragment,
  TextScope,
  compareSignaturables,
  SerializableMode,
} from "../../io";

const argData = [
  "",
  "int test",
  "int test1, const Class* test2, void* test3",
  "int \ttest1,\t\n const\n Class* test2",
];
class TestData {
  constructor(public content: string, public nDates: number) {}

  public toString() {
    return this.content;
  }
}

const functionData: TestData[] = (function () {
  let funcTemp: TestData[] = [];
  for (const arg of argData) {
    funcTemp.push(new TestData(`void fncName (${arg});`, 1));
    funcTemp.push(
      new TestData(
        `int fncName(${arg});
		const    int fncName2(${arg});
		const int fncName3(${arg}) const;
		virtual void fncName(${arg});
		virtual void fncName2(${arg}) = 0;`,
        5
      )
    );
  }

  return funcTemp;
})();

const ctorData: TestData[] = (function () {
  let ctorTmp: TestData[] = [];
  for (const arg of argData) {
    ctorTmp.push(new TestData(`MyClass ( ${arg} );`, 1));
    arg;
  }

  return ctorTmp;
})();

const inheritData = [
  new TestData(":public IInterface", 1),
  new TestData(" :\tpublic IInterface, private IInterface2", 2),
  new TestData(
    ": public IInterface,\n\t\t private IInterface2 \n, protected IInterface3 \n\n",
    3
  ),
];

function assertClassScopeEmpty(classScope: IClassScope) {
  assert.strictEqual(classScope.memberFunctions.length, 0);
  assert.strictEqual(classScope.constructors.length, 0);
  assert.strictEqual(classScope.nestedClasses.length, 0);
}

suite("Parser GeneralClasses Tests", () => {
  test("ParseClassWithoutMemberFunctions", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass {       // The class
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)
		  };
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    assert.strictEqual(classes[0].name, "MyClass");
    assertClassScopeEmpty(classes[0].publicScope);
    assertClassScopeEmpty(classes[0].privateScope);
    assertClassScopeEmpty(classes[0].protectedScope);
    assert.strictEqual(classes[0].destructor, undefined);
    assert.strictEqual(classes[0].inheritance.length, 0);
    assert.ok(classes[0] instanceof ClassImpl);
  });

  test("ParseInterface", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass {       // The class
			virtual const int* pureFnct() = 0  ;
		  };
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    assert.strictEqual(classes[0].name, "MyClass");
    assertClassScopeEmpty(classes[0].publicScope);
    assertClassScopeEmpty(classes[0].protectedScope);

    assert.strictEqual(classes[0].privateScope.memberFunctions.length, 1);
    assert.strictEqual(classes[0].privateScope.constructors.length, 0);
    assert.strictEqual(classes[0].privateScope.nestedClasses.length, 0);
    assert.strictEqual(classes[0].destructor, undefined);
    assert.strictEqual(classes[0].inheritance.length, 0);
    assert.ok(classes[0] instanceof ClassInterface);
  });

  test("ParseMultipleClassesWithoutMemberFunctions", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass1 {       // The class
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)
		  };
		class MyClass2 {       // The 2nd class
			int myNum;        // Attribute 2 (int variable)
			string myString;  // Attribute 2(string variable)
		  };
		class MyClass3 {       // The 2nd class
			int myNum;        // Attribute 2 (int variable)
			string myString;  // Attribute 2(string variable)
		};
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 3);
    for (let index = 1; index < 4; index++) {
      assert.strictEqual(classes[index - 1].name, "MyClass" + index);
      assertClassScopeEmpty(classes[index - 1].publicScope);
      assertClassScopeEmpty(classes[index - 1].privateScope);
      assertClassScopeEmpty(classes[index - 1].protectedScope);
      assert.strictEqual(classes[index - 1].destructor, undefined);
      assert.strictEqual(classes[index - 1].inheritance.length, 0);
    }
  });

  test("ParseImplicitPrivateNestedClassesWithoutMemberFunctions", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass { 	
			class NestedClass { 
		  	};
		  };
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    assert.strictEqual(classes[0].name, "MyClass");
    assert.strictEqual(classes[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].inheritance.length, 0);

    let nestedClass: IClass = classes[0].privateScope.nestedClasses[0];
    assert.strictEqual(classes[0].privateScope.nestedClasses.length, 1);

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test("ParseExplicitPrivateNestedClassesWithoutMemberFunctions", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass { 
      private:
			class NestedClass { 
		  	};
		  };
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    assert.strictEqual(classes[0].name, "MyClass");
    assert.strictEqual(classes[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].inheritance.length, 0);

    let nestedClass: IClass = classes[0].privateScope.nestedClasses[0];
    assert.strictEqual(classes[0].privateScope.nestedClasses.length, 1);

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test("ParsePublicNestedClassesWithoutMemberFunctions", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass { 
      public:
			class NestedClass { 
		  	};
		  };
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    assert.strictEqual(classes[0].name, "MyClass");
    assert.strictEqual(classes[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].inheritance.length, 0);

    let nestedClass: IClass = classes[0].publicScope.nestedClasses[0];
    assert.strictEqual(classes[0].publicScope.nestedClasses.length, 1);

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test("ParseProtectedNestedClassesWithoutMemberFunctions", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass { 
      protected:
			class NestedClass { 
		  	};
		  };
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    assert.strictEqual(classes[0].name, "MyClass");
    assert.strictEqual(classes[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].inheritance.length, 0);

    let nestedClass: IClass = classes[0].protectedScope.nestedClasses[0];
    assert.strictEqual(classes[0].protectedScope.nestedClasses.length, 1);

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test("ParseNestedAndMultipleClassesWithoutMemberFunctions", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass {		
			class NestedClass { 
		  	};
		  };		
		  
		  class MyClass2 { 
		  };
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 2);
    assert.strictEqual(classes[0].name, "MyClass");
    assert.strictEqual(classes[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(classes[0].inheritance.length, 0);
    assert.strictEqual(classes[0].privateScope.nestedClasses.length, 1);

    let nestedClass: IClass = classes[0].privateScope.nestedClasses[0];
    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);

    assert.strictEqual(classes[1].name, "MyClass2");
    assertClassScopeEmpty(classes[1].publicScope);
    assertClassScopeEmpty(classes[1].privateScope);
    assertClassScopeEmpty(classes[1].protectedScope);
    assert.strictEqual(classes[1].destructor, undefined);
    assert.strictEqual(classes[1].inheritance.length, 0);
  });

  describe("ParseClassWithImplicitPrivateMemberFunctions", function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `class MyClass {
				${functionTestData.content}
			};
			`
        );
        let classes: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classes.length, 1);
        assert.strictEqual(classes[0].name, "MyClass");
        assertClassScopeEmpty(classes[0].publicScope);
        assertClassScopeEmpty(classes[0].protectedScope);
        assert.strictEqual(
          classes[0].privateScope.memberFunctions.length,
          functionTestData.nDates
        );
        assert.strictEqual(classes[0].inheritance.length, 0);
      }
    );
  });

  describe("ParseClassWithExplicitPrivateMemberFunctions", function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `class MyClass {
			private:
				${functionTestData.content}
			};
			`
        );
        let classes: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classes.length, 1);
        assert.strictEqual(classes[0].name, "MyClass");
        assertClassScopeEmpty(classes[0].publicScope);
        assertClassScopeEmpty(classes[0].protectedScope);
        assert.strictEqual(
          classes[0].privateScope.memberFunctions.length,
          functionTestData.nDates
        );
        assert.strictEqual(classes[0].inheritance.length, 0);
      }
    );
  });

  describe("ParseClassWithPublicMemberFunctions", function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `class MyClass {
			public:
				${functionTestData.content}
			};
			`
        );
        let classes: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classes.length, 1);
        assert.strictEqual(classes[0].name, "MyClass");
        assert.strictEqual(
          classes[0].publicScope.memberFunctions.length,
          functionTestData.nDates
        );
        assertClassScopeEmpty(classes[0].protectedScope);
        assertClassScopeEmpty(classes[0].privateScope);
        assert.strictEqual(classes[0].inheritance.length, 0);
      }
    );
  });

  describe("ParseClassWithProtectedMemberFunctions", function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `class MyClass {
			protected:
				${functionTestData.content}
			};
			`
        );
        let classes: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classes.length, 1);
        assert.strictEqual(classes[0].name, "MyClass");
        assertClassScopeEmpty(classes[0].publicScope);
        assertClassScopeEmpty(classes[0].privateScope);
        assert.strictEqual(
          classes[0].protectedScope.memberFunctions.length,
          functionTestData.nDates
        );
        assert.strictEqual(classes[0].inheritance.length, 0);
      }
    );
  });

  describe("ParseClassWithVariousMemberFunctions", function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `class MyClass {
			private:
				${functionTestData.content}
			public:
				${functionTestData.content}
			protected:
				${functionTestData.content}
			private:
				${functionTestData.content}
			public:
				${functionTestData.content}
			protected:
				${functionTestData.content}
			};
			`
        );
        let classes: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classes.length, 1);
        assert.strictEqual(classes[0].name, "MyClass");
        assert.strictEqual(
          classes[0].publicScope.memberFunctions.length,
          2 * functionTestData.nDates
        );
        assert.strictEqual(
          classes[0].privateScope.memberFunctions.length,
          2 * functionTestData.nDates
        );
        assert.strictEqual(
          classes[0].protectedScope.memberFunctions.length,
          2 * functionTestData.nDates
        );
        assert.strictEqual(classes[0].inheritance.length, 0);
      }
    );
  });

  describe("ParseClassWithConstructors", function () {
    callItAsync(
      "With constructors ${value}",
      ctorData,
      function (ctorTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `class MyClass {
			//implicit private
				${ctorTestData.content}
			public:
				${ctorTestData.content}
			protected:
				${ctorTestData.content}
			private:
				${ctorTestData.content}
			};
			`
        );
        let classes: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classes.length, 1);
        assert.strictEqual(classes[0].name, "MyClass");
        assert.strictEqual(classes[0].privateScope.constructors.length, 2);
        assert.strictEqual(classes[0].publicScope.constructors.length, 1);
        assert.strictEqual(classes[0].protectedScope.constructors.length, 1);
        assert.strictEqual(classes[0].inheritance.length, 0);
      }
    );
  });

  test("ParseClassWithDestructor", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass {
			public:
				~MyClass ();		
		};
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    assert.strictEqual(classes[0].name, "MyClass");
    assertClassScopeEmpty(classes[0].publicScope);
    assertClassScopeEmpty(classes[0].privateScope);
    assertClassScopeEmpty(classes[0].protectedScope);
    assert.strictEqual(classes[0].inheritance.length, 0);
    assert.notStrictEqual(classes[0].destructor, undefined);
    assert.strictEqual(classes[0].destructor?.virtual, false);
  });

  test("ParseClassWithVirtualDestructor", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass {
		//implicit private
			virtual ~MyClass ();
		};
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    assert.strictEqual(classes[0].name, "MyClass");
    assertClassScopeEmpty(classes[0].publicScope);
    assertClassScopeEmpty(classes[0].privateScope);
    assertClassScopeEmpty(classes[0].protectedScope);
    assert.strictEqual(classes[0].inheritance.length, 0);
    assert.notStrictEqual(classes[0].destructor, undefined);
    assert.strictEqual(classes[0].destructor?.virtual, true);
  });

  test("ParseClassWithOverrideDestructor", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass {
		//implicit private
			~MyClass () override;
		};
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    assert.strictEqual(classes[0].name, "MyClass");
    assertClassScopeEmpty(classes[0].publicScope);
    assertClassScopeEmpty(classes[0].privateScope);
    assertClassScopeEmpty(classes[0].protectedScope);
    assert.strictEqual(classes[0].inheritance.length, 0);
    assert.notStrictEqual(classes[0].destructor, undefined);
    assert.strictEqual(classes[0].destructor?.virtual, true);
  });

  test("ParseClassWithVirtualDefaultDestructorAndMemberFunction", () => {
    const testContent = TextFragment.createFromString(
      `class MyClass {
			virtual ~MyClass () = default;
			void function();
		};
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    assert.strictEqual(classes[0].name, "MyClass");
    assertClassScopeEmpty(classes[0].publicScope);
    assert.strictEqual(classes[0].privateScope.memberFunctions.length, 1);
    assertClassScopeEmpty(classes[0].protectedScope);
    assert.strictEqual(classes[0].inheritance.length, 0);
    assert.strictEqual(classes[0].destructor, undefined);
  });

  describe("ParseInheritance", function () {
    callItAsync(
      "With inheritance ${value}",
      inheritData,
      function (inheritData: TestData) {
        const testContent = TextFragment.createFromString(
          `class MyClass ${inheritData.content}  {  // The class
		  };
		`
        );
        let classes: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classes.length, 1);
        assert.strictEqual(classes[0].name, "MyClass");
        assertClassScopeEmpty(classes[0].publicScope);
        assertClassScopeEmpty(classes[0].privateScope);
        assertClassScopeEmpty(classes[0].protectedScope);
        assert.strictEqual(classes[0].destructor, undefined);
        assert.strictEqual(classes[0].inheritance.length, inheritData.nDates);
      }
    );
  });

  describe("ParseInheritanceWithMemberFunctionWithInitializerList", function () {
    callItAsync(
      "With inheritance ${value}",
      inheritData,
      function (inheritData: TestData) {
        const testContent = TextFragment.createFromString(
          `class MyClass ${inheritData.content}  {  // The class
			void function(int x = {});
		  };
		`
        );

        let classes: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classes.length, 1);
        assert.strictEqual(classes[0].name, "MyClass");
        assertClassScopeEmpty(classes[0].publicScope);
        assert.strictEqual(classes[0].privateScope.memberFunctions.length, 1);
        assertClassScopeEmpty(classes[0].protectedScope);
        assert.strictEqual(classes[0].destructor, undefined);
        assert.strictEqual(classes[0].inheritance.length, inheritData.nDates);
      }
    );
  });

  test("DeserializeNestedClassAsSourceWithCorrectScope", async () => {
    const testContent = TextFragment.createFromString(
      `class MyClass { 	
			class NestedClass {
          void fncName();
		  	};
		  };
		`
    );
    let classes: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classes.length, 1);
    let nestedClass: IClass = classes[0].privateScope.nestedClasses[0];
    assert.strictEqual(classes[0].privateScope.nestedClasses.length, 1);
    const serialized = await classes[0].serialize({
      mode: SerializableMode.source,
    });
    assert.ok(serialized.includes("MyClass::Nested"));
  });
});
