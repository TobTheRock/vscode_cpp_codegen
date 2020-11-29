import { IFunction, ISerializableMode } from "./TypeInterfaces";

export class MemberFunction implements IFunction {
    constructor(public readonly name:string, 
                public readonly returnVal:string, 
                public readonly args:string,       
                public readonly isConst: boolean,
                public readonly isVirtual: boolean,
                public readonly isPure: boolean
                ) {

        if (!(this.isPure && this.isVirtual)) {
            throw new Error("Function is pure, but not virtual!");               
        }
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


    private getHeading() {
        return this.returnVal + " " + this.name + " (" + this.args + " )";
    }

}