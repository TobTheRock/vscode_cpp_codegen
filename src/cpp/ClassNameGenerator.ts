import * as io from "../io"

export class ClassNameGenerator {
    constructor(private readonly _origName: string,
                private readonly _isInterface: boolean,
                private readonly _nameInputProvider: io.INameInputProvider = {}) {
    }

 createName(mode:io.SerializableMode) {
        let createdName = "";

        switch (mode) {
            case io.SerializableMode.header:
            case io.SerializableMode.source:
                createdName = this._origName;
                break;
            case io.SerializableMode.implHeader:
            case io.SerializableMode.implSource:
                createdName = this.createImplName();
                break;
            case io.SerializableMode.interfaceHeader:
                createdName = this.createInterfaceName();
                break;
            default:
                break;
        }

        return createdName;
    }

    private createImplName() {
        if (!this._isInterface) {
            throw new Error("Cannot generate a name for an Implementation from a non interface class!");
        }

        if (!this._implName.length) {
            if (this._isInterface && this._nameInputProvider.getInterfaceName) {
                this._implName = this._nameInputProvider.getInterfaceName(this._origName);
            }
            // TODO naming conventions config
            else if (this._origName.startsWith('I')) {
                this._implName = this._origName.substring(1);
            }
            else {
                this._implName = this._origName + "Impl";
            }    
        }
        
        return this._implName;
    }

    private createInterfaceName() {

        // TODO naming conventions config
        return  "I" + this._origName;
    }

    private _implName = "";

}