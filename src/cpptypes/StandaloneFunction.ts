import { IFunction, ISerializableMode } from "./TypeInterfaces";

export class StandaloneFunction implements IFunction {
    constructor(public readonly name:string, 
                public readonly returnVal:string, 
                public readonly args:string) {
    }

    serialize(mode:ISerializableMode) {
        let serial = "";
        
        switch (mode) {
            case ISerializableMode.Source:
                serial = this.getHeading() + " {\n";
                if (this.returnVal !== "void") {
                    serial = serial + this.returnVal + " returnValue;\n return returnValue;\n";
                }
                serial += "}";
                break;
            
            case ISerializableMode.InterfaceHeader:
            case ISerializableMode.ImplHeader:
                serial = this.getHeading() + ";";
                break;

            default:
                break;
        }
    
        return serial;
    }

    readonly isConst: boolean = false;
    readonly isVirtual: boolean = false;

    private getHeading() {
        return this.returnVal + " " + this.name + " (" + this.args + " )";
    }
}