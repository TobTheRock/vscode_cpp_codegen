import * as assert from 'assert';

import { Done, describe} from 'mocha';
// import * as myExtension from '../../extension';
import {HeaderParser} from '../../io/HeaderParser';
import {INamespace, Namespace} from '../../cpp';
import {TextFragment, compareSignaturables, TextScope} from '../../io';
import { callItAsync } from "./utils";
class TestData {
	constructor(public content:string, public nClasses:number, public nFunc:number){};

	public toString() {
		return this.content;		
	}
}

const namespacesData:TestData[] = function () {
	let data:TestData[] = [];
	data.push(new TestData('void fncName (int test);', 0, 1));
	data.push(new TestData(
	`class MyClass {       // The class
		int myNum;        // Attribute (int variable)
		string myString;  // Attribute (string variable)
	  };
	`, 1, 0));

	return data;
}();


suite('Parser Namespace Tests', () => {
	// vscode.window.showInformationMessage('Start all tests.');


	describe('ParseSingleNamespace', function() {
		callItAsync("With content ${value}", namespacesData, function (done:Done, data:TestData) {
			const testData = TextFragment.createFromString( 
			`
				namespace namespaceName
				{
					${data.content}
				}
			`
			);
			let namespaces:INamespace[] = HeaderParser.parseNamespaces(testData);

			assert.strictEqual(namespaces.length,1);
			assert.strictEqual(namespaces[0].name,"namespaceName");
			assert.strictEqual(namespaces[0].classes.length, data.nClasses);
			assert.strictEqual(namespaces[0].functions.length, data.nFunc);
			assert.strictEqual(namespaces[0].subnamespaces.length, 0);
			assert.ok(namespaces[0] instanceof Namespace);
			done();
		});
	});


	describe('ParseMultipleNamespaces', function() {
		callItAsync("With content ${value}", namespacesData, function (done:Done, data:TestData) {
			const testData = TextFragment.createFromString( 
			`
				namespace namespaceName{${data.content}}			
				namespace namespaceName2{
					${data.content}
				}
			`
			);
			let namespaces:INamespace[] = HeaderParser.parseNamespaces(testData);

			assert.strictEqual(namespaces.length,2);
			assert.strictEqual(namespaces[0].name,"namespaceName");
			assert.strictEqual(namespaces[0].classes.length, data.nClasses);
			assert.strictEqual(namespaces[0].functions.length, data.nFunc);
			assert.strictEqual(namespaces[0].subnamespaces.length, 0);
			assert.strictEqual(namespaces[1].name,"namespaceName2");
			assert.strictEqual(namespaces[1].classes.length, data.nClasses);
			assert.strictEqual(namespaces[1].functions.length, data.nFunc);
			assert.strictEqual(namespaces[1].subnamespaces.length, 0);
			done();
		});
	});

	describe('ParseMultipleNestedNamespaces', function() {
		callItAsync("With content ${value}", namespacesData, function (done:Done, data:TestData) {
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
			`);
			let namespaces:INamespace[] = HeaderParser.parseNamespaces(testData);

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
			assert.strictEqual(namespace3.classes.length, data.nClasses);
			assert.strictEqual(namespace3.subnamespaces.length, 0);
			assert.strictEqual(namespace3.functions.length, data.nFunc);
			done();
		});
	});

	describe('ParseNestedMultipleNamespaces', function() {
		callItAsync("With content ${value}", namespacesData, function (done:Done, data:TestData) {
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
			`);
			let namespaces:INamespace[] = HeaderParser.parseNamespaces(testData);

			assert.strictEqual(namespaces.length,1);
			assert.strictEqual(namespaces[0].name,"namespaceName");
			assert.strictEqual(namespaces[0].classes.length, 0);
			assert.strictEqual(namespaces[0].subnamespaces.length, 2);
			assert.strictEqual(namespaces[0].functions.length, 0);

			let namespace2 = namespaces[0].subnamespaces[0];
			assert.strictEqual(namespace2.name,"namespaceName3");
			assert.strictEqual(namespace2.classes.length, data.nClasses);
			assert.strictEqual(namespace2.subnamespaces.length, 0);
			assert.strictEqual(namespace2.functions.length, data.nFunc);

			let namespace3 = namespaces[0].subnamespaces[1];
			assert.strictEqual(namespace3.name,"namespaceName2");
			assert.strictEqual(namespace3.classes.length, data.nClasses);
			assert.strictEqual(namespace3.subnamespaces.length, 0);
			assert.strictEqual(namespace3.functions.length, data.nFunc);
			done();
		});
	});

	describe('ParseNestedNamespaceCpp17', function() {
		callItAsync("With content ${value}", namespacesData, function (done:Done, data:TestData) {
			const testData = TextFragment.createFromString( 
			`
				namespace namespaceName::namespaceName2
				{
					${data.content}
				}
			`
			);
			let namespaces:INamespace[] = HeaderParser.parseNamespaces(testData);

			assert.strictEqual(namespaces.length, 1);
			assert.strictEqual(namespaces[0].name, "namespaceName::namespaceName2");
			assert.strictEqual(namespaces[0].classes.length, data.nClasses);
			assert.strictEqual(namespaces[0].functions.length, data.nFunc);
			assert.strictEqual(namespaces[0].subnamespaces.length, 0);
			assert.ok(namespaces[0] instanceof Namespace);
			done();
		});
	});
});
