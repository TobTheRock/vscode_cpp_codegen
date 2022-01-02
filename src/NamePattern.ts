import { Configuration, IExtensionConfiguration } from "./Configuration";

export class NamePattern {
  static readonly namePlaceHolder = "${name}";
  constructor(private readonly _configuration: IExtensionConfiguration) {}

  deduceImplementationName(interfaceName: string): string | null {
    const nameRegexString = `^${this._configuration.interface.namePattern.replace(
      NamePattern.namePlaceHolder,
      "(\\S*)"
    )}$`;

    const matches = interfaceName.match(nameRegexString) ?? [];
    const match = matches[1];
    if (!match || match.length === 0) {
      return null;
    }

    return match;
  }

  getInterfaceName(implementationName: string): string {
    return this._configuration.interface.namePattern.replace(
      NamePattern.namePlaceHolder,
      implementationName
    );
  }
}
