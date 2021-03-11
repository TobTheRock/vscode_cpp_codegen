import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';
import { HeaderParser } from "../../io/HeaderParser";
import { IFunction } from "../../cpp";
import * as io from "../../io";

// TODO regex matcher tests

suite("Matcher Tests", () => {
  test("RemovingRegexMatcher removes single regex match", () => {
    const testContent = "This is a test message";
    const regex = "test";
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexMatcher(regex);

    const matches = matcher.match(textFragment);
    const slicedBlocks = textFragment.blocks;

    assert.strictEqual(slicedBlocks.length, 2);
    assert.strictEqual(slicedBlocks[0].content, "This is a ");
    assert.strictEqual(slicedBlocks[0].scopeStart, 0);
    assert.strictEqual(
      slicedBlocks[0].scopeEnd,
      testContent.indexOf(regex) - 1
    );
    assert.strictEqual(slicedBlocks[1].content, " message");
    assert.strictEqual(
      slicedBlocks[1].scopeStart,
      testContent.indexOf(regex) + regex.length
    );
    assert.strictEqual(slicedBlocks[1].scopeEnd, testContent.length - 1);

    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].fullMatch, regex);
  });

  test("RemovingRegexMatcher removes multiple regex match", () => {
    let testContent = "";
    const regex = "test";
    const spaceStr = "[SPACE]";
    const iter = 20;
    for (let i = 0; i < iter; i++) {
      testContent += spaceStr + regex;
    }
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexMatcher(regex);

    const matches = matcher.match(textFragment);
    const slicedBlocks = textFragment.blocks;

    assert.strictEqual(slicedBlocks.length, iter);
    assert.strictEqual(matches.length, iter);
    for (let index = 0; index < iter; index++) {
      assert.strictEqual(slicedBlocks[index].content, spaceStr);
      const start = index * (spaceStr + regex).length;
      const end = start + spaceStr.length - 1;
      assert.strictEqual(slicedBlocks[index].scopeStart, start);
      assert.strictEqual(slicedBlocks[index].scopeEnd, end);

      assert.strictEqual(matches[index].fullMatch, regex);
      assert.strictEqual(matches[index].scopeStart, end + 1);
      assert.strictEqual(matches[index].scopeEnd, end + regex.length);
    }
  });

  test("RemovingRegexMatcher remove all", () => {
    const testContent = "This is a test message";
    const regex = testContent;
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexMatcher(regex);

    const matches = matcher.match(textFragment);
    const slicedBlocks = textFragment.blocks;

    assert.strictEqual(slicedBlocks.length, 0);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].fullMatch, regex);
  });

  test("RemovingRegexMatcher removes single  regex inverse match", () => {
    const testContent = "This is a test message";
    const regex = "test";
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexMatcher(regex);

    const matches = matcher.matchInverse(textFragment);
    const slicedBlocks = textFragment.blocks;

    assert.strictEqual(slicedBlocks.length, 1);
    assert.strictEqual(slicedBlocks[0].content, "test");
    assert.strictEqual(slicedBlocks[0].scopeStart, testContent.indexOf(regex));
    assert.strictEqual(
      slicedBlocks[0].scopeEnd,
      testContent.indexOf(regex) + regex.length - 1
    );

    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].fullMatch, "This is a ");
    assert.strictEqual(matches[1].fullMatch, " message");
  });

  test("RemovingRegexMatcher removes multiple regex inverse match", () => {
    let testContent = "";
    const regex = "test";
    const spaceStr = "[SPACE]";
    const iter = 20;
    for (let i = 0; i < iter; i++) {
      testContent += regex + spaceStr;
    }
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexMatcher(regex);

    const matches = matcher.matchInverse(textFragment);
    const slicedBlocks = textFragment.blocks;

    assert.strictEqual(slicedBlocks.length, iter);
    assert.strictEqual(matches.length, iter);
    for (let index = 0; index < iter; index++) {
      assert.strictEqual(slicedBlocks[index].content, regex);
      const start = index * (spaceStr + regex).length;
      const end = start + regex.length - 1;
      assert.strictEqual(slicedBlocks[index].scopeStart, start);
      assert.strictEqual(slicedBlocks[index].scopeEnd, end);

      assert.strictEqual(matches[index].fullMatch, spaceStr);
      assert.strictEqual(matches[index].scopeStart, end + 1);
      assert.strictEqual(matches[index].scopeEnd, end + spaceStr.length);
    }
  });

  test("TextFragment: RemovingRegexMatcher removes nested regex", () => {
    const testContent = "a{{}}b";
    const regex = "{}";

    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexMatcher(regex);

    let matches = matcher.match(textFragment);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].fullMatch, regex);
    assert.strictEqual(matches[0].scopeStart, 2);
    assert.strictEqual(matches[0].scopeEnd, 3);
    assert.strictEqual(textFragment.blocks.length, 2);

    matches = matcher.match(textFragment);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].fullMatch, regex);
    assert.strictEqual(matches[0].scopeStart, 1);
    assert.strictEqual(matches[0].scopeEnd, 4);
    assert.strictEqual(textFragment.blocks.length, 2);
  });

  test("TextFragment: RemovingRegexMatcher return correct group matches", () => {
    const testContent = "This is a test message";
    const regex = "(test) (message)(too)?";
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexMatcher(regex);

    const matches = matcher.match(textFragment);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].fullMatch, "test message");
    assert.strictEqual(matches[0].getGroupMatch(0), "test");
    assert.strictEqual(matches[0].getGroupMatch(1), "message");
    assert.strictEqual(matches[0].getGroupMatch(2), "");

    for (let index = 0; index < 2; index++) {
      const groupMatch = matches[0].getGroupMatchFragment(index);
      assert.strictEqual(groupMatch.blocks.length, 1);
      const str = matches[0].getGroupMatch(index);
      assert.strictEqual(groupMatch.blocks[0].content, str);
      assert.strictEqual(
        groupMatch.blocks[0].scopeStart,
        testContent.indexOf(str)
      );
      assert.strictEqual(
        groupMatch.blocks[0].scopeEnd,
        testContent.indexOf(str) + str.length - 1
      );
    }
    assert.strictEqual(matches[0].getGroupMatchFragment(2).blocks.length, 0);
  });

  test("RemovingRegexWithBodyMatcher: find first bracketed content and removes it", () => {
    const testContent = "a{{}}{}";
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexWithBodyMatcher("a");

    const matches = matcher.match(textFragment);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].fullMatch, "a{{}}");
    assert.strictEqual(matches[0].scopeStart, 0);
    assert.strictEqual(matches[0].scopeEnd, 4);

    assert.strictEqual(textFragment.toString(), "{}");
  });

  test("RemovingRegexWithBodyMatcher: bracketed content as group match", () => {
    const testContent = "a{abc}";
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexWithBodyMatcher("a");

    const matches = matcher.match(textFragment);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].getGroupMatch(0), "abc");

    const groupMatchFrag = matches[0].getGroupMatchFragment(0);
    assert.strictEqual(groupMatchFrag.blocks.length, 1);
    assert.strictEqual(groupMatchFrag.blocks[0].scopeStart, 2);
    assert.strictEqual(groupMatchFrag.blocks[0].scopeEnd, 4);
  });

  test("RemovingRegexWithBodyMatcher: fragmented group match", () => {
    const testContent1 = "a{a";
    const testContent2 = "bc}";
    const textFragment = io.TextFragment.createEmpty();
    textFragment.push(
      new io.TextBlock(testContent1),
      new io.TextBlock(testContent2, testContent1.length)
    );
    const matcher = new io.RemovingRegexWithBodyMatcher("a");

    const matches = matcher.match(textFragment);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].getGroupMatch(0), "abc");

    const groupMatchFrag = matches[0].getGroupMatchFragment(0);
    assert.strictEqual(groupMatchFrag.blocks.length, 2);
    assert.strictEqual(groupMatchFrag.blocks[0].scopeStart, 2);
    assert.strictEqual(groupMatchFrag.blocks[0].scopeEnd, 2);
    assert.strictEqual(groupMatchFrag.blocks[1].scopeStart, 3);
    assert.strictEqual(groupMatchFrag.blocks[1].scopeEnd, 4);
  });

  test("RemovingRegexWithBodyMatcher: return empty if no bracketed content", () => {
    const testContent = "testing";
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexWithBodyMatcher("a");

    const matches = matcher.match(textFragment);
    assert.strictEqual(matches.length, 0);
  });

  test("RemovingRegexWithBodyMatcher: return empty if wrongly bracketed content", () => {
    const testContent = "a{{}";
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexWithBodyMatcher("a");

    const matches = matcher.match(textFragment);
    assert.strictEqual(matches.length, 0);
  });

  test("RemovingRegexWithBodyMatcher: regex group matches", () => {
    const testContent = "ab{abc}";
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexWithBodyMatcher("(a)(b)");

    const matches = matcher.match(textFragment);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].getGroupMatch(0), "a");
    assert.strictEqual(matches[0].getGroupMatch(1), "b");
    assert.strictEqual(matches[0].getGroupMatch(2), "abc");

    let groupMatchFrag = matches[0].getGroupMatchFragment(0);
    assert.strictEqual(groupMatchFrag.blocks.length, 1);
    assert.strictEqual(groupMatchFrag.blocks[0].scopeStart, 0);
    assert.strictEqual(groupMatchFrag.blocks[0].scopeEnd, 0);
    groupMatchFrag = matches[0].getGroupMatchFragment(1);
    assert.strictEqual(groupMatchFrag.blocks.length, 1);
    assert.strictEqual(groupMatchFrag.blocks[0].scopeStart, 1);
    assert.strictEqual(groupMatchFrag.blocks[0].scopeEnd, 1);
    groupMatchFrag = matches[0].getGroupMatchFragment(2);
    assert.strictEqual(groupMatchFrag.blocks.length, 1);
    assert.strictEqual(groupMatchFrag.blocks[0].scopeStart, 3);
    assert.strictEqual(groupMatchFrag.blocks[0].scopeEnd, 5);
  });

  test("RemovingRegexWithBodyMatcher: multiple matches", () => {
    const nRep = 20;
    const testBase = "ab{abc}HELLO";
    let testContent = "";
    let remainingContent = "";
    for (let cnt = 0; cnt < nRep; cnt++) {
      testContent += testBase;
      remainingContent += "HELLO";
    }
    const textFragment = io.TextFragment.createFromString(testContent);
    const matcher = new io.RemovingRegexWithBodyMatcher("(a)(b)");

    const matches = matcher.match(textFragment);
    assert.strictEqual(matches.length, nRep);
    matches.forEach((match, idx) => {
      assert.strictEqual(match.getGroupMatch(0), "a");
      assert.strictEqual(match.getGroupMatch(1), "b");
      assert.strictEqual(match.getGroupMatch(2), "abc");
      assert.strictEqual(match.getGroupMatchFragment(0).toString(), "a");
      assert.strictEqual(match.getGroupMatchFragment(1).toString(), "b");
      assert.strictEqual(match.getGroupMatchFragment(2).toString(), "abc");
      assert.strictEqual(match.scopeStart, testBase.length * idx);
      assert.strictEqual(match.scopeEnd, 6 + testBase.length * idx);
    });
    assert.strictEqual(textFragment.toString(), remainingContent);
  });
});
