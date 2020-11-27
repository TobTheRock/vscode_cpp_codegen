import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import {Parser} from '../../Parser';
import {INamespace} from '../../cpptypes';

suite('Parser test', () => {
	// vscode.window.showInformationMessage('Start all tests.');

	test('ParseEmptyNamespace', (done) => {
		let emptyNamespace = 
		`
			namespace namespaceName
			{

			}
		`
		;
		let namespaces:INamespace[] = Parser.parseNamespaces(emptyNamespace);

		assert.strictEqual(namespaces.length,1);
		assert.strictEqual(namespaces[0].name,"namespaceName");
		assert.strictEqual(namespaces[0].classes.length, 0);
		assert.strictEqual(namespaces[0].functions.length, 0);
		assert.strictEqual(namespaces[0].subnamespaces.length, 0);
		done();
	});


	test('ParseMultipleEmptyNamespaces', (done) => {
		let emptyNamespace = 
		`
			namespace namespaceName{}			
			namespace namespaceName2{
			}
		`
		;
		let namespaces:INamespace[] = Parser.parseNamespaces(emptyNamespace);

		assert.strictEqual(namespaces.length,2);
		assert.strictEqual(namespaces[0].name,"namespaceName");
		assert.strictEqual(namespaces[0].classes.length, 0);
		assert.strictEqual(namespaces[0].functions.length, 0);
		assert.strictEqual(namespaces[0].subnamespaces.length, 0);
		assert.strictEqual(namespaces[1].name,"namespaceName2");
		assert.strictEqual(namespaces[1].classes.length, 0);
		assert.strictEqual(namespaces[1].functions.length, 0);
		assert.strictEqual(namespaces[1].subnamespaces.length, 0);
		done();
	});

	test('ParseMultipleNestedEmptyNamespaces', (done) => {
		let emptyNestedNamespace = 
		`
			namespace namespaceName
			{
			namespace namespaceName2
			{
			namespace namespaceName3
			{
			}
			}
			}
		`;
		let namespaces:INamespace[] = Parser.parseNamespaces(emptyNestedNamespace);

		assert.strictEqual(namespaces.length,1);
		assert.strictEqual(namespaces[0].name,"namespaceName");
		assert.strictEqual(namespaces[0].classes.length, 0);
		assert.strictEqual(namespaces[0].subnamespaces.length, 1);
		assert.strictEqual(namespaces[0].functions.length, 0);

		let namespace2 = namespaces[0].subnamespaces[0];
		assert.strictEqual(namespace2.name,"namespaceName2");
		assert.strictEqual(namespace2.classes.length, 0);
		assert.strictEqual(namespace2.subnamespaces.length, 1);
		assert.strictEqual(namespace2.functions.length, 0);

		let namespace3 = namespace2.subnamespaces[0];
		assert.strictEqual(namespace3.name,"namespaceName3");
		assert.strictEqual(namespace3.classes.length, 0);
		assert.strictEqual(namespace3.subnamespaces.length, 0);
		assert.strictEqual(namespace3.functions.length, 0);
		done();
	});

	test('ParseNestedEmptyNamespaces', (done) => {
		let emptyNestedNamespace = 
		`
			namespace namespaceName
			{
			namespace namespaceName2
			{
			}
			namespace namespaceName3
			{
			}
			}
		`;
		let namespaces:INamespace[] = Parser.parseNamespaces(emptyNestedNamespace);

		assert.strictEqual(namespaces.length,1);
		assert.strictEqual(namespaces[0].name,"namespaceName");
		assert.strictEqual(namespaces[0].classes.length, 0);
		assert.strictEqual(namespaces[0].subnamespaces.length, 2);
		assert.strictEqual(namespaces[0].functions.length, 0);

		let namespace2 = namespaces[0].subnamespaces[0];
		assert.strictEqual(namespace2.name,"namespaceName2");
		assert.strictEqual(namespace2.classes.length, 0);
		assert.strictEqual(namespace2.subnamespaces.length, 0);
		assert.strictEqual(namespace2.functions.length, 0);

		let namespace3 = namespaces[0].subnamespaces[1];
		assert.strictEqual(namespace3.name,"namespaceName3");
		assert.strictEqual(namespace3.classes.length, 0);
		assert.strictEqual(namespace3.subnamespaces.length, 0);
		assert.strictEqual(namespace3.functions.length, 0);
		done();
	});
});
