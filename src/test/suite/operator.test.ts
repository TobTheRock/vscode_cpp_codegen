import * as assert from "assert";
import { describe, test } from "mocha";
import { callItAsync } from "./utils";

import { HeaderParser } from "../../cpp/HeaderParser";
import { TextFragment, SerializableMode, IClassNameProvider } from "../../io";
import {
  VirtualMemberFunction,
  PureVirtualMemberFunction,
  MemberFunction,
} from "../../cpp/MemberFunction";
import { SourceParser } from "../../cpp/SourceParser";

const dummyClassNameProvider: IClassNameProvider = {
  originalName: "",
  getClassName: () => "TestClass",
};
class OperatorData {
  constructor(
    public type: string,
    public args: string,
    public returnVal: string
  ) {}
  public toString(namespace: string = ""): string {
    return (
      this.returnVal +
      " " +
      namespace +
      this.funcName() +
      " (" +
      this.args +
      ")"
    );
  }

  public funcName(): string {
    return "operator" + this.type;
  }
}
class VirtualOperatorData extends OperatorData {
  constructor(private innerData: OperatorData) {
    super(innerData.type, innerData.args, innerData.returnVal);
  }
  public toString(): string {
    return "virtual " + this.innerData.toString();
  }
}
class OverrideOperatorData extends OperatorData {
  constructor(private innerData: OperatorData) {
    super(innerData.type, innerData.args, innerData.returnVal);
  }
  public toString(): string {
    return this.innerData.toString() + " override";
  }
}
class PureVirtualOperatorData extends OperatorData {
  constructor(private innerData: OperatorData) {
    super(innerData.type, innerData.args, innerData.returnVal);
  }
  public toString(): string {
    return this.innerData.toString() + " =0";
  }
}

class ConstOperatorData extends OperatorData {
  constructor(private innerData: OperatorData) {
    super(innerData.type, innerData.args, innerData.returnVal);
  }
  public toString(): string {
    return this.innerData.toString() + " const";
  }
}

const overloadedOperatorData: OperatorData[] = [
  new OperatorData("++", "", "int"),
  new OperatorData("->", "", "int"),
  new OperatorData("=", "const Type& other", "Type&"),
  new OperatorData("()", "double x", "double"),
  new OperatorData("[]", "int x", "double"),
];
const allocatorOperatorData: OperatorData[] = [
  new OperatorData(" new", "std::size_t count", "void*"),
  new OperatorData(" new[]", "std::size_t count", "void*"),
  new OperatorData(" delete", "void* ptr", "void"),
  new OperatorData(" delete[]", "void* ptr", "void"),
];
const castingOperatorData: OperatorData[] = [
  new OperatorData(" int", "", ""),
  new OperatorData(" long double*", "", ""),
];

const operatorData: OperatorData[] = overloadedOperatorData.concat(
  allocatorOperatorData,
  castingOperatorData
);
const virtualOperatorData: OperatorData[] = overloadedOperatorData
  .concat(castingOperatorData)
  .map((data) => new VirtualOperatorData(data));
const virtualOperatorDataWithOverride = virtualOperatorData.concat(
  overloadedOperatorData
    .concat(castingOperatorData)
    .map((data) => new OverrideOperatorData(data))
);
const pureVirtualOperatorData: OperatorData[] = virtualOperatorData.map(
  (data) => new PureVirtualOperatorData(data)
);
const constOperatorData: OperatorData[] = overloadedOperatorData
  .concat(castingOperatorData)
  .map((data) => new ConstOperatorData(data));
const constVirtualOperatorData: OperatorData[] = constOperatorData.map(
  (data) => new VirtualOperatorData(data)
);
const constVirtualOperatorDataWithOverride = constVirtualOperatorData.concat(
  constOperatorData.map((data) => new OverrideOperatorData(data))
);
const constPureVirtualOperatorData: OperatorData[] =
  constVirtualOperatorData.map((data) => new PureVirtualOperatorData(data));

