import * as assert from 'assert';
import { Done, describe, it } from 'mocha';


// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import {Parser} from '../../Parser';
import {IClass, IFunction, MemberFunction, SerializableMode} from '../../cpptypes';
import { ClassNameGenerator } from '../../io';

const argData = ["", "int test", "int test1, const Class* test2, void* test3", "int \ttest1,\t\n const\n Class* test2\n, void* test3\n\t"];

function callItAsync<T>(desc:string, data:Array<T>, callback:Function) {
    data.forEach(function (val) {
        it(renderTemplate(desc, val), function (done) {
            callback(done, val);
        });
    });
}

/*
 * Add value to description 
 */
function renderTemplate(template:string, value:any) {
    try {
        return eval('`' + template + '`;');
    } catch (err) {
        return template;
    }
}


suite('Full Member Function Tests', () => {

	describe('ParseAndSerializeSingleLineEmpty', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		const testContent = 'int fncName('+arg+');';
		const testClassName = "TestClass";
		const classNameGen = new ClassNameGenerator(testClassName, false);

		let parsedFunctions = Parser.parseClassMemberFunctions(testContent, classNameGen);
		assert.strictEqual(parsedFunctions.length, 1);

		let memberFnct:MemberFunction = parsedFunctions[0] as MemberFunction;	
		assert.strictEqual(memberFnct.name,"fncName");
		assert.strictEqual(memberFnct.args, arg);
		assert.strictEqual(memberFnct.returnVal, "int");
		assert.strictEqual(memberFnct.isConst, false);
		//Serialization
		assert.strictEqual(memberFnct.serialize(SerializableMode.Header), 'int fncName ('+arg+');');
		assert.strictEqual(memberFnct.serialize(SerializableMode.Source), 'int TestClass::fncName ('+arg+') {\n' +
		'int returnValue;\n return returnValue;\n}');

		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplHeader), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.ImplSource), '');
		assert.strictEqual(memberFnct.serialize(SerializableMode.InterfaceHeader), '');

		done();
		});
	});			
	
	describe('ParseAndSerializeSingleLineWithArgs', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		let testContentSingleArg = 'int fncName('+arg+');';

		done();
		});
	});		

	describe('ParseAndSerializeSingleLineWithConstReturn', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		let testContent =  "const int fncName("+arg+");";

		done();
		});
	});

	describe('ParseAndSerializeSingleLineConst', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		let testContent =  "int fncName("+arg+") const;";

		done();
		});
	});

	describe('ParseAndSerializeSingleLineVirtual', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		let testContent =  "virtual int fncName("+arg+")  ;";

		done();
		});
	});

	describe('ParseAndSerializeSingleLineVirtualConst', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		let testContent =  "virtual int fncName("+arg+")   const;";

		done();
		});
	});


	describe('ParseAndSerializeSingleLinePureVirtual', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		let testContent =  "virtual int fncName("+arg+")  ;";

		done();
		});
	});

	describe('ParseAndSerializeSingleLinePureVirtualConst', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		let testContent =  "virtual int fncName("+arg+")   const;";

		done();
		});
	});
	
	describe('ParseAndSerializeMultipleOnSingleLine', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {
		
		done();
		});
	});

		
	describe('ParseMixedLineMixedType', function() {
		callItAsync("With function arguments ${value}", argData, function (done:Done, arg:string) {


		done();
		});
	});
});
