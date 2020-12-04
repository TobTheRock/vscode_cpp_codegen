import {SerializableMode} from "./ISerial";

class ClassnameGenerator {
    constructor(private readonly origName:string, initialMode:SerializableMode) {
        
    }

    createName(mode:SerializableMode) {
        let createdName = "";

        switch (mode) {
            case SerializableMode.Header:
            case SerializableMode.Source:
            case SerializableMode.ImplHeader:
            case SerializableMode.ImplSource:
            case SerializableMode.InterfaceHeader:
                break;
        
            default:
                break;
        }

        return createdName;
    }

}