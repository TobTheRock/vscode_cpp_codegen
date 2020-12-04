import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import {Parser} from '../../Parser';
import {IClass, IFunction, MemberFunction} from '../../cpptypes';

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

	// test('ParseNestedClassesWithoutMemberFunctions', (done) => {
	// 	// TODO fails as not implemented yet
	// 	let testContent = 
	// 	`class MyClass {       // The class
	// 		int myNum;        // Attribute (int variable)
	// 		string myString;  // Attribute (string variable)		
	// 		class NestedClass {       // The class
	// 			int myNum;        // Attribute (int variable)
	// 			string myString;  // Attribute (string variable)
	// 	  	};
	// 	  };
	// 	`
	// 	;
	// 	let classes:IClass[] = Parser.parseGeneralClasses(testContent);

	// 	assert.strictEqual(classes.length,1);
	// 	assert.strictEqual(classes[0].name,"MyClass");
	// 	assert.strictEqual(classes[0].publicFunctions.length,0);
	// 	assert.strictEqual(classes[0].privateFunctions.length,0);
	// 	assert.strictEqual(classes[0].protectedFunctions.length,0);
	// 	assert.strictEqual(classes[0].inheritance.length,0);
	// 	assert.strictEqual(classes[0].nestedClasses.length,1);

	// 	let nestedClass:IClass = classes[0].nestedClasses[0];
	// 	assert.strictEqual(nestedClass.name,"NestedClass");
	// 	assert.strictEqual(nestedClass.publicFunctions.length,0);
	// 	assert.strictEqual(nestedClass.privateFunctions.length,0);
	// 	assert.strictEqual(nestedClass.protectedFunctions.length,0);
	// 	assert.strictEqual(nestedClass.inheritance.length,0);
	// 	assert.strictEqual(nestedClass.nestedClasses.length,0);

	// 	done();
	// });

	test('ParseClassWithImplicitPrivateMemberFunctions', (done) => {
		let testContent = 
		`class MyClass {
			void fncName (int argument,
				std::shared_ptr<XYZ> argument2);
		  };
		`
		;
		let classes:IClass[] = Parser.parseGeneralClasses(testContent);

		assert.strictEqual(classes.length,1);
		assert.strictEqual(classes[0].name,"MyClass");
		assert.strictEqual(classes[0].publicFunctions.length,0);
		assert.strictEqual(classes[0].privateFunctions.length,1);
		assert.strictEqual(classes[0].protectedFunctions.length,0);
		assert.strictEqual(classes[0].inheritance.length,0);

		done();
	});


	test('ParseClassWithImplicitPrivateMemberFunctionVariatons', (done) => {
		let testContent = 
		`class MyClass {
			int fncName(void* buf,
				size_t size
				);
				const    int fncName2();
				const int fncName3() const;
				virtual void fncName();
				virtual void fncName2() = 0;
		  };
		`
		;
		let classes:IClass[] = Parser.parseGeneralClasses(testContent);

		assert.strictEqual(classes.length,1);
		assert.strictEqual(classes[0].name,"MyClass");
		assert.strictEqual(classes[0].publicFunctions.length,0);
		assert.strictEqual(classes[0].privateFunctions.length,5);
		assert.strictEqual(classes[0].protectedFunctions.length,0);
		assert.strictEqual(classes[0].inheritance.length,0);


		//TODO move this to function parser test!
		let privateFunc:MemberFunction = classes[0].privateFunctions[0] as MemberFunction;		
		assert.strictEqual(privateFunc.name,"fncName");
		assert.strictEqual(privateFunc.args, "void* buf,\n\t\t\t\tsize_t size\n\t\t\t\t");
		assert.strictEqual(privateFunc.returnVal, "int");
		assert.strictEqual(privateFunc.isConst, false);
		privateFunc = classes[0].privateFunctions[1]  as MemberFunction;		
		assert.strictEqual(privateFunc.name,"fncName2");
		assert.strictEqual(privateFunc.args, "");
		assert.strictEqual(privateFunc.returnVal, "const    int");
		assert.strictEqual(privateFunc.isConst, false);
		privateFunc = classes[0].privateFunctions[2]  as MemberFunction;		
		assert.strictEqual(privateFunc.name,"fncName3");
		assert.strictEqual(privateFunc.args, "");
		assert.strictEqual(privateFunc.returnVal, "const int");
		assert.strictEqual(privateFunc.isConst, true);
		privateFunc = classes[0].privateFunctions[3]  as MemberFunction;		
		assert.strictEqual(privateFunc.name,"fncName4");
		assert.strictEqual(privateFunc.args, "");
		assert.strictEqual(privateFunc.returnVal, "void");
		assert.strictEqual(privateFunc.isConst, false);
		privateFunc = classes[0].privateFunctions[4]  as MemberFunction;		
		assert.strictEqual(privateFunc.name,"fncName5");
		assert.strictEqual(privateFunc.args, "");
		assert.strictEqual(privateFunc.returnVal, "void");
		assert.strictEqual(privateFunc.isConst, false);

		// TODO check if pure, virtual etc

		done();
	});
});
