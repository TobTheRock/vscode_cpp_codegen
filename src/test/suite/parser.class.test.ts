import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Done, describe} from 'mocha';
// import * as myExtension from '../../extension';
import {Parser} from '../../Parser';
import {IClass, ClassInterface, ClassImpl} from '../../cpptypes';
import { callItAsync } from "./utils";

import { DeseralizationData } from '../../io';

const argData = ["", "int test", "int test1, const Class* test2, void* test3", "int \ttest1,\t\n const\n Class* test2"];
class TestData {
	constructor(public content:string, public nDates:number){};

	public toString() {
		return this.content;		
	}
}

const functionData:TestData[] = function () {
	let funcTemp:TestData[] = [];
	for (const arg of argData) {
		funcTemp.push(new TestData('void fncName (${arg});', 1));
		funcTemp.push(new TestData(`int fncName(${arg});
		const    int fncName2(${arg});
		const int fncName3(${arg}) const;
		virtual void fncName(${arg});
		virtual void fncName2(${arg}) = 0;`,5));
	};

	return funcTemp;
}();


const inheritData = [new TestData(":public IInterface",1), 
new TestData(" :\tpublic IInterface, private IInterface2", 2), new TestData(": public IInterface,\n\t\t private IInterface2 \n, protected IInterface3 \n\n", 3)];

