import * as assert from "assert";
import { test, beforeEach } from "mocha";
import { SourceFileDefinition } from "../../cpp/SourceFileDefinition";
import { StandaloneFunction } from "../../cpp/StandaloneFunction";
import { ISerializable, Text, TextScope } from "../../io";

suite("SourceFileDefinition Tests", () => {
  let nNamespacesGenerated: number = 0;
  const emptyScope = TextScope.createEmpty();
  beforeEach(() => {
    nNamespacesGenerated = 0;
  });
  const serialDummy: ISerializable = {
    serialize: function (): Text {
      return Text.createEmpty();
    },
  };

  test("comparing with different name", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      [],
      [],
      emptyScope,
      serialDummy
    );
    let func2 = new SourceFileDefinition(
      `fncName2`,
      `void`,
      "",
      [],
      [],
      emptyScope,
      serialDummy
    );
    assert.ok(func.equals(func));
    assert.ok(!func.equals(func2));
  });

  test("comparing with different return value", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      [],
      [],
      emptyScope,
      serialDummy
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `int`,
      "",
      [],
      [],
      emptyScope,
      serialDummy
    );
    assert.ok(func.equals(func));
    assert.ok(!func.equals(func2));
  });

  test("comparing with different arguments", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      [],
      [],
      emptyScope,
      serialDummy
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "int",
      [],
      [],
      emptyScope,
      serialDummy
    );
    assert.ok(func.equals(func));
    assert.ok(!func.equals(func2));
  });

  test("comparing with different namespaces", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "Namespace2"],
      [],
      emptyScope,
      serialDummy
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1"],
      [],
      emptyScope,
      serialDummy
    );
    let func3 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace2"],
      [],
      emptyScope,
      serialDummy
    );
    assert.ok(func.equals(func));
    assert.ok(!func.equals(func2));
    assert.ok(!func.equals(func3));
  });

  test("comparing with class defintion", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "Namespace2"],
      [],
      emptyScope,
      serialDummy
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1"],
      ["ClassName"],

      emptyScope,
      serialDummy
    );
    let func3 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "ClassName"],
      [],

      emptyScope,
      serialDummy
    );
    assert.ok(!func.equals(func2));
    assert.ok(func3.equals(func2));
  });

  test("comparing with function with explicit namespaces", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "Namespace2"],
      [],
      emptyScope,
      serialDummy
    );
    let func2 = new StandaloneFunction(
      `Namespace1::ClassName::fncName`,
      `void`,
      "",
      emptyScope
    );
    let func3 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "ClassName"],
      [],
      emptyScope,
      serialDummy
    );
    let func4 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1"],
      ["ClassName"],

      emptyScope,
      serialDummy
    );
    assert.ok(!func.equals(func2));
    assert.ok(func3.equals(func2));
    assert.ok(func4.equals(func2));
  });

  test("comparing with different class names", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1", "Namespace2"],
      ["ClassName"],
      emptyScope,
      serialDummy
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "",
      ["Namespace1"],
      ["ClassName2"],
      emptyScope,
      serialDummy
    );

    assert.ok(func.equals(func));
    assert.ok(!func.equals(func2));
  });

  test("comparing with different argument variable names", () => {
    let func = new SourceFileDefinition(
      `fncName`,
      `void`,
      "int arg1, void* arg2",
      [],
      [],
      emptyScope,
      serialDummy
    );
    let func2 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "int , void*",
      [],
      [],
      emptyScope,
      serialDummy
    );
    let func3 = new SourceFileDefinition(
      `fncName`,
      `void`,
      "int arg3, void* arg4",
      [],
      [],
      emptyScope,
      serialDummy
    );

    assert.ok(func.equals(func2));
    assert.ok(func2.equals(func));
    assert.ok(func.equals(func3));
    assert.ok(func2.equals(func3));
  });

  test("should set namespaces properly", () => {
    let func = new SourceFileDefinition(
      `Namespace2::fncName`,
      `void`,
      "",
      ["Namespace1"],
      [],
      emptyScope,
      serialDummy
    );
    assert.deepStrictEqual(["Namespace1"], func.namespaceNames);
    assert.deepStrictEqual(["Namespace2"], func.classNames);
  });
});
