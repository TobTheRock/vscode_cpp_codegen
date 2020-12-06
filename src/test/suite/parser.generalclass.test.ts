import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Done, describe} from 'mocha';
// import * as myExtension from '../../extension';
import {Parser} from '../../Parser';
import {IClass, IFunction, MemberFunction} from '../../cpptypes';
import { callItAsync } from "./utils";

const argData = ["", "int test", "int test1, const Class* test2, void* test3", "int \ttest1,\t\n const\n Class* test2"];
class FunctionTestData {
	constructor(public content:string, public nFunctions:number){};

	public toString() {
		return this.content;		
	}
}
const functionData:FunctionTestData[] = function () {
	let funcTemp:FunctionTestData[] = [];
	for (const arg of argData) {
		funcTemp.push(new FunctionTestData('void fncName (${arg});', 1));
		funcTemp.push(new FunctionTestData(`int fncName(${arg});
		const    int fncName2(${arg});
		const int fncName3(${arg}) const;
		virtual void fncName(${arg});
		virtual void fncName2(${arg}) = 0;`,5));
	};

	return funcTemp;
}();

suite('Parser GeneralClasses Tests', () => {
	// vscode.window.showInformationMessage('Start all tests.');

	test('ParseClassWithoutMemberFunctions', (done) => {
		let testContent = 
		`class MyClass {       // The class
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)
		  };
		`
		;
		let classes:IClass[] = Parser.parseGeneralClasses(testContent);

		assert.strictEqual(classes.length,1);
		assert.strictEqual(classes[0].name,"MyClass");
		assert.strictEqual(classes[0].publicFunctions.length,0);
		assert.strictEqual(classes[0].privateFunctions.length,0);
		assert.strictEqual(classes[0].protectedFunctions.length,0);
		assert.strictEqual(classes[0].inheritance.length,0);
		done();
	});


	test('ParseMultipleClassesWithoutMemberFunctions', (done) => {
		let testContent = 
		`class MyClass {       // The class
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)
		  };
		class MyClass2 {       // The class
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)
		  };
		`
		;
		let classes:IClass[] = Parser.parseGeneralClasses(testContent);

		assert.strictEqual(classes.length,2);
		assert.strictEqual(classes[0].name,"MyClass");
		assert.strictEqual(classes[0].publicFunctions.length,0);
		assert.strictEqual(classes[0].privateFunctions.length,0);
		assert.strictEqual(classes[0].protectedFunctions.length,0);
		assert.strictEqual(classes[0].inheritance.length,0);
		assert.strictEqual(classes[0].nestedClasses.length,0);
		assert.strictEqual(classes[1].name,"MyClass2");
		assert.strictEqual(classes[1].publicFunctions.length,0);
		assert.strictEqual(classes[1].privateFunctions.length,0);
		assert.strictEqual(classes[1].protectedFunctions.length,0);
		assert.strictEqual(classes[1].inheritance.length,0);
		assert.strictEqual(classes[1].nestedClasses.length,0);
		done();
	});

	test('ParseNestedClassesWithoutMemberFunctions', (done) => {
		// TODO fails as not implemented yet
		let testContent = 
		`class MyClass {       // The class
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)		
			class NestedClass {       // The class
				int myNum;        // Attribute (int variable)
				string myString;  // Attribute (string variable)
		  	};
		  };
		`
		;
		let classes:IClass[] = Parser.parseGeneralClasses(testContent);

		assert.strictEqual(classes.length,1);
		assert.strictEqual(classes[0].name,"MyClass");
		assert.strictEqual(classes[0].publicFunctions.length,0);
		assert.strictEqual(classes[0].privateFunctions.length,0);
		assert.strictEqual(classes[0].protectedFunctions.length,0);
		assert.strictEqual(classes[0].inheritance.length,0);
		assert.strictEqual(classes[0].nestedClasses.length,1);

		let nestedClass:IClass = classes[0].nestedClasses[0];
		assert.strictEqual(nestedClass.name,"NestedClass");
		assert.strictEqual(nestedClass.publicFunctions.length,0);
		assert.strictEqual(nestedClass.privateFunctions.length,0);
		assert.strictEqual(nestedClass.protectedFunctions.length,0);
		assert.strictEqual(nestedClass.inheritance.length,0);
		assert.strictEqual(nestedClass.nestedClasses.length,0);

		done();
	});

	describe('ParseClassWithImplicitPrivateMemberFunctions', function() {
		callItAsync("With functions ${value}", functionData, function (done:Done, functionTestData:FunctionTestData) {
			let testContent = 
			`class MyClass {
				${functionTestData.content}
			};
			`;
			let classes:IClass[] = Parser.parseGeneralClasses(testContent);

			assert.strictEqual(classes.length,1);
			assert.strictEqual(classes[0].name,"MyClass");
			assert.strictEqual(classes[0].publicFunctions.length,0);
			assert.strictEqual(classes[0].privateFunctions.length,functionTestData.nFunctions);
			assert.strictEqual(classes[0].protectedFunctions.length,0);
			assert.strictEqual(classes[0].inheritance.length,0);

			done();
		});
	});

	describe('ParseClassWithExplicitPrivateMemberFunctions', function() {
		callItAsync("With functions ${value}", functionData, function (done:Done, functionTestData:FunctionTestData) {
			let testContent = 
			`class MyClass {
			private:
				${functionTestData.content}
			};
			`;
			let classes:IClass[] = Parser.parseGeneralClasses(testContent);

			assert.strictEqual(classes.length,1);
			assert.strictEqual(classes[0].name,"MyClass");
			assert.strictEqual(classes[0].publicFunctions.length,0);
			assert.strictEqual(classes[0].privateFunctions.length,functionTestData.nFunctions);
			assert.strictEqual(classes[0].protectedFunctions.length,0);
			assert.strictEqual(classes[0].inheritance.length,0);

			done();
		});
	});

	describe('ParseClassWithPublicMemberFunctions', function() {
		callItAsync("With functions ${value}", functionData, function (done:Done, functionTestData:FunctionTestData) {
			let testContent = 
			`class MyClass {
			public:
				${functionTestData.content}
			};
			`;
			let classes:IClass[] = Parser.parseGeneralClasses(testContent);

			assert.strictEqual(classes.length,1);
			assert.strictEqual(classes[0].name,"MyClass");
			assert.strictEqual(classes[0].publicFunctions.length,functionTestData.nFunctions);
			assert.strictEqual(classes[0].privateFunctions.length,0);
			assert.strictEqual(classes[0].protectedFunctions.length,0);
			assert.strictEqual(classes[0].inheritance.length,0);

			done();
		});
	});

	describe('ParseClassWithProtectedMemberFunctions', function() {
		callItAsync("With functions ${value}", functionData, function (done:Done, functionTestData:FunctionTestData) {
			let testContent = 
			`class MyClass {
			protected:
				${functionTestData.content}
			};
			`;
			let classes:IClass[] = Parser.parseGeneralClasses(testContent);

			assert.strictEqual(classes.length,1);
			assert.strictEqual(classes[0].name,"MyClass");
			assert.strictEqual(classes[0].publicFunctions.length,0);
			assert.strictEqual(classes[0].privateFunctions.length,0);
			assert.strictEqual(classes[0].protectedFunctions.length,functionTestData.nFunctions);
			assert.strictEqual(classes[0].inheritance.length,0);

			done();
		});
	});

	describe('ParseClassWithVariousMemberFunctions', function() {
		callItAsync("With functions ${value}", functionData, function (done:Done, functionTestData:FunctionTestData) {
			let testContent = 
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
			`;
			let classes:IClass[] = Parser.parseGeneralClasses(testContent);

			assert.strictEqual(classes.length,1);
			assert.strictEqual(classes[0].name,"MyClass");
			assert.strictEqual(classes[0].publicFunctions.length,2*functionTestData.nFunctions);
			assert.strictEqual(classes[0].privateFunctions.length,2*functionTestData.nFunctions);
			assert.strictEqual(classes[0].protectedFunctions.length,2*functionTestData.nFunctions);
			assert.strictEqual(classes[0].inheritance.length,0);

			done();
		});
	});
});
