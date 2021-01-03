import * as assert from 'assert';
import { Done, describe, it } from 'mocha';


// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { callItAsync } from "./utils";

import {Parser} from '../../Parser';
import {IClass, IFunction, MemberFunction, SerializableMode} from '../../cpptypes';
import { ClassNameGenerator, TextFragment } from '../../io';

const argData = ["", "int test", "int test1, const Class* test2, void* test3", "int \ttest1,\t\n const\n Class* test2\n, void* test3\n\t"];


suite('Full Member Function Tests', () => {

	describe('ParseAndSerializeSingle', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		const testContent = new TextFragment('int fncName('+arg+');');
		const testClassName = "TestClass";
		const classNameGen = new ClassNameGenerator(testClassName, false);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 1);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, false);

		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'int fncName ('+arg+');');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), 'int TestClass::fncName ('+arg+') {\n' +
		'int returnValue;\n return returnValue;\n}');

		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');

		done();
		});
	});			

	describe('ParseAndSerializeSingleWithConstReturn', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		const testContent = new TextFragment( "const int* fncName("+arg+");");
		const testClassName = "TestClass";
		const classNameGen = new ClassNameGenerator(testClassName, false);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 1);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "const int*");
		assert.strictEqual(memberFnct.isConst, false);

		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'const int* fncName ('+arg+');');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), 'const int* TestClass::fncName ('+arg+') {\n' +
		'const int* returnValue;\n return returnValue;\n}');

		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');


		done();
		});
	});	
	
	describe('ParseAndSerializeSingleWithWhitespaceInReturn', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		const testContent = new TextFragment( "std::pair<int, void*> fncName("+arg+");");
		const testClassName = "TestClass";
		const classNameGen = new ClassNameGenerator(testClassName, false);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 1);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "std::pair<int, void*>");
		assert.strictEqual(memberFnct.isConst, false);

		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'std::pair<int, void*> fncName ('+arg+');');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), 'std::pair<int, void*> TestClass::fncName ('+arg+') {\n' +
		'std::pair<int, void*> returnValue;\n return returnValue;\n}');

		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');


		done();
		});
	});

	describe('ParseAndSerializeSingleConst', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		const testContent = new TextFragment( "int fncName("+arg+") const;");
		const testClassName = "TestClass";
		const classNameGen = new ClassNameGenerator(testClassName, false);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 1);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, true);

		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'int fncName ('+arg+') const;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), 'int TestClass::fncName ('+arg+') const {\n' +
		'int returnValue;\n return returnValue;\n}');

		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');


		done();
		});
	});

	describe('ParseAndSerializeSingleVirtual', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		const testContent = new TextFragment( "virtual int fncName("+arg+")  ;");
		const testClassName = "TestClass";
		const classNameGen = new ClassNameGenerator(testClassName, false);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 1);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, false);

		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'int fncName ('+arg+') override;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), 'int TestClass::fncName ('+arg+') {\n' +
		'int returnValue;\n return returnValue;\n}');

		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), 'virtual int fncName ('+arg+') =0;');



		done();
		});
	});

	describe('ParseAndSerializeSingleVirtualOverride', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		const testContent = new TextFragment( "int fncName("+arg+")  override;");
		const testClassName = "TestClass";
		const classNameGen = new ClassNameGenerator(testClassName, false);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 1);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, false);

		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'int fncName ('+arg+') override;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), 'int TestClass::fncName ('+arg+') {\n' +
		'int returnValue;\n return returnValue;\n}');

		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), 'virtual int fncName ('+arg+') =0;');



		done();
		});
	});

	describe('ParseAndSerializeSingleVirtualConst', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		const testContent = new TextFragment( "virtual int fncName("+arg+")   const;");
		const testClassName = "TestClass";
		const classNameGen = new ClassNameGenerator(testClassName, false);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 1);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, true);

		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'int fncName ('+arg+') const override;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), 'int TestClass::fncName ('+arg+') const {\n' +
		'int returnValue;\n return returnValue;\n}');

		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), 'virtual int fncName ('+arg+') const =0;');
		done();
		});
	});


	describe('ParseAndSerializeSinglePureVirtual', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		const testContent = new TextFragment( "virtual int fncName("+arg+") =0;");
		const testClassName = "ITestClass";
		const classNameGen = new ClassNameGenerator(testClassName, true);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 1);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, false);

		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'virtual int fncName ('+arg+') =0;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), '');

		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), 'int fncName ('+arg+') override;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), 'int TestClass::fncName ('+arg+') {\n' +
		'int returnValue;\n return returnValue;\n}');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');

		done();
		});
	});

	describe('ParseAndSerializeSinglePureVirtualConst', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		const testContent = new TextFragment( "virtual int fncName("+arg+")   const = 0;");
				const testClassName = "ITestClass";
		const classNameGen = new ClassNameGenerator(testClassName, true);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 1);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, true);

		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'virtual int fncName ('+arg+') const =0;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), '');

		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), 'int fncName ('+arg+') const override;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), 'int TestClass::fncName ('+arg+') const {\n' +
		'int returnValue;\n return returnValue;\n}');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');

		done();
		});
	});
		
	describe('ParseMultipleMixedType', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {		
		const testContent = new TextFragment(`
		virtual int fncName(${arg})   const = 0;
		virtual int fncName2(${arg}) =0;
		std::shared_ptr<Test> fncName3(${arg});
		void fncName4(${arg}) const;
		virtual int fncName5(${arg});
		`);	
		const testClassName = "ITestClass";
		const classNameGen = new ClassNameGenerator(testClassName, true);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 5);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, true);
		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'virtual int fncName ('+arg+') const =0;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), 'int fncName ('+arg+') const override;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), 'int TestClass::fncName ('+arg+') const {\n' +
		'int returnValue;\n return returnValue;\n}');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');

		memberFnct = parsedFunctions[1] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName2");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, false);
		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'virtual int fncName2 ('+arg+') =0;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), 'int fncName2 ('+arg+') override;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), 'int TestClass::fncName2 ('+arg+') {\n' +
		'int returnValue;\n return returnValue;\n}');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');

		memberFnct = parsedFunctions[2] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName3");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "std::shared_ptr<Test>");
		assert.strictEqual(memberFnct.isConst, false);
		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'std::shared_ptr<Test> fncName3 ('+arg+');');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source),  'std::shared_ptr<Test> ITestClass::fncName3 ('+arg+') {\n' +
		'std::shared_ptr<Test> returnValue;\n return returnValue;\n}');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');

		memberFnct = parsedFunctions[3] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName4");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "void");
		assert.strictEqual(memberFnct.isConst, true);
		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'void fncName4 ('+arg+') const;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source),  'void ITestClass::fncName4 ('+arg+') const {\n}');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');
		
		memberFnct = parsedFunctions[4] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName5");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, false);
		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'int fncName5 ('+arg+') override;');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source),  'int ITestClass::fncName5 ('+arg+') {\n' +
		'int returnValue;\n return returnValue;\n}');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), 'virtual int fncName5 ('+arg+') =0;');

		done();
		});
	});
});
