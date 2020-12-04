import { IFunction, SerializableMode } from "./TypeInterfaces";

export class StandaloneFunction implements IFunction {
    constructor(public readonly name:string, 
                public readonly returnVal:string, 
                public readonly args:string) {
    }

    serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            case SerializableMode.Source:
                serial = this.getHeading() + " {\n";
                if (this.returnVal !== "void") {
                    serial = serial + this.returnVal + " returnValue;\n return returnValue;\n";
                }
                serial += "}";
                break;
            
            case SerializableMode.InterfaceHeader:
            case SerializableMode.ImplHeader:
                serial = this.getHeading() + ";";
                break;

            default:
                break;
        }
    
        return serial;
    }

    private getHeading() {
        return this.returnVal + " " + this.name + " (" + this.args + " )";
    }
}