import * as io from "../io";
import { joinNameScopes } from "./utils";
export class ClassNameGenerator {
  constructor(private readonly _origName: string) {
    this._createdNames = new Map([
      [io.SerializableMode.header, _origName],
      [io.SerializableMode.source, _origName],
    ]);
  }

  async generate(options: io.SerializationOptions): Promise<string> {
    const createdName = this._createdNames.get(options.mode);
    if (createdName) {
      return createdName;
    }

    switch (options.mode) {
      case io.SerializableMode.implHeader:
      case io.SerializableMode.implSource:
        return await this.createImplName(options);
      case io.SerializableMode.interfaceHeader:
        return this.createInterfaceName();
      default:
        return ""; // TODO warning? throw?
    }
  }

  getClassNameProvider(
    outerClassNameProvider?: io.IClassNameProvider
  ): io.IClassNameProvider {
    return {
      originalName: this._origName,
      getClassName: (mode: io.SerializableMode, withOuterScope: boolean) => {
        const outerNameScope = withOuterScope
          ? outerClassNameProvider?.getClassName(mode, withOuterScope)
          : undefined;
        return joinNameScopes(outerNameScope, this._createdNames.get(mode));
      },
    };
  }

  private async createImplName(options: io.SerializationOptions) {
    let implName = this._createdNames.get(options.mode);
    if (!implName) {
      if (options.nameInputProvider?.getInterfaceName) {
        implName = await options.nameInputProvider.getInterfaceName(
          this._origName
        );
      }
      // TODO naming conventions config
      else if (this._origName.startsWith("I")) {
        implName = this._origName.substring(1);
      } else {
        implName = this._origName + "Impl";
      }
      this._createdNames.set(io.SerializableMode.implHeader, implName);
      this._createdNames.set(io.SerializableMode.implSource, implName);
    }

    return implName;
  }

  private createInterfaceName() {
    // TODO naming conventions config
    return "I" + this._origName;
  }

  private _createdNames: Map<io.SerializableMode, string>;
}
