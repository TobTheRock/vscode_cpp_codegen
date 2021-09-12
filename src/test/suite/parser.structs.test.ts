import * as assert from "assert";
import { describe } from "mocha";
import { HeaderParser } from "../../cpp/HeaderParser";
import { IClass } from "../../cpp";
import { callItAsync } from "./utils";

import { TextFragment } from "../../io";

import {
  assertClassScopeEmpty,
  structAndClassTests,
  functionData,
  TestData,
} from "./common.struct.class";

suite("Parser: Structs tests", () => {
  structAndClassTests("struct");

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
});
