import * as assert from "assert";

import { Done, describe } from "mocha";
// import * as myExtension from '../../extension';
import { HeaderParser } from "../../cpp/HeaderParser";
import { INamespace } from "../../cpp";
import { TextFragment, SerializableMode } from "../../io";
import { callItAsync } from "./utils";
import { Namespace, RootNamespace } from "../../cpp/Namespace";
class TestData {
  constructor(
    public content: string,
    public nClasses: number,
    public nFunc: number
  ) {}

  public toString() {
    return this.content;
  }
}

const namespacesData: TestData[] = (function () {
  let data: TestData[] = [];
  data.push(new TestData("void fncName (int test);", 0, 1));
  data.push(
    new TestData(
      `class MyClass {       // The class
		int myNum;        // Attribute (int variable)
		string myString;  // Attribute (string variable)
	  };
	`,
      1,
      0
    )
  );

  return data;
})();

suite("Namespace Tests", () => {
  // vscode.window.showInformationMessage('Start all tests.');

  describe("Parse Single Namespace", function () {
    callItAsync(
      "With content ${value}",
      namespacesData,
      function (data: TestData) {
        const testStr = `namespace namespaceName
				{
					${data.content}
				}`;
        const testData = TextFragment.createFromString(testStr);
        let namespaces: INamespace[] = HeaderParser.parseNamespaces(testData);

        assert.strictEqual(namespaces.length, 1);
        assert.strictEqual(namespaces[0].name, "namespaceName");
        assert.strictEqual(namespaces[0].classes.length, data.nClasses);
        assert.strictEqual(namespaces[0].functions.length, data.nFunc);
        assert.strictEqual(namespaces[0].subnamespaces.length, 0);

        assert.strictEqual(namespaces[0].scopeStart, 0);
        assert.strictEqual(namespaces[0].scopeEnd, testStr.length - 1);
      }
    );
  });

  describe("Parse Multiple Namespaces", function () {
    callItAsync(
      "With content ${value}",
      namespacesData,
      function (data: TestData) {
        const testData = TextFragment.createFromString(
          `
				namespace namespaceName{${data.content}}			
				namespace namespaceName2{
					${data.content}
				}
			`
        );
        let namespaces: INamespace[] = HeaderParser.parseNamespaces(testData);

        assert.strictEqual(namespaces.length, 2);
        assert.strictEqual(namespaces[0].name, "namespaceName");
        assert.strictEqual(namespaces[0].classes.length, data.nClasses);
        assert.strictEqual(namespaces[0].functions.length, data.nFunc);
        assert.strictEqual(namespaces[0].subnamespaces.length, 0);
        assert.strictEqual(namespaces[1].name, "namespaceName2");
        assert.strictEqual(namespaces[1].classes.length, data.nClasses);
        assert.strictEqual(namespaces[1].functions.length, data.nFunc);
        assert.strictEqual(namespaces[1].subnamespaces.length, 0);
      }
    );
  });

  describe("Parse Multiple Nested Namespaces", function () {
    callItAsync(
      "With content ${value}",
      namespacesData,
      function (data: TestData) {
        const testData = TextFragment.createFromString(
          `
				namespace namespaceName
				{
				namespace namespaceName2
				{
				namespace namespaceName3
				{
					${data.content}
				}
				}
				}
			`
        );
        let namespaces: INamespace[] = HeaderParser.parseNamespaces(testData);

        assert.strictEqual(namespaces.length, 1);
        assert.strictEqual(namespaces[0].name, "namespaceName");
        assert.strictEqual(namespaces[0].classes.length, 0);
        assert.strictEqual(namespaces[0].subnamespaces.length, 1);
        assert.strictEqual(namespaces[0].functions.length, 0);

        let namespace2 = namespaces[0].subnamespaces[0];
        assert.strictEqual(namespace2.name, "namespaceName2");
        assert.strictEqual(namespace2.classes.length, 0);
        assert.strictEqual(namespace2.subnamespaces.length, 1);
        assert.strictEqual(namespace2.functions.length, 0);

        let namespace3 = namespace2.subnamespaces[0];
        assert.strictEqual(namespace3.name, "namespaceName3");
        assert.strictEqual(namespace3.classes.length, data.nClasses);
        assert.strictEqual(namespace3.subnamespaces.length, 0);
        assert.strictEqual(namespace3.functions.length, data.nFunc);
      }
    );
  });

  describe("Parse NestedMultiple Namespaces", function () {
    callItAsync(
      "With content ${value}",
      namespacesData,
      function (data: TestData) {
        const testData = TextFragment.createFromString(
          `
				namespace namespaceName
				{
				namespace namespaceName2
				{
					${data.content}
				}
				namespace namespaceName3
				{
					${data.content}
				}
				}
			`
        );
        let namespaces: INamespace[] = HeaderParser.parseNamespaces(testData);

        assert.strictEqual(namespaces.length, 1);
        assert.strictEqual(namespaces[0].name, "namespaceName");
        assert.strictEqual(namespaces[0].classes.length, 0);
        assert.strictEqual(namespaces[0].subnamespaces.length, 2);
        assert.strictEqual(namespaces[0].functions.length, 0);

        let namespace2 = namespaces[0].subnamespaces[0];
        assert.strictEqual(namespace2.name, "namespaceName2");
        assert.strictEqual(namespace2.classes.length, data.nClasses);
        assert.strictEqual(namespace2.subnamespaces.length, 0);
        assert.strictEqual(namespace2.functions.length, data.nFunc);

        let namespace3 = namespaces[0].subnamespaces[1];
        assert.strictEqual(namespace3.name, "namespaceName3");
        assert.strictEqual(namespace3.classes.length, data.nClasses);
        assert.strictEqual(namespace3.subnamespaces.length, 0);
        assert.strictEqual(namespace3.functions.length, data.nFunc);
      }
    );
  });

  describe("Parse Nested Namespace Cpp17", function () {
    callItAsync(
      "With content ${value}",
      namespacesData,
      function (data: TestData) {
        const testData = TextFragment.createFromString(
          `
				namespace namespaceName::namespaceName2
				{
					${data.content}
				}
			`
        );
        let namespaces: INamespace[] = HeaderParser.parseNamespaces(testData);

        assert.strictEqual(namespaces.length, 1);
        assert.strictEqual(namespaces[0].name, "namespaceName::namespaceName2");
        assert.strictEqual(namespaces[0].classes.length, data.nClasses);
        assert.strictEqual(namespaces[0].functions.length, data.nFunc);
        assert.strictEqual(namespaces[0].subnamespaces.length, 0);
        assert.ok(namespaces[0] instanceof Namespace);
      }
    );
  });

  test("Parse Root Namespace Separated By Comments", () => {
    const testData = TextFragment.createFromString(
      `
			class MyClass {       // The class
				int myNum;        // Attribute (int variable)
				string myString;  // Attribute (string variable)
			};`
    );
    HeaderParser.parseComments(testData);
    let namespace: INamespace = HeaderParser.parseRootNamespace(testData);

    assert.strictEqual(namespace.name, "");
    assert.strictEqual(namespace.classes.length, 1);
    assert.strictEqual(namespace.functions.length, 0);
    assert.strictEqual(namespace.subnamespaces.length, 0);
    assert.ok(namespace instanceof RootNamespace);
  });

  test("Don't serialize empty namespaces", async () => {
    const testData = TextFragment.createFromString(
      `
        namespace namespaceName
        {
        }
		  `
    );
    let namespaces: INamespace[] = HeaderParser.parseNamespaces(testData);

    assert.strictEqual(namespaces.length, 1);
    const namespace = namespaces[0];
    const deserializedString = await namespace
      .serialize({
        mode: SerializableMode.header,
      })
      .toString();

    assert.strictEqual(deserializedString.length, 0);
  });
});
