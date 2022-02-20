import * as assert from "assert";
import { expect } from "chai";
import { IExtensionConfiguration } from "../../Configuration";
import { NamePattern } from "../../NamePattern";

suite("Name patterns test", () => {
  const prefix = "I";
  const suffix = "Bla";
  const namePattern = new NamePattern({
    interface: { namePattern: prefix + NamePattern.namePlaceHolder + suffix },
  } as IExtensionConfiguration);

  test("get interface name from implementation name", () => {
    const implName = "ClassName";
    const expectedInterfaceName = prefix + implName + suffix;
    assert.strictEqual(
      expectedInterfaceName,
      namePattern.getInterfaceName(implName)
    );
  });

  test("deduce implementation name from interface name", () => {
    const expectedImplName = "ClassName";
    const interfaceName = `${prefix}${expectedImplName}${suffix}`;
    assert.strictEqual(
      expectedImplName,
      namePattern.deduceImplementationName(interfaceName)
    );
  });

  test("deduce implementation name from interface name, only prefix", () => {
    const namePattern = new NamePattern({
      interface: { namePattern: prefix + NamePattern.namePlaceHolder },
    } as IExtensionConfiguration);
    const expectedImplName = "ClassName";
    const interfaceName = `${prefix}${expectedImplName}`;
    assert.strictEqual(
      expectedImplName,
      namePattern.deduceImplementationName(interfaceName)
    );
  });

  test("deduce implementation name from interface name, only suffix", () => {
    const namePattern = new NamePattern({
      interface: { namePattern: NamePattern.namePlaceHolder + suffix },
    } as IExtensionConfiguration);
    const expectedImplName = "ClassName";
    const interfaceName = `${expectedImplName}${suffix}`;
    assert.strictEqual(
      expectedImplName,
      namePattern.deduceImplementationName(interfaceName)
    );
  });

  test("return if not able to deduce implementation", () => {
    const interfaceName = "InvalidClassName";
    assert.strictEqual(
      null,
      namePattern.deduceImplementationName(interfaceName)
    );
  });
});