suite("HeaderParser: Class Operator Declarations", () => {
  describe("Operators are parsed correctly", () => {
    callItAsync("With '${value}'", operatorData, async (data: OperatorData) => {
      const testContent = TextFragment.createFromString(data.toString() + ";");

      let parsedFunctions = HeaderParser.parseClassMemberFunctions(
        testContent,
        dummyClassNameProvider
      );
      assert.strictEqual(parsedFunctions.length, 1);
      assert.strictEqual(parsedFunctions[0].name, data.funcName());
      assert.strictEqual(parsedFunctions[0].returnVal, data.returnVal);
      assert.strictEqual(parsedFunctions[0].args, data.args);
    });
  });

  describe("Virtual operators are parsed correctly", () => {
    callItAsync(
      "With '${value}'",
      virtualOperatorDataWithOverride,
      async (data: OperatorData) => {
        const testContent = TextFragment.createFromString(
          data.toString() + ";"
        );

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          dummyClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);
        assert.ok(parsedFunctions[0] instanceof VirtualMemberFunction);
        assert.strictEqual(parsedFunctions[0].name, data.funcName());
        assert.strictEqual(parsedFunctions[0].returnVal, data.returnVal);
        assert.strictEqual(parsedFunctions[0].args, data.args);
      }
    );
  });

  describe("Pure virtual operators are parsed correctly", () => {
    callItAsync(
      "With '${value}'",
      pureVirtualOperatorData,
      async (data: OperatorData) => {
        const testContent = TextFragment.createFromString(
          data.toString() + ";"
        );

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          dummyClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);
        assert.ok(parsedFunctions[0] instanceof PureVirtualMemberFunction);
        assert.strictEqual(parsedFunctions[0].name, data.funcName());
        assert.strictEqual(parsedFunctions[0].returnVal, data.returnVal);
        assert.strictEqual(parsedFunctions[0].args, data.args);
      }
    );
  });
  describe("Const operators are parsed correctly", () => {
    callItAsync(
      "With '${value}'",
      constOperatorData,
      async (data: OperatorData) => {
        const testContent = TextFragment.createFromString(
          data.toString() + ";"
        );

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          dummyClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);
        const memberFunction = parsedFunctions[0] as MemberFunction;
        assert.strictEqual(memberFunction.name, data.funcName());
        assert.strictEqual(memberFunction.returnVal, data.returnVal);
        assert.strictEqual(memberFunction.args, data.args);
        assert.ok(memberFunction.isConst);
      }
    );
  });

  describe("Const virtual operators are parsed correctly", () => {
    callItAsync(
      "With '${value}'",
      constVirtualOperatorDataWithOverride,
      async (data: OperatorData) => {
        const testContent = TextFragment.createFromString(
          data.toString() + ";"
        );

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          dummyClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);
        assert.ok(parsedFunctions[0] instanceof VirtualMemberFunction);
        const memberFunction = parsedFunctions[0] as VirtualMemberFunction;
        assert.strictEqual(memberFunction.name, data.funcName());
        assert.strictEqual(memberFunction.returnVal, data.returnVal);
        assert.strictEqual(memberFunction.args, data.args);
        assert.ok(memberFunction.isConst);
      }
    );
  });

  describe("Const pure virtual operators are parsed correctly", () => {
    callItAsync(
      "With '${value}'",
      constPureVirtualOperatorData,
      async (data: OperatorData) => {
        const testContent = TextFragment.createFromString(
          data.toString() + ";"
        );

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          dummyClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);
        assert.ok(parsedFunctions[0] instanceof PureVirtualMemberFunction);
        const memberFunction = parsedFunctions[0] as PureVirtualMemberFunction;
        assert.strictEqual(memberFunction.name, data.funcName());
        assert.strictEqual(memberFunction.returnVal, data.returnVal);
        assert.strictEqual(memberFunction.args, data.args);
        assert.ok(memberFunction.isConst);
      }
    );
  });

  describe("(De)allocator operators are serialized correctly for source file", () => {
    callItAsync(
      "With '${value}'",
      allocatorOperatorData,
      async (data: OperatorData) => {
        const testContent = TextFragment.createFromString(
          data.toString() + ";"
        );

        let parsedFunctions = HeaderParser.parseClassMemberFunctions(
          testContent,
          dummyClassNameProvider
        );
        assert.strictEqual(parsedFunctions.length, 1);
        let expectedSerial =
          data.returnVal +
          " TestClass::" +
          data.funcName() +
          " (" +
          data.args +
          ") {\n";

        expectedSerial =
          expectedSerial +
          (data.returnVal !== "void"
            ? "\t" + data.returnVal + " returnValue;\n\treturn returnValue;\n}"
            : "}");
        const actualSerial = await parsedFunctions[0].serialize({
          mode: SerializableMode.source,
        });
        assert.strictEqual(expectedSerial, actualSerial);
      }
    );
  });

  //TODO create a fuzzing test out of this?
  test("Parsing multiple operators correctly", () => {
    const testContent = TextFragment.createFromString(
      `void* operator new(std::size_t s);
       operator int();`
    );

    let parsedFunctions = HeaderParser.parseClassMemberFunctions(
      testContent,
      dummyClassNameProvider
    );
    assert.strictEqual(parsedFunctions.length, 2);
    assert.strictEqual(parsedFunctions[0].name, "operator int");
    assert.strictEqual(parsedFunctions[0].returnVal, "");
    assert.strictEqual(parsedFunctions[0].args, "");
    assert.strictEqual(parsedFunctions[1].name, "operator new");
    assert.strictEqual(parsedFunctions[1].returnVal, "void*");
    assert.strictEqual(parsedFunctions[1].args, "std::size_t s");
  });
});

suite("SourceParser: Class Operator Declarations", () => {
  describe("Operators are parsed correctly", () => {
    callItAsync("With '${value}'", operatorData, async (data: OperatorData) => {
      const testContent = TextFragment.createFromString(data.toString() + "{}");

      let parsedFunctions = SourceParser.parseStandaloneFunctions(testContent);
      assert.strictEqual(parsedFunctions.length, 1);
      assert.strictEqual(parsedFunctions[0].name, data.funcName());
      assert.strictEqual(parsedFunctions[0].returnVal, data.returnVal);
      assert.strictEqual(parsedFunctions[0].args, data.args);
    });
  });

  describe("Operators with explicit namespace are parsed correctly", () => {
    callItAsync("With '${value}'", operatorData, async (data: OperatorData) => {
      const testContent = TextFragment.createFromString(
        data.toString("Namespace::TestClass::") + "{}"
      );

      let parsedFunctions = SourceParser.parseStandaloneFunctions(testContent);
      assert.strictEqual(parsedFunctions.length, 1);
      assert.strictEqual(
        parsedFunctions[0].name,
        "Namespace::TestClass::" + data.funcName()
      );
      assert.strictEqual(parsedFunctions[0].returnVal, data.returnVal);
      assert.strictEqual(parsedFunctions[0].args, data.args);
    });
  });
});
