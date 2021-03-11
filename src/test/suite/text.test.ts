import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';
import { HeaderParser } from "../../io/HeaderParser";
import { IFunction } from "../../cpp";
import * as io from "../../io";

suite("Text Utility Tests", () => {
  test("Textblock should have correct scope on construction", () => {
    const testContent = "FCK 2020";
    const testOff = 42;
    const textBlock = new io.TextBlock(testContent, testOff);

    assert.strictEqual(textBlock.content, testContent);
    assert.strictEqual(textBlock.scopeStart, 42);
    assert.strictEqual(textBlock.scopeEnd, 42 + testContent.length - 1);
  });

  test("Textblock fullyContain check", () => {
    const testContent = "This is a test message";
    const subStrStart = 4;
    const subStrEnd = 12;
    const textBlock1 = new io.TextBlock(testContent);
    const textBlock2 = new io.TextBlock(
      testContent.substr(subStrStart, subStrEnd),
      subStrStart
    );

    assert.ok(textBlock1.fullyContains(textBlock2));

  });

  test("Textblock contains check", () => {
    const testContent = "This is a test message";
    const subStrStart = 0;
    const subStrEnd = 8;
    const subStrStart2 = 4;
    const subStrEnd2 = 12;
    const textBlock1 = new io.TextBlock(
      testContent.substr(subStrStart, subStrEnd),
      subStrStart
    );
    const textBlock2 = new io.TextBlock(
      testContent.substr(subStrStart2, subStrEnd2),
      subStrStart2
    );

    assert.ok(textBlock1.contains(textBlock2));

  });

  test("TextScope merge", () => {
    const testContent = "This is a test message";
    const subStrStart = 0;
    const subStrEnd = 8;
    const subStrStart2 = 4;
    const subStrEnd2 = 12;
    const textBlock1 = new io.TextBlock(
      testContent.substr(subStrStart, subStrEnd),
      subStrStart
    );
    const textBlock2 = new io.TextBlock(
      testContent.substr(subStrStart2, subStrEnd2 - subStrStart2),
      subStrStart2
    );

    const mergedScopes = io.TextScope.merge(textBlock1, textBlock2);

    assert.strictEqual(mergedScopes.length, 1);
    assert.strictEqual(mergedScopes[0].scopeStart, textBlock1.scopeStart);
    assert.strictEqual(mergedScopes[0].scopeEnd, textBlock2.scopeEnd);

  });

  test("TextScope not merge", () => {
    const testContent = "This is a test message";
    const subStrStart = 0;
    const subStrEnd = 8;
    const subStrStart2 = 9;
    const subStrEnd2 = 12;
    const textBlock1 = new io.TextBlock(
      testContent.slice(subStrStart, subStrEnd),
      subStrStart
    );
    const textBlock2 = new io.TextBlock(
      testContent.slice(subStrStart2, subStrEnd2),
      subStrStart2
    );

    const mergedScopes = io.TextScope.merge(textBlock1, textBlock2);

    assert.strictEqual(mergedScopes.length, 2);
    assert.strictEqual(mergedScopes[0].scopeStart, textBlock1.scopeStart);
    assert.strictEqual(mergedScopes[0].scopeEnd, textBlock1.scopeEnd);
    assert.strictEqual(mergedScopes[1].scopeStart, textBlock2.scopeStart);
    assert.strictEqual(mergedScopes[1].scopeEnd, textBlock2.scopeEnd);

  });

  test("TextBlock slice single", () => {
    const testContent = "This is a test message";
    const subStrStart = 2;
    const subStrEnd = 8;
    const textBlock = new io.TextBlock(testContent);
    const slicedBlocks = textBlock.slice(
      new io.TextScope(subStrStart, subStrEnd)
    );

    assert.strictEqual(slicedBlocks.length, 1);
    assert.strictEqual(slicedBlocks[0].scopeStart, subStrStart);
    assert.strictEqual(slicedBlocks[0].scopeEnd, subStrEnd);
    assert.strictEqual(
      slicedBlocks[0].content,
      testContent.slice(subStrStart, subStrEnd + 1)
    );

  });

  test("TextBlock slice multi", () => {
    const testContent = "This is a test message";
    const subStrStart = 2;
    const subStrEnd = 8;
    const subStrStart2 = 9;
    const subStrEnd2 = 12;
    const textBlock = new io.TextBlock(testContent);
    const slicedBlocks = textBlock.slice(
      new io.TextScope(subStrStart, subStrEnd),
      new io.TextScope(subStrStart2, subStrEnd2)
    );

    assert.strictEqual(slicedBlocks.length, 2);
    assert.strictEqual(slicedBlocks[0].scopeStart, subStrStart);
    assert.strictEqual(slicedBlocks[0].scopeEnd, subStrEnd);
    assert.strictEqual(
      slicedBlocks[0].content,
      testContent.slice(subStrStart, subStrEnd + 1)
    );
    assert.strictEqual(slicedBlocks[1].scopeStart, subStrStart2);
    assert.strictEqual(slicedBlocks[1].scopeEnd, subStrEnd2);
    assert.strictEqual(
      slicedBlocks[1].content,
      testContent.slice(subStrStart2, subStrEnd2 + 1)
    );

  });

  test("TextBlock slice multi overlapping", () => {
    const testContent = "This is a test message";
    const subStrStart = 2;
    const subStrEnd = 8;
    const subStrStart2 = 5;
    const subStrEnd2 = 12;
    const textBlock = new io.TextBlock(testContent);
    const slicedBlocks = textBlock.slice(
      new io.TextScope(subStrStart, subStrEnd),
      new io.TextScope(subStrStart2, subStrEnd2)
    );

    assert.strictEqual(slicedBlocks.length, 1);
    assert.strictEqual(slicedBlocks[0].scopeStart, subStrStart);
    assert.strictEqual(slicedBlocks[0].scopeEnd, subStrEnd2);
    assert.strictEqual(
      slicedBlocks[0].content,
      testContent.slice(subStrStart, subStrEnd2 + 1)
    );

  });

  test("TextFragment slice single", () => {
    const testContent1 = "Hello";
    const testContent2 = "World";
    const subStrStart = 2;
    const subStrEnd = 12;
    const gap = 5;
    const textFragment = io.TextFragment.createEmpty();
    textFragment.push(
      new io.TextBlock(testContent1),
      new io.TextBlock(testContent2, testContent1.length + gap)
    );
    const slicedTextFragment = textFragment.slice(
      new io.TextScope(subStrStart, subStrEnd)
    );

    assert.strictEqual(slicedTextFragment.blocks.length, 2);
    assert.strictEqual(slicedTextFragment.blocks[0].scopeStart, subStrStart);
    assert.strictEqual(
      slicedTextFragment.blocks[0].scopeEnd,
      testContent1.length - 1
    );
    assert.strictEqual(
      slicedTextFragment.blocks[0].content,
      testContent1.slice(subStrStart)
    );
    assert.strictEqual(
      slicedTextFragment.blocks[1].scopeStart,
      testContent1.length + gap
    );
    assert.strictEqual(slicedTextFragment.blocks[1].scopeEnd, subStrEnd);
    assert.strictEqual(
      slicedTextFragment.blocks[1].content,
      testContent2.slice(0, subStrEnd + 1 - gap - testContent1.length)
    );

  });
});
