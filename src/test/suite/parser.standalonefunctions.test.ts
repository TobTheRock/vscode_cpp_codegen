import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import {Parser} from '../../Parser';
import {IFunction} from '../../cpptypes';

suite('Parser Standalone Functions Tests', () => {
	// vscode.window.showInformationMessage('Start all tests.');

	test('ParseStandloneFunction', (done) => {
		let testContent = 
		`
void fncName (int argument);
		`
		;
		let functions:IFunction[] = Parser.parseStandaloneFunctiones(testContent);

		assert.strictEqual(functions.length,1);
		assert.strictEqual(functions[0].name,"fncName");
		assert.strictEqual(functions[0].args, "int argument");
		assert.strictEqual(functions[0].returnVal, "void");
		done();
	});

	test('ParseStandloneFunctionMultiline', (done) => {
		let testContent = 
		`
void fncName (int argument,
	std::shared_ptr<XYZ> argument2);
		`
		;
		let functions:IFunction[] = Parser.parseStandaloneFunctiones(testContent);

		assert.strictEqual(functions.length,1);
		assert.strictEqual(functions[0].name,"fncName");
		assert.strictEqual(functions[0].args, "int argument,\n\tstd::shared_ptr<XYZ> argument2");
		assert.strictEqual(functions[0].returnVal, "void");
		done();
	});

	test('ParseMultipleStandaloneFunctions', (done) => {
		let testContent = 
		`
void fncName ();
std::shared_ptr<XYZ> fncName2 (int args2,
	void* arg3);
		`
		;
		let functions:IFunction[] = Parser.parseStandaloneFunctiones(testContent);

		assert.strictEqual(functions.length,2);
		assert.strictEqual(functions[0].name,"fncName");
		assert.strictEqual(functions[0].args, "");
		assert.strictEqual(functions[0].returnVal, "void");
		assert.strictEqual(functions[1].name,"fncName2");
		assert.strictEqual(functions[1].args, "int args2,\n\tvoid* arg3");
		assert.strictEqual(functions[1].returnVal, "std::shared_ptr<XYZ>");
		done();
	});

	test('ParseStandloneFunctionsWithConstReturn', (done) => {
		let testContent = 
		`
const XYZ* fncName (int arg1,
	void* arg2);
		`
		;
		let functions:IFunction[] = Parser.parseStandaloneFunctiones(testContent);

		assert.strictEqual(functions.length,1);
		assert.strictEqual(functions[0].name,"fncName");
		assert.strictEqual(functions[0].args, "int arg1,\n\tvoid* arg2");
		assert.strictEqual(functions[0].returnVal, "const XYZ*");
		done();
	});
});
