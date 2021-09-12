import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';
import { HeaderParser } from "../../cpp/HeaderParser";
import { IFunction } from "../../cpp";
import { SerializableMode, TextFragment, TextScope } from "../../io";

suite("Parser Standalone Functions Tests", () => {
  test("ParseStandloneFunction", () => {
    const testContent = TextFragment.createFromString(
      `
void fncName (int argument);
		`
    );
    let functions: IFunction[] =
      HeaderParser.parseStandaloneFunctions(testContent);

    assert.strictEqual(functions.length, 1);
    assert.strictEqual(functions[0].name, "fncName");
    assert.strictEqual(functions[0].args, "int argument");
    assert.strictEqual(functions[0].returnVal, "void");
  });

  test("ParseStandloneFunctionMultiline", () => {
    const testContent = TextFragment.createFromString(
      `
void fncName (int argument,
	std::shared_ptr<XYZ> argument2);
		`
    );
    let functions: IFunction[] =
      HeaderParser.parseStandaloneFunctions(testContent);

    assert.strictEqual(functions.length, 1);
    assert.strictEqual(functions[0].name, "fncName");
    assert.strictEqual(
      functions[0].args,
      "int argument,\n\tstd::shared_ptr<XYZ> argument2"
    );
    assert.strictEqual(functions[0].returnVal, "void");
  });

  test("ParseMultipleStandaloneFunctions", () => {
    const testContent = TextFragment.createFromString(
      `
void fncName ();
std::shared_ptr<XYZ> fncName2 (int args2,
	void* arg3);
		`
    );
    let functions: IFunction[] =
      HeaderParser.parseStandaloneFunctions(testContent);

    assert.strictEqual(functions.length, 2);
    assert.strictEqual(functions[0].name, "fncName");
    assert.strictEqual(functions[0].args, "");
    assert.strictEqual(functions[0].returnVal, "void");
    assert.strictEqual(functions[1].name, "fncName2");
    assert.strictEqual(functions[1].args, "int args2,\n\tvoid* arg3");
    assert.strictEqual(functions[1].returnVal, "std::shared_ptr<XYZ>");
  });

  test("ParseStandloneFunctionsWithConstReturn", () => {
    const testContent = TextFragment.createFromString(
      `
const XYZ* fncName (int arg1,
	void* arg2);
		`
    );
    let functions: IFunction[] =
      HeaderParser.parseStandaloneFunctions(testContent);

    assert.strictEqual(functions.length, 1);
    assert.strictEqual(functions[0].name, "fncName");
    assert.strictEqual(functions[0].args, "int arg1,\n\tvoid* arg2");
    assert.strictEqual(functions[0].returnVal, "const XYZ*");
  });

  test("Do not serialize if not in selection", async function () {
    const testString = `void fncName ();`;
    const testContent = TextFragment.createFromString(testString);
    const range = new TextScope(testString.length, testString.length * 2);
    const parsedFunctions = HeaderParser.parseStandaloneFunctions(testContent);
    assert.strictEqual(parsedFunctions.length, 1);
    const serial = parsedFunctions[0].serialize({
      mode: SerializableMode.source,
      range,
    });
    assert.strictEqual(serial.length, 0);
  });

  test("Serialize if in selection", function () {
    const testString = `void fncName ();`;
    const rangeFull = new TextScope(0, testString.length - 1);
    const rangePartialStart = new TextScope(0, testString.length / 2);
    const rangePartialEnd = new TextScope(
      testString.length / 2,
      testString.length - 1
    );

    [rangeFull, rangePartialStart, rangePartialEnd].forEach(async (range) => {
      const testContent = TextFragment.createFromString(testString);
      const parsedFunctions =
        HeaderParser.parseStandaloneFunctions(testContent);
      assert.strictEqual(parsedFunctions.length, 1);
      const serial = parsedFunctions[0].serialize({
        mode: SerializableMode.source,
        range,
      });
      assert.ok(serial.length);
    });
  });
});
