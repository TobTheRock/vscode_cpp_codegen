import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { Done, describe } from "mocha";
// import * as myExtension from '../../extension';
import { HeaderParser } from "../../io/HeaderParser";
import {
  IClass,
  ClassInterface,
  ClassImplementation,
  IClassScope,
} from "../../cpp";
import { callItAsync } from "./utils";

import { TextFragment, SerializableMode } from "../../io";

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
    ctorTmp.push(new TestData(`MyStruct ( ${arg} );`, 1));
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

//TODO extract common tests with structs
suite("Parser: Structs tests", () => {
  test("Parse struct without member functions", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct {       // The struct
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)
		  };
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    assert.strictEqual(structs[0].name, "MyStruct");
    assertClassScopeEmpty(structs[0].publicScope);
    assertClassScopeEmpty(structs[0].privateScope);
    assertClassScopeEmpty(structs[0].protectedScope);
    assert.strictEqual(structs[0].destructor, undefined);
    assert.strictEqual(structs[0].inheritance.length, 0);
    assert.ok(structs[0] instanceof ClassImplementation);
  });

  test("Parse interface", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct {       // The struct
			virtual const int* pureFnct() = 0  ;
		  };
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    assert.strictEqual(structs[0].name, "MyStruct");
    assertClassScopeEmpty(structs[0].privateScope);
    assertClassScopeEmpty(structs[0].protectedScope);

    assert.strictEqual(structs[0].publicScope.memberFunctions.length, 1);
    assert.strictEqual(structs[0].publicScope.constructors.length, 0);
    assert.strictEqual(structs[0].publicScope.nestedClasses.length, 0);
    assert.strictEqual(structs[0].destructor, undefined);
    assert.strictEqual(structs[0].inheritance.length, 0);
    assert.ok(structs[0] instanceof ClassInterface);
  });

  test("Parse multiple structs without member functions", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct1 {       // The struct
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)
		  };
		struct MyStruct2 {       // The 2nd struct
			int myNum;        // Attribute 2 (int variable)
			string myString;  // Attribute 2(string variable)
		  };
		struct MyStruct3 {       // The 2nd struct
			int myNum;        // Attribute 2 (int variable)
			string myString;  // Attribute 2(string variable)
		};
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 3);
    for (let index = 1; index < 4; index++) {
      assert.strictEqual(structs[index - 1].name, "MyStruct" + index);
      assertClassScopeEmpty(structs[index - 1].publicScope);
      assertClassScopeEmpty(structs[index - 1].privateScope);
      assertClassScopeEmpty(structs[index - 1].protectedScope);
      assert.strictEqual(structs[index - 1].destructor, undefined);
      assert.strictEqual(structs[index - 1].inheritance.length, 0);
    }
  });

  test("Parse implicit public nested structs without member functions", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct { 	
			struct NestedStruct { 
		  	};
		  };
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    assert.strictEqual(structs[0].name, "MyStruct");
    assert.strictEqual(structs[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].inheritance.length, 0);

    assert.strictEqual(structs[0].publicScope.nestedClasses.length, 1);
    let nestedClass: IClass = structs[0].publicScope.nestedClasses[0];

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test("Parse explicit private nested structs without member functions", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct { 
      private:
			struct NestedStruct { 
		  	};
		  };
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    assert.strictEqual(structs[0].name, "MyStruct");
    assert.strictEqual(structs[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].inheritance.length, 0);

    let nestedClass: IClass = structs[0].privateScope.nestedClasses[0];
    assert.strictEqual(structs[0].privateScope.nestedClasses.length, 1);

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test("Parse public nested structs without member functions", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct { 
      public:
			struct NestedStruct { 
		  	};
		  };
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    assert.strictEqual(structs[0].name, "MyStruct");
    assert.strictEqual(structs[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].inheritance.length, 0);

    let nestedClass: IClass = structs[0].publicScope.nestedClasses[0];
    assert.strictEqual(structs[0].publicScope.nestedClasses.length, 1);

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test("Parse protected nested structs without member functions", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct { 
      protected:
			struct NestedStruct { 
		  	};
		  };
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    assert.strictEqual(structs[0].name, "MyStruct");
    assert.strictEqual(structs[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].inheritance.length, 0);

    let nestedClass: IClass = structs[0].protectedScope.nestedClasses[0];
    assert.strictEqual(structs[0].protectedScope.nestedClasses.length, 1);

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test("Parse nested and multiple structs without member functions", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct {		
			struct NestedStruct { 
		  	};
		  };		
		  
		  struct MyStruct2 { 
		  };
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 2);
    assert.strictEqual(structs[0].name, "MyStruct");
    assert.strictEqual(structs[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(structs[0].inheritance.length, 0);
    assert.strictEqual(structs[0].publicScope.nestedClasses.length, 1);

    let nestedClass: IClass = structs[0].publicScope.nestedClasses[0];
    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);

    assert.strictEqual(structs[1].name, "MyStruct2");
    assertClassScopeEmpty(structs[1].publicScope);
    assertClassScopeEmpty(structs[1].privateScope);
    assertClassScopeEmpty(structs[1].protectedScope);
    assert.strictEqual(structs[1].destructor, undefined);
    assert.strictEqual(structs[1].inheritance.length, 0);
  });

  describe("Parse struct with private member functions", function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `struct MyStruct {
			private:
				${functionTestData.content}
			};
			`
        );
        let structs: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(structs.length, 1);
        assert.strictEqual(structs[0].name, "MyStruct");
        assertClassScopeEmpty(structs[0].publicScope);
        assertClassScopeEmpty(structs[0].protectedScope);
        assert.strictEqual(
          structs[0].privateScope.memberFunctions.length,
          functionTestData.nDates
        );
        assert.strictEqual(structs[0].inheritance.length, 0);
      }
    );
  });

  describe("Parse struct with implicit public member functions", function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `struct MyStruct {
				${functionTestData.content}
			};
			`
        );
        let structs: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(structs.length, 1);
        assert.strictEqual(structs[0].name, "MyStruct");
        assert.strictEqual(
          structs[0].publicScope.memberFunctions.length,
          functionTestData.nDates
        );
        assertClassScopeEmpty(structs[0].protectedScope);
        assertClassScopeEmpty(structs[0].privateScope);
        assert.strictEqual(structs[0].inheritance.length, 0);
      }
    );
  });

  describe("Parse struct with explicit public member functions", function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `struct MyStruct {
			public:
				${functionTestData.content}
			};
			`
        );
        let structs: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(structs.length, 1);
        assert.strictEqual(structs[0].name, "MyStruct");
        assert.strictEqual(
          structs[0].publicScope.memberFunctions.length,
          functionTestData.nDates
        );
        assertClassScopeEmpty(structs[0].protectedScope);
        assertClassScopeEmpty(structs[0].privateScope);
        assert.strictEqual(structs[0].inheritance.length, 0);
      }
    );
  });

  describe("Parse struct with protected member functions", function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `struct MyStruct {
			protected:
				${functionTestData.content}
			};
			`
        );
        let structs: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(structs.length, 1);
        assert.strictEqual(structs[0].name, "MyStruct");
        assertClassScopeEmpty(structs[0].publicScope);
        assertClassScopeEmpty(structs[0].privateScope);
        assert.strictEqual(
          structs[0].protectedScope.memberFunctions.length,
          functionTestData.nDates
        );
        assert.strictEqual(structs[0].inheritance.length, 0);
      }
    );
  });

  describe("Parse struct with various member functions", function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `struct MyStruct {
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
        let structs: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(structs.length, 1);
        assert.strictEqual(structs[0].name, "MyStruct");
        assert.strictEqual(
          structs[0].publicScope.memberFunctions.length,
          2 * functionTestData.nDates
        );
        assert.strictEqual(
          structs[0].privateScope.memberFunctions.length,
          2 * functionTestData.nDates
        );
        assert.strictEqual(
          structs[0].protectedScope.memberFunctions.length,
          2 * functionTestData.nDates
        );
        assert.strictEqual(structs[0].inheritance.length, 0);
      }
    );
  });

  describe("Parse struct with constructors", function () {
    callItAsync(
      "With constructors ${value}",
      ctorData,
      function (ctorTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `struct MyStruct {
			//implicit public
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
        let structs: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(structs.length, 1);
        assert.strictEqual(structs[0].name, "MyStruct");
        assert.strictEqual(structs[0].privateScope.constructors.length, 1);
        assert.strictEqual(structs[0].publicScope.constructors.length, 2);
        assert.strictEqual(structs[0].protectedScope.constructors.length, 1);
        assert.strictEqual(structs[0].inheritance.length, 0);
      }
    );
  });

  test("Parse struct with destructor", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct {
			public:
				~MyStruct ();		
		};
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    assert.strictEqual(structs[0].name, "MyStruct");
    assertClassScopeEmpty(structs[0].publicScope);
    assertClassScopeEmpty(structs[0].privateScope);
    assertClassScopeEmpty(structs[0].protectedScope);
    assert.strictEqual(structs[0].inheritance.length, 0);
    assert.notStrictEqual(structs[0].destructor, undefined);
    assert.strictEqual(structs[0].destructor?.virtual, false);
  });

  test("Parse struct with virtual destructor", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct {
		//implicit private
			virtual ~MyStruct ();
		};
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    assert.strictEqual(structs[0].name, "MyStruct");
    assertClassScopeEmpty(structs[0].publicScope);
    assertClassScopeEmpty(structs[0].privateScope);
    assertClassScopeEmpty(structs[0].protectedScope);
    assert.strictEqual(structs[0].inheritance.length, 0);
    assert.notStrictEqual(structs[0].destructor, undefined);
    assert.strictEqual(structs[0].destructor?.virtual, true);
  });

  test("Parse struct with override destructor", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct {
		//implicit private
			~MyStruct () override;
		};
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    assert.strictEqual(structs[0].name, "MyStruct");
    assertClassScopeEmpty(structs[0].publicScope);
    assertClassScopeEmpty(structs[0].privateScope);
    assertClassScopeEmpty(structs[0].protectedScope);
    assert.strictEqual(structs[0].inheritance.length, 0);
    assert.notStrictEqual(structs[0].destructor, undefined);
    assert.strictEqual(structs[0].destructor?.virtual, true);
  });

  test("Parse struct with virtual default destructor and member function", () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct {
			virtual ~MyStruct () = default;
			void function();
		};
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    assert.strictEqual(structs[0].name, "MyStruct");
    assertClassScopeEmpty(structs[0].privateScope);
    assert.strictEqual(structs[0].publicScope.memberFunctions.length, 1);
    assertClassScopeEmpty(structs[0].protectedScope);
    assert.strictEqual(structs[0].inheritance.length, 0);
    assert.strictEqual(structs[0].destructor, undefined);
  });

  describe("Parse inheritance", function () {
    callItAsync(
      "With inheritance ${value}",
      inheritData,
      function (inheritData: TestData) {
        const testContent = TextFragment.createFromString(
          `struct MyStruct ${inheritData.content}  {  // The struct
		  };
		`
        );
        let structs: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(structs.length, 1);
        assert.strictEqual(structs[0].name, "MyStruct");
        assertClassScopeEmpty(structs[0].publicScope);
        assertClassScopeEmpty(structs[0].privateScope);
        assertClassScopeEmpty(structs[0].protectedScope);
        assert.strictEqual(structs[0].destructor, undefined);
        assert.strictEqual(structs[0].inheritance.length, inheritData.nDates);
      }
    );
  });

  describe("Parse inheritance with member function with initializer list", function () {
    callItAsync(
      "With inheritance ${value}",
      inheritData,
      function (inheritData: TestData) {
        const testContent = TextFragment.createFromString(
          `struct MyStruct ${inheritData.content}  {  // The struct
			void function(int x = {});
		  };
		`
        );

        let structs: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(structs.length, 1);
        assert.strictEqual(structs[0].name, "MyStruct");
        assertClassScopeEmpty(structs[0].privateScope);
        assert.strictEqual(structs[0].publicScope.memberFunctions.length, 1);
        assertClassScopeEmpty(structs[0].protectedScope);
        assert.strictEqual(structs[0].destructor, undefined);
        assert.strictEqual(structs[0].inheritance.length, inheritData.nDates);
      }
    );
  });

  test("Deserialize nested struct as source with correct scope", async () => {
    const testContent = TextFragment.createFromString(
      `struct MyStruct { 	
			struct NestedStruct {
          void fncName();
		  	};
		  };
		`
    );
    let structs: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(structs.length, 1);
    let nestedClass: IClass = structs[0].publicScope.nestedClasses[0];
    assert.strictEqual(structs[0].publicScope.nestedClasses.length, 1);
    const serialized = await structs[0].serialize({
      mode: SerializableMode.source,
    });
    assert.ok(serialized.includes("MyStruct::NestedStruct"));
  });
});
