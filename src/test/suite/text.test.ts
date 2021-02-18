import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import {HeaderParser} from '../../io/HeaderParser';
import {IFunction} from '../../cpp';
import * as io from   '../../io';

suite('Text Utility Tests', () => {
	test('Textblock should have correct scope on construction', (done) => {
		const testContent = "FCK 2020";
		const testOff = 42;
		const textBlock = new io.TextBlock(testContent, testOff);

		assert.strictEqual(textBlock.content, testContent);
		assert.strictEqual(textBlock.scopeStart, 42);
		assert.strictEqual(textBlock.scopeEnd, 42+testContent.length-1);
		done();
	});
	
	test('Textblock fullyContain check', (done) => {
		const testContent = "This is a test message";
		const subStrStart = 4;
		const subStrEnd = 12;
		const textBlock1 = new io.TextBlock(testContent);
		const textBlock2 = new io.TextBlock(testContent.substr(subStrStart,subStrEnd), subStrStart);

		assert.ok(textBlock1.fullyContains(textBlock2));

		done();
	});
	
	test('Textblock contains check', (done) => {
		const testContent = "This is a test message";
		const subStrStart = 0;
		const subStrEnd = 8;
		const subStrStart2 = 4;
		const subStrEnd2 = 12;
		const textBlock1 = new io.TextBlock(testContent.substr(subStrStart,subStrEnd), subStrStart);
		const textBlock2 = new io.TextBlock(testContent.substr(subStrStart2,subStrEnd2), subStrStart2);

		assert.ok(textBlock1.contains(textBlock2));

		done();
	});

	test('TextScope merge', (done) => {
		const testContent = "This is a test message";
		const subStrStart = 0;
		const subStrEnd = 8;
		const subStrStart2 = 4;
		const subStrEnd2 = 12;
		const textBlock1 = new io.TextBlock(testContent.substr(subStrStart,subStrEnd), subStrStart);
		const textBlock2 = new io.TextBlock(testContent.substr(subStrStart2,subStrEnd2-subStrStart2), subStrStart2);

		const mergedScopes = io.TextScope.merge(textBlock1, textBlock2);

		assert.strictEqual(mergedScopes.length,1);
		assert.strictEqual(mergedScopes[0].scopeStart, textBlock1.scopeStart);
		assert.strictEqual(mergedScopes[0].scopeEnd, textBlock2.scopeEnd);

		done();
	});

	test('TextScope not merge', (done) => {
		const testContent = "This is a test message";
		const subStrStart = 0;
		const subStrEnd = 8;
		const subStrStart2 = 9;
		const subStrEnd2 = 12;
		const textBlock1 = new io.TextBlock(testContent.slice(subStrStart,subStrEnd), subStrStart);
		const textBlock2 = new io.TextBlock(testContent.slice(subStrStart2,subStrEnd2), subStrStart2);

		const mergedScopes = io.TextScope.merge(textBlock1, textBlock2);

		assert.strictEqual(mergedScopes.length,2);
		assert.strictEqual(mergedScopes[0].scopeStart, textBlock1.scopeStart);
		assert.strictEqual(mergedScopes[0].scopeEnd, textBlock1.scopeEnd);
		assert.strictEqual(mergedScopes[1].scopeStart, textBlock2.scopeStart);
		assert.strictEqual(mergedScopes[1].scopeEnd, textBlock2.scopeEnd);

		done();
	});
	
	test('Textblock removes single regex match', (done) => {
		const testContent = "This is a test message";
		const regex = "test";
		const textBlock = new io.TextBlock(testContent);

		const matches = textBlock.match(regex);
		const slicedBlocks = textBlock.splice(matches);
		
		assert.strictEqual(slicedBlocks.length,2);
		assert.strictEqual(slicedBlocks[0].content, "This is a ");
		assert.strictEqual(slicedBlocks[0].scopeStart, 0);
		assert.strictEqual(slicedBlocks[0].scopeEnd, testContent.indexOf(regex)-1);
		assert.strictEqual(slicedBlocks[1].content, " message");
		assert.strictEqual(slicedBlocks[1].scopeStart, testContent.indexOf(regex)+regex.length);
		assert.strictEqual(slicedBlocks[1].scopeEnd, testContent.length-1);

		assert.strictEqual(matches.length,1);
		assert.strictEqual(matches[0].fullMatch, regex);

		done();
	});

	test('Textblock removes multiple regex match', (done) => {
		let testContent = "";
		const regex = "test";
		const spaceStr = "[SPACE]";
		const iter = 20;
		for (let i = 0; i < iter; i++) {
			testContent += spaceStr+regex;
		}
		const textBlock = new io.TextBlock(testContent);

		
		const matches = textBlock.match(regex);
		const slicedBlocks = textBlock.splice(matches);
		
		assert.strictEqual(slicedBlocks.length,iter);
		assert.strictEqual(matches.length,iter);
		for (let index = 0; index < iter; index++) {			
			assert.strictEqual(slicedBlocks[index].content, spaceStr);
			const start = index*(spaceStr+regex).length;
			const end = start+spaceStr.length-1;
			assert.strictEqual(slicedBlocks[index].scopeStart, start);
			assert.strictEqual(slicedBlocks[index].scopeEnd, end);

			assert.strictEqual(matches[index].fullMatch, regex);
			assert.strictEqual(matches[index].scopeStart, end+1);
			assert.strictEqual(matches[index].scopeEnd, end+regex.length);
		}

		done();
	});	
	
	test('Textblock remove all', (done) => {
		const testContent = "This is a test message";
		const regex = testContent;
		const textBlock = new io.TextBlock(testContent);

		
		const matches = textBlock.match(regex);
		const slicedBlocks = textBlock.splice(matches);
		
		assert.strictEqual(slicedBlocks.length,0);
		assert.strictEqual(matches.length,1);
		assert.strictEqual(matches[0].fullMatch, regex);

		done();
	});

	test('Textblock removes single  regex non match', (done) => {
		const testContent = "This is a test message";
		const regex = "test";
		const textBlock = new io.TextBlock(testContent);

		const matches = textBlock.inverseMatch(regex);
		const slicedBlocks = textBlock.splice(matches);
		
		assert.strictEqual(slicedBlocks.length,1);
		assert.strictEqual(slicedBlocks[0].content, "test");
		assert.strictEqual(slicedBlocks[0].scopeStart, testContent.indexOf(regex));
		assert.strictEqual(slicedBlocks[0].scopeEnd, testContent.indexOf(regex)+regex.length-1);

		assert.strictEqual(matches.length,2);
		assert.strictEqual(matches[0].fullMatch, "This is a ");
		assert.strictEqual(matches[1].fullMatch, " message");

		done();
	});

	test('Textblock removes multiple regex not match', (done) => {
		let testContent = "";
		const regex = "test";
		const spaceStr = "[SPACE]";
		const iter = 20;
		for (let i = 0; i < iter; i++) {
			testContent += regex+spaceStr;
		}
		const textBlock = new io.TextBlock(testContent);

		const matches = textBlock.inverseMatch(regex);
		const slicedBlocks = textBlock.splice(matches);
		
		assert.strictEqual(slicedBlocks.length,iter);
		assert.strictEqual(matches.length,iter);
		for (let index = 0; index < iter; index++) {			
			assert.strictEqual(slicedBlocks[index].content, regex);
			const start = index*(spaceStr+regex).length;
			const end = start+regex.length-1;
			assert.strictEqual(slicedBlocks[index].scopeStart, start);
			assert.strictEqual(slicedBlocks[index].scopeEnd, end);

			assert.strictEqual(matches[index].fullMatch, spaceStr);
			assert.strictEqual(matches[index].scopeStart, end+1);
			assert.strictEqual(matches[index].scopeEnd, end+spaceStr.length);
		}

		done();
	});

	test('TextFragment removes multiple regex match', (done) => {
		let testContent = "";
		const regex = "test";
		const spaceStr = "[SPACE]";
		const iter = 20;
		for (let i = 0; i < iter; i++) {
			testContent += spaceStr+regex;
		}
		const textFrag = io.TextFragment.createFromString(testContent);

		const matches = textFrag.removeMatching(regex);
		assert.strictEqual(matches.length,iter);
		assert.strictEqual(textFrag.blocks.length,iter);

		done();
	});

	test('TextFragment removes multiple regex not match', (done) => {
		let testContent = "";
		const regex = "test";
		const spaceStr = "[SPACE]";
		const iter = 20;
		for (let i = 0; i < iter; i++) {
			testContent += spaceStr+regex;
		}
		const textFrag = io.TextFragment.createFromString(testContent);

		const matches = textFrag.removeNotMatching(regex);
		assert.strictEqual(matches.length,iter);
		assert.strictEqual(textFrag.blocks.length,iter);

		done();
	});
	
	test('TextFragment removes nested regex', (done) => {
		const testContent = "a{{}}b";
		const regex = "{}";

		const textFrag = io.TextFragment.createFromString(testContent);

		let matches = textFrag.removeMatching(regex);
		assert.strictEqual(matches.length,1);
		assert.strictEqual(matches[0].fullMatch, regex);
		assert.strictEqual(matches[0].scopeStart, 2);
		assert.strictEqual(matches[0].scopeEnd, 3);
		assert.strictEqual(textFrag.blocks.length,2);

		matches = textFrag.removeMatching(regex);
		assert.strictEqual(matches.length,1);
		assert.strictEqual(matches[0].fullMatch, regex);
		assert.strictEqual(matches[0].scopeStart, 1);
		assert.strictEqual(matches[0].scopeEnd, 4);
		assert.strictEqual(textFrag.blocks.length,2);

		done();
	});

	test('TexRegexMatch return correct group matches', (done) => {
		const testContent = "This is a test message";
		const regex = "(test) (message)(too)?";
		const textBlock = new io.TextBlock(testContent);

		const matches = textBlock.match(regex);
	
		assert.strictEqual(matches.length,1);
		assert.strictEqual(matches[0].fullMatch, "test message");
		assert.strictEqual(matches[0].groupMatches[0], "test");
		assert.strictEqual(matches[0].groupMatches[1], "message");
		assert.strictEqual(matches[0].groupMatches[2], undefined);

		for (let index = 0; index < 2; index++) {
			const groupMatch = matches[0].getGroupMatchTextBlock(index);
			assert(groupMatch);
			const str = matches[0].groupMatches[index];
			assert.strictEqual(groupMatch.content, str);
			assert.strictEqual(groupMatch.scopeStart, testContent.indexOf(str));
			assert.strictEqual(groupMatch.scopeEnd, testContent.indexOf(str)+str.length-1);
		}
		assert(!matches[0].getGroupMatchTextBlock(2));
		assert.throws(() => {
			matches[0].getGroupMatchTextBlock(3);
		});

		done();
	});
});
