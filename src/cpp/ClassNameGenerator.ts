import * as io from "../io";
export class ClassNameGenerator {
  constructor(private readonly _origName: string) {}

  async createName(options: io.SerializationOptions): Promise<string> {
    let createdName = "";

    switch (options.mode) {
      case io.SerializableMode.header:
      case io.SerializableMode.source:
        createdName = this._origName;
        break;
      case io.SerializableMode.implHeader:
      case io.SerializableMode.implSource:
        createdName = await this.createImplName(options);
        break;
      case io.SerializableMode.interfaceHeader:
        createdName = this.createInterfaceName();
        break;
      default:
        break;
    }

    return createdName;
  }

  private async createImplName(options: io.SerializationOptions) {
    if (!this._implName.length) {
      if (options.nameInputProvider?.getInterfaceName) {
        this._implName = await options.nameInputProvider.getInterfaceName(
          this._origName
        );
      }
      // TODO naming conventions config
      else if (this._origName.startsWith("I")) {
        this._implName = this._origName.substring(1);
      } else {
        this._implName = this._origName + "Impl";
      }
    }

    return this._implName;
  }

  private createInterfaceName() {
    // TODO naming conventions config
    return "I" + this._origName;
  }

  private _implName = "";
}
