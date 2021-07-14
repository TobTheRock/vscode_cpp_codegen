import { HeaderParser } from "../../io/HeaderParser";
import {
  IClass,
  ClassInterface,
  ClassImplementation,
  IClassScope,
} from "../../cpp";
import { callItAsync } from "./utils";
import { TextFragment, SerializableMode } from "../../io";
import * as assert from "assert";
import { describe } from "mocha";

const argData = [
  "",
  "int test",
  "int test1, const Class* test2, void* test3",
  "int \ttest1,\t\n const\n Class* test2",
];
export class TestData {
  constructor(public content: string, public nDates: number) {}

  public toString() {
    return this.content;
  }
}

export const functionData: TestData[] = (function () {
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
    ctorTmp.push(new TestData(`TestClass ( ${arg} );`, 1));
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

export function assertClassScopeEmpty(classScope: IClassScope) {
  assert.strictEqual(classScope.memberFunctions.length, 0);
  assert.strictEqual(classScope.constructors.length, 0);
  assert.strictEqual(classScope.nestedClasses.length, 0);
}

export function structAndClassTests(specifier: string) {
  test(`Parse ${specifier} without member functions`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass {       // The ${specifier}
                int myNum;        // Attribute (int variable)
                string myString;  // Attribute (string variable)
              };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 1);
    assert.strictEqual(classLike[0].name, "TestClass");
    assertClassScopeEmpty(classLike[0].publicScope);
    assertClassScopeEmpty(classLike[0].privateScope);
    assertClassScopeEmpty(classLike[0].protectedScope);
    assert.strictEqual(classLike[0].destructor, undefined);
    assert.strictEqual(classLike[0].inheritance.length, 0);
    assert.ok(classLike[0] instanceof ClassImplementation);
  });

  test(`Parse interface`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass {
          public:
          virtual const int* pureFnct() = 0  ;
        };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 1);
    assert.strictEqual(classLike[0].name, "TestClass");
    assertClassScopeEmpty(classLike[0].privateScope);
    assertClassScopeEmpty(classLike[0].protectedScope);

    assert.strictEqual(classLike[0].publicScope.memberFunctions.length, 1);
    assert.strictEqual(classLike[0].publicScope.constructors.length, 0);
    assert.strictEqual(classLike[0].publicScope.nestedClasses.length, 0);
    assert.strictEqual(classLike[0].destructor, undefined);
    assert.strictEqual(classLike[0].inheritance.length, 0);
    assert.ok(classLike[0] instanceof ClassInterface);
  });

  test(`Parse multiple ${specifier} without member functions`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass1 { 
                int myNum;        // Attribute (int variable)
                string myString;  // Attribute (string variable)
      };

      ${specifier} TestClass2 { 
          int myNum;        // Attribute 2 (int variable)
          string myString;  // Attribute 2(string variable)
      };

      ${specifier} TestClass3 {
          int myNum;        // Attribute 2 (int variable)
          string myString;  // Attribute 2(string variable)
      };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 3);
    for (let index = 1; index < 4; index++) {
      assert.strictEqual(classLike[index - 1].name, "TestClass" + index);
      assertClassScopeEmpty(classLike[index - 1].publicScope);
      assertClassScopeEmpty(classLike[index - 1].privateScope);
      assertClassScopeEmpty(classLike[index - 1].protectedScope);
      assert.strictEqual(classLike[index - 1].destructor, undefined);
      assert.strictEqual(classLike[index - 1].inheritance.length, 0);
    }
  });

  test(`Parse private nested ${specifier} without member functions`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass { 
          private:
                ${specifier} NestedStruct { 
                  };
              };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 1);
    assert.strictEqual(classLike[0].name, "TestClass");
    assert.strictEqual(classLike[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(classLike[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(classLike[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(classLike[0].inheritance.length, 0);

    let nestedClass: IClass = classLike[0].privateScope.nestedClasses[0];
    assert.strictEqual(classLike[0].privateScope.nestedClasses.length, 1);

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test(`Parse public nested ${specifier} without member functions`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass { 
          public:
                ${specifier} NestedStruct { 
                  };
              };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 1);
    assert.strictEqual(classLike[0].name, "TestClass");
    assert.strictEqual(classLike[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(classLike[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(classLike[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(classLike[0].inheritance.length, 0);

    let nestedClass: IClass = classLike[0].publicScope.nestedClasses[0];
    assert.strictEqual(classLike[0].publicScope.nestedClasses.length, 1);

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test(`Parse protected nested ${specifier} without member functions`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass { 
          protected:
                ${specifier} NestedStruct { 
                  };
              };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 1);
    assert.strictEqual(classLike[0].name, "TestClass");
    assert.strictEqual(classLike[0].publicScope.memberFunctions.length, 0);
    assert.strictEqual(classLike[0].privateScope.memberFunctions.length, 0);
    assert.strictEqual(classLike[0].protectedScope.memberFunctions.length, 0);
    assert.strictEqual(classLike[0].inheritance.length, 0);

    let nestedClass: IClass = classLike[0].protectedScope.nestedClasses[0];
    assert.strictEqual(classLike[0].protectedScope.nestedClasses.length, 1);

    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);
  });

  test(`Parse nested and multiple ${specifier} without member functions`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass {
          private:
          ${specifier} NestedClass { 
            };
        };		
              
        ${specifier} TestClass2 { 
        };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 2);
    assert.strictEqual(classLike[0].name, "TestClass");
    assertClassScopeEmpty(classLike[0].publicScope);
    assertClassScopeEmpty(classLike[0].protectedScope);
    assert.strictEqual(classLike[0].inheritance.length, 0);
    assert.strictEqual(classLike[0].privateScope.nestedClasses.length, 1);

    let nestedClass: IClass = classLike[0].privateScope.nestedClasses[0];
    assert.strictEqual(nestedClass.name, "NestedClass");
    assertClassScopeEmpty(nestedClass.publicScope);
    assertClassScopeEmpty(nestedClass.privateScope);
    assertClassScopeEmpty(nestedClass.protectedScope);
    assert.strictEqual(nestedClass.destructor, undefined);
    assert.strictEqual(nestedClass.inheritance.length, 0);

    assert.strictEqual(classLike[1].name, "TestClass2");
    assertClassScopeEmpty(classLike[1].publicScope);
    assertClassScopeEmpty(classLike[1].privateScope);
    assertClassScopeEmpty(classLike[1].protectedScope);
    assert.strictEqual(classLike[1].destructor, undefined);
    assert.strictEqual(classLike[1].inheritance.length, 0);
  });

  describe(`Parse ${specifier} with private member functions`, function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `${specifier} TestClass {
                private:
                    ${functionTestData.content}
                };
                `
        );
        let classLike: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classLike.length, 1);
        assert.strictEqual(classLike[0].name, "TestClass");
        assertClassScopeEmpty(classLike[0].publicScope);
        assertClassScopeEmpty(classLike[0].protectedScope);
        assert.strictEqual(
          classLike[0].privateScope.memberFunctions.length,
          functionTestData.nDates
        );
        assert.strictEqual(classLike[0].inheritance.length, 0);
      }
    );
  });

  describe(`Parse ${specifier} with public member functions`, function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `${specifier} TestClass {
                public:
                    ${functionTestData.content}
                };
                `
        );
        let classLike: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classLike.length, 1);
        assert.strictEqual(classLike[0].name, "TestClass");
        assert.strictEqual(
          classLike[0].publicScope.memberFunctions.length,
          functionTestData.nDates
        );
        assertClassScopeEmpty(classLike[0].protectedScope);
        assertClassScopeEmpty(classLike[0].privateScope);
        assert.strictEqual(classLike[0].inheritance.length, 0);
      }
    );
  });

  describe(`Parse ${specifier} with protected member functions`, function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `${specifier} TestClass {
                protected:
                    ${functionTestData.content}
                };
                `
        );
        let classLike: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classLike.length, 1);
        assert.strictEqual(classLike[0].name, "TestClass");
        assertClassScopeEmpty(classLike[0].publicScope);
        assertClassScopeEmpty(classLike[0].privateScope);
        assert.strictEqual(
          classLike[0].protectedScope.memberFunctions.length,
          functionTestData.nDates
        );
        assert.strictEqual(classLike[0].inheritance.length, 0);
      }
    );
  });

  describe(`Parse ${specifier} with various member functions`, function () {
    callItAsync(
      "With functions ${value}",
      functionData,
      function (functionTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `${specifier} TestClass {
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
        let classLike: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classLike.length, 1);
        assert.strictEqual(classLike[0].name, "TestClass");
        assert.strictEqual(
          classLike[0].publicScope.memberFunctions.length,
          2 * functionTestData.nDates
        );
        assert.strictEqual(
          classLike[0].privateScope.memberFunctions.length,
          2 * functionTestData.nDates
        );
        assert.strictEqual(
          classLike[0].protectedScope.memberFunctions.length,
          2 * functionTestData.nDates
        );
        assert.strictEqual(classLike[0].inheritance.length, 0);
      }
    );
  });

  describe(`Parse ${specifier} with constructors`, function () {
    callItAsync(
      "With constructors ${value}",
      ctorData,
      function (ctorTestData: TestData) {
        const testContent = TextFragment.createFromString(
          `${specifier} TestClass {
                public:
                    ${ctorTestData.content}
                protected:
                    ${ctorTestData.content}
                private:
                    ${ctorTestData.content}
                };
                `
        );
        let classLike: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classLike.length, 1);
        assert.strictEqual(classLike[0].name, "TestClass");
        assert.strictEqual(classLike[0].privateScope.constructors.length, 1);
        assert.strictEqual(classLike[0].publicScope.constructors.length, 1);
        assert.strictEqual(classLike[0].protectedScope.constructors.length, 1);
        assert.strictEqual(classLike[0].inheritance.length, 0);
      }
    );
  });

  test(`Parse ${specifier} with destructor`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass {
                public:
                    ~TestClass ();		
            };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 1);
    assert.strictEqual(classLike[0].name, "TestClass");
    assertClassScopeEmpty(classLike[0].publicScope);
    assertClassScopeEmpty(classLike[0].privateScope);
    assertClassScopeEmpty(classLike[0].protectedScope);
    assert.strictEqual(classLike[0].inheritance.length, 0);
    assert.notStrictEqual(classLike[0].destructor, undefined);
    assert.strictEqual(classLike[0].destructor?.virtual, false);
  });

  test(`Parse ${specifier} with virtual destructor`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass {
            //implicit private
                virtual ~TestClass ();
            };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 1);
    assert.strictEqual(classLike[0].name, "TestClass");
    assertClassScopeEmpty(classLike[0].publicScope);
    assertClassScopeEmpty(classLike[0].privateScope);
    assertClassScopeEmpty(classLike[0].protectedScope);
    assert.strictEqual(classLike[0].inheritance.length, 0);
    assert.notStrictEqual(classLike[0].destructor, undefined);
    assert.strictEqual(classLike[0].destructor?.virtual, true);
  });

  test(`Parse ${specifier} with override destructor`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass {
            //implicit private
                ~TestClass () override;
            };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 1);
    assert.strictEqual(classLike[0].name, "TestClass");
    assertClassScopeEmpty(classLike[0].publicScope);
    assertClassScopeEmpty(classLike[0].privateScope);
    assertClassScopeEmpty(classLike[0].protectedScope);
    assert.strictEqual(classLike[0].inheritance.length, 0);
    assert.notStrictEqual(classLike[0].destructor, undefined);
    assert.strictEqual(classLike[0].destructor?.virtual, true);
  });

  test(`Parse ${specifier} with virtual default destructor and member function`, () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass {
        public:
            virtual ~TestClass () = default;
            void function();
        };
        `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 1);
    assert.strictEqual(classLike[0].name, "TestClass");
    assertClassScopeEmpty(classLike[0].privateScope);
    assert.strictEqual(classLike[0].publicScope.memberFunctions.length, 1);
    assertClassScopeEmpty(classLike[0].protectedScope);
    assert.strictEqual(classLike[0].inheritance.length, 0);
    assert.strictEqual(classLike[0].destructor, undefined);
  });

  describe(`Parse inheritance`, function () {
    callItAsync(
      "With inheritance ${value}",
      inheritData,
      function (inheritData: TestData) {
        const testContent = TextFragment.createFromString(
          `${specifier} TestClass ${inheritData.content}  {  // The ${specifier}
              };
            `
        );
        let classLike: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classLike.length, 1);
        assert.strictEqual(classLike[0].name, "TestClass");
        assertClassScopeEmpty(classLike[0].publicScope);
        assertClassScopeEmpty(classLike[0].privateScope);
        assertClassScopeEmpty(classLike[0].protectedScope);
        assert.strictEqual(classLike[0].destructor, undefined);
        assert.strictEqual(classLike[0].inheritance.length, inheritData.nDates);
      }
    );
  });

  describe(`Parse inheritance with member function with initializer list`, function () {
    callItAsync(
      "With inheritance ${value}",
      inheritData,
      function (inheritData: TestData) {
        const testContent = TextFragment.createFromString(
          `${specifier} TestClass ${inheritData.content}  {
            public:
                void function(int x = {});
              };
            `
        );

        let classLike: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classLike.length, 1);
        assert.strictEqual(classLike[0].name, "TestClass");
        assertClassScopeEmpty(classLike[0].privateScope);
        assert.strictEqual(classLike[0].publicScope.memberFunctions.length, 1);
        assertClassScopeEmpty(classLike[0].protectedScope);
        assert.strictEqual(classLike[0].destructor, undefined);
        assert.strictEqual(classLike[0].inheritance.length, inheritData.nDates);
      }
    );
  });

  test(`Deserialize nested ${specifier} as source with correct scope`, async () => {
    const testContent = TextFragment.createFromString(
      `${specifier} TestClass {
        public: 	
			  ${specifier} NestedClass {
          public:
          void fncName();
		  	};
		  };
            `
    );
    let classLike: IClass[] = HeaderParser.parseClasses(testContent);

    assert.strictEqual(classLike.length, 1);
    let nestedClass: IClass = classLike[0].publicScope.nestedClasses[0];
    assert.strictEqual(classLike[0].publicScope.nestedClasses.length, 1);
    const serialized = await classLike[0].serialize({
      mode: SerializableMode.source,
    });
    assert.ok(serialized.includes("TestClass::NestedClass::fncName"));
  });

  describe(`Parse ${specifier} with final specifier`, () => {
    callItAsync(
      "With inheritance ${value}",
      inheritData,
      function (inheritData: TestData) {
        const testContent = TextFragment.createFromString(
          `${specifier} TestClass final ${inheritData.content}  {
          public:
              void function(int x = {});
            };
          `
        );

        let classLike: IClass[] = HeaderParser.parseClasses(testContent);

        assert.strictEqual(classLike.length, 1);
        assert.strictEqual(classLike[0].name, "TestClass");
        assertClassScopeEmpty(classLike[0].privateScope);
        assert.strictEqual(classLike[0].publicScope.memberFunctions.length, 1);
        assertClassScopeEmpty(classLike[0].protectedScope);
        assert.strictEqual(classLike[0].destructor, undefined);
        assert.strictEqual(classLike[0].inheritance.length, inheritData.nDates);
      }
    );
  });
}
