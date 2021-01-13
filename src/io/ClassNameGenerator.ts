import {SerializableMode} from "./ISerial";

export class ClassNameGenerator {
    constructor(private readonly origName:string, private readonly isInterface:boolean) {
        
    }

    createName(mode:SerializableMode) {
        let createdName = "";

        switch (mode) {
            case SerializableMode.header:
            case SerializableMode.source:
                createdName = this.origName;
                break;
            case SerializableMode.implHeader:
            case SerializableMode.implSource:
                createdName = this.createImplName();
                break;
            case SerializableMode.interfaceHeader:
                createdName = this.createInterfaceName();
                break;
            default:
                break;
        }

        return createdName;
    }

    private createImplName() {
        if (!this.isInterface) {
            throw new Error("Cannot generate a name for an Implementation from a non interface class!");
        }
        
        // TODO naming conventions config
        if (this.origName.startsWith('I')) {
            return this.origName.substring(1);
        }
        else {
            return this.origName + "Impl";
        }
    }

    private createInterfaceName() {

        // TODO naming conventions config
        return  "I" + this.origName;
    }

}