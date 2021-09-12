import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { Done, describe } from "mocha";
// import * as myExtension from '../../extension';
import { HeaderParser } from "../../cpp/HeaderParser";
import { callItAsync } from "./utils";

import { TextFragment, SerializableMode } from "../../io";
import {
  assertClassScopeEmpty,
  structAndClassTests,
  functionData,
  TestData,
} from "./common.struct.class";
import { IClass } from "../../cpp";

suite("Parser: Class tests", () => {
  structAndClassTests("class");

  test("Parse implicit private nested classes without member functions", () => {
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

  describe("Parse class with implicit private member functions", function () {
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
});
