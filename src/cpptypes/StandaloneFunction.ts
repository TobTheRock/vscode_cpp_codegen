import { IFunction } from "./TypeInterfaces";

export class StandaloneFunction implements IFunction {
    constructor(public readonly name:string, 
                public readonly returnVal:string, 
                public readonly args:string) {
    }

    readonly isConst: boolean = false;
    readonly isVirtual: boolean = false;
    serialize() {
        let serial =  this.returnVal + " (" + this.args + " ) {\n";
        if (this.returnVal !== "void")
        {
            serial = serial + this.returnVal + " returnValue;\n" + 
                     "return returnValue;";
        }
        serial = serial + "}";
        
        return serial;
    }
}