suite('Parser GeneralClasses Tests', () => {

	test('ParseClassWithoutMemberFunctions', (done) => {
		const testContent = new DeseralizationData(
		`class MyClass {       // The class
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)
		  };
		`
		);
		let classes:IClass[] = Parser.parseClasses(testContent);

		assert.strictEqual(classes.length,1);
		assert.strictEqual(classes[0].name,"MyClass");
		assert.strictEqual(classes[0].publicFunctions.length,0);
		assert.strictEqual(classes[0].privateFunctions.length,0);
		assert.strictEqual(classes[0].protectedFunctions.length,0);
		assert.strictEqual(classes[0].inheritance.length,0);
		assert.ok(classes[0] instanceof ClassImpl);
		done();
	});

	test('ParseInterface', (done) => {
		const testContent = new DeseralizationData(
		`class MyClass {       // The class
			virtual const int* pureFnct = 0  ;
		  };
		`
		);
		let classes:IClass[] = Parser.parseClasses(testContent);

		assert.strictEqual(classes.length,1);
		assert.strictEqual(classes[0].name,"MyClass");
		assert.strictEqual(classes[0].publicFunctions.length,0);
		assert.strictEqual(classes[0].privateFunctions.length,0);
		assert.strictEqual(classes[0].protectedFunctions.length,0);
		assert.strictEqual(classes[0].inheritance.length,0);
		assert.strictEqual(classes[0].nestedClasses.length, 0);
		assert.ok(classes[0] instanceof ClassInterface);

		done();
	});

	describe('ParseInheritance', function() {
		callItAsync("With inheritance ${value}", inheritData, function (done:Done, inheritData:TestData) {
		const testContent = new DeseralizationData(
		`class MyClass ${inheritData.content}  {  // The class
		  };
		`
		);
		let classes:IClass[] = Parser.parseClasses(testContent);

		assert.strictEqual(classes.length,1);
		assert.strictEqual(classes[0].name,"MyClass");
		assert.strictEqual(classes[0].publicFunctions.length,0);
		assert.strictEqual(classes[0].privateFunctions.length,0);
		assert.strictEqual(classes[0].protectedFunctions.length,0);
		assert.strictEqual(classes[0].inheritance.length,inheritData.nDates);
		assert.strictEqual(classes[0].nestedClasses.length, 0);

		done();
		});
	});

	test('ParseMultipleClassesWithoutMemberFunctions', (done) => {
		const testContent = new DeseralizationData(
		`class MyClass {       // The class
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)
		  };
		class MyClass2 {       // The 2nd class
			int myNum;        // Attribute 2 (int variable)
			string myString;  // Attribute 2(string variable)
		  };
		`
		);
		let classes:IClass[] = Parser.parseClasses(testContent);

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
		const testContent = new DeseralizationData(
		`class MyClass {       // The class
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)		
			class NestedClass {       // The class
				int myNum;        // Attribute (int variable)
				string myString;  // Attribute (string variable)
		  	};
		  };
		`
		);
		let classes:IClass[] = Parser.parseClasses(testContent);

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
	
	
	test('ParseNestedAndMultipleClassesWithoutMemberFunctions', (done) => {
		const testContent = new DeseralizationData(
		`class MyClass {       // The class
			int myNum;        // Attribute (int variable)
			string myString;  // Attribute (string variable)		
			class NestedClass {       // The class
				int myNum;        // Attribute (int variable)
				string myString;  // Attribute (string variable)
		  	};
		  };		
		  
		  class MyClass2 {       // The 2nd class
			int myNum;        // Attribute 2 (int variable)
			string myString;  // Attribute 2(string variable)
		  };
		`
		);
		let classes:IClass[] = Parser.parseClasses(testContent);

		assert.strictEqual(classes.length,2);
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

		assert.strictEqual(classes[1].name,"MyClass2");
		assert.strictEqual(classes[1].publicFunctions.length,0);
		assert.strictEqual(classes[1].privateFunctions.length,0);
		assert.strictEqual(classes[1].protectedFunctions.length,0);
		assert.strictEqual(classes[1].inheritance.length,0);
		assert.strictEqual(classes[1].nestedClasses.length,0);

		done();
	});

	describe('ParseClassWithImplicitPrivateMemberFunctions', function() {
		callItAsync("With functions ${value}", functionData, function (done:Done, functionTestData:TestData) {
			const testContent = new DeseralizationData(
			`class MyClass {
				${functionTestData.content}
			};
			`);
			let classes:IClass[] = Parser.parseClasses(testContent);

			assert.strictEqual(classes.length,1);
			assert.strictEqual(classes[0].name,"MyClass");
			assert.strictEqual(classes[0].publicFunctions.length,0);
			assert.strictEqual(classes[0].privateFunctions.length,functionTestData.nDates);
			assert.strictEqual(classes[0].protectedFunctions.length,0);
			assert.strictEqual(classes[0].inheritance.length,0);

			done();
		});
	});

	describe('ParseClassWithExplicitPrivateMemberFunctions', function() {
		callItAsync("With functions ${value}", functionData, function (done:Done, functionTestData:TestData) {
			const testContent = new DeseralizationData(
			`class MyClass {
			private:
				${functionTestData.content}
			};
			`);
			let classes:IClass[] = Parser.parseClasses(testContent);

			assert.strictEqual(classes.length,1);
			assert.strictEqual(classes[0].name,"MyClass");
			assert.strictEqual(classes[0].publicFunctions.length,0);
			assert.strictEqual(classes[0].privateFunctions.length,functionTestData.nDates);
			assert.strictEqual(classes[0].protectedFunctions.length,0);
			assert.strictEqual(classes[0].inheritance.length,0);

			done();
		});
	});

	describe('ParseClassWithPublicMemberFunctions', function() {
		callItAsync("With functions ${value}", functionData, function (done:Done, functionTestData:TestData) {
			const testContent = new DeseralizationData(
			`class MyClass {
			public:
				${functionTestData.content}
			};
			`);
			let classes:IClass[] = Parser.parseClasses(testContent);

			assert.strictEqual(classes.length,1);
			assert.strictEqual(classes[0].name,"MyClass");
			assert.strictEqual(classes[0].publicFunctions.length,functionTestData.nDates);
			assert.strictEqual(classes[0].privateFunctions.length,0);
			assert.strictEqual(classes[0].protectedFunctions.length,0);
			assert.strictEqual(classes[0].inheritance.length,0);

			done();
		});
	});

	describe('ParseClassWithProtectedMemberFunctions', function() {
		callItAsync("With functions ${value}", functionData, function (done:Done, functionTestData:TestData) {
			const testContent = new DeseralizationData(
			`class MyClass {
			protected:
				${functionTestData.content}
			};
			`); 
			let classes:IClass[] = Parser.parseClasses(testContent);

			assert.strictEqual(classes.length,1);
			assert.strictEqual(classes[0].name,"MyClass");
			assert.strictEqual(classes[0].publicFunctions.length,0);
			assert.strictEqual(classes[0].privateFunctions.length,0);
			assert.strictEqual(classes[0].protectedFunctions.length,functionTestData.nDates);
			assert.strictEqual(classes[0].inheritance.length,0);

			done();
		});
	});

	describe('ParseClassWithVariousMemberFunctions', function() {
		callItAsync("With functions ${value}", functionData, function (done:Done, functionTestData:TestData) {
			const testContent = new DeseralizationData(
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
			`);
			let classes:IClass[] = Parser.parseClasses(testContent);

			assert.strictEqual(classes.length,1);
			assert.strictEqual(classes[0].name,"MyClass");
			assert.strictEqual(classes[0].publicFunctions.length,2*functionTestData.nDates);
			assert.strictEqual(classes[0].privateFunctions.length,2*functionTestData.nDates);
			assert.strictEqual(classes[0].protectedFunctions.length,2*functionTestData.nDates);
			assert.strictEqual(classes[0].inheritance.length,0);

			done();
		});
	});
});
