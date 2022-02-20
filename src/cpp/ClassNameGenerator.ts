import { intersection } from "lodash";
import * as io from "../io";
import { joinNameScopes } from "./utils";

export interface IClassNameGenerator {
  generate(
    nameInputProvider: io.INameInputProvider,
    ...modes: io.SerializableMode[]
  ): Promise<void>;
}
export class ClassNameGenerator implements io.IClassNameProvider {
  constructor(
    private readonly _origName: string,
    private readonly _applicableModes: io.SerializableMode[],
    private readonly _outerClassNameProvider?: io.IClassNameProvider
  ) {
    this._createdNames = new Map([
      [io.SerializableMode.header, _origName],
      [io.SerializableMode.source, _origName],
    ]);
  }

  getClassName(mode: io.SerializableMode, withOuterScope: boolean): string {
    const outerNameScope = withOuterScope
      ? this._outerClassNameProvider?.getClassName(mode, withOuterScope)
      : undefined;
    return joinNameScopes(outerNameScope, this.get(mode));
  }

  public get originalName(): string {
    return this._origName;
  }

  async generate(
    nameInputProvider: io.INameInputProvider,
    ...modes: io.SerializableMode[]
  ): Promise<void> {
    const filteredModes = intersection(this._applicableModes, modes);
    for (const mode of filteredModes) {
      switch (mode) {
        case io.SerializableMode.implHeader:
        case io.SerializableMode.implSource:
          await this.createImplName(nameInputProvider, mode);
        case io.SerializableMode.interfaceHeader:
          this.createInterfaceName();
        case io.SerializableMode.abstractFactoryHeader:
          await this.createAbstractFactoryName(nameInputProvider, mode);
        default:
      }
    }
  }

  get(mode: io.SerializableMode): string {
    let name = this._createdNames.get(mode);
    if (!name) {
      console.error(
        `Internal Error: Class name was not generated yet, returning default ${this._origName}!`
      );
      return this._origName;
    }
    return name;
  }

  has(mode: io.SerializableMode): boolean {
    return this._createdNames.has(mode);
  }

  private async createImplName(
    nameInputProvider: io.INameInputProvider,
    mode: io.SerializableMode
  ) {
    let implName = this._createdNames.get(mode);
    if (!implName) {
      implName = await nameInputProvider.getImplementationName(this._origName);
      this._createdNames.set(io.SerializableMode.implHeader, implName);
      this._createdNames.set(io.SerializableMode.implSource, implName);
    }
  }

  private createInterfaceName() {
    // TODO naming conventions config
    const name = "I" + this._origName;
    this._createdNames.set(io.SerializableMode.interfaceHeader, name);
  }

  private async createAbstractFactoryName(
    nameInputProvider: io.INameInputProvider,
    mode: io.SerializableMode
  ) {
    let abstractFactoryName = this._createdNames.get(mode);
    if (!abstractFactoryName) {
      abstractFactoryName = await nameInputProvider.getAbstractFactoryName(
        this._origName
      );
      this._createdNames.set(
        io.SerializableMode.abstractFactoryHeader,
        abstractFactoryName
      );
    }
  }

  private _createdNames: Map<io.SerializableMode, string>;
}
