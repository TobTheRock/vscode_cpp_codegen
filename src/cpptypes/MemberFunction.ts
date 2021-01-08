import { IFunction,  SerializableMode} from "./TypeInterfaces";
import { ClassNameGenerator } from "../io";

export class MemberFunction implements IFunction {
    constructor(public readonly name:string, 
                public readonly returnVal:string, 
                public readonly args:string,       
                public readonly isConst: boolean,
                private readonly classNameGen:ClassNameGenerator
                ) {}

    serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            //TODO for source we need the class scope?!
            case SerializableMode.Source:
                serial = this.getHeading(mode) + " {\n";
                if (this.returnVal !== "void") {
                    serial = serial + this.returnVal + " returnValue;\n return returnValue;\n";
                }
                serial += "}";
                break;
            
            case SerializableMode.Header:
                serial = this.getHeading(mode) + ";";
                break;

            default:
                break;
        }
    
        return serial;
    }


    protected getHeading(mode:SerializableMode) {

        switch (mode) {
            case SerializableMode.Header:
            case SerializableMode.ImplHeader:
            case SerializableMode.InterfaceHeader:
                return this.returnVal + " " + this.name + " (" + this.args + ")" + (this.isConst? " const" : "");
            case SerializableMode.Source:
            case SerializableMode.ImplSource:
                return this.returnVal + " " + this.classNameGen.createName(mode) + "::" + this.name + " (" + this.args + ")" + (this.isConst? " const" : "");
            default:
                break;
        }

    }

    protected getHeaderSignature() {
    }
}

export class VirtualMemberFunction extends MemberFunction {
    constructor(name:string, 
                returnVal:string, 
                args:string,       
                isConst: boolean,
                classNameGen:ClassNameGenerator) {
                   super(name,returnVal,args,isConst, classNameGen);
                }

    serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            case SerializableMode.Header:
                serial = super.getHeading(mode) + " override;";
                break;
            
            case SerializableMode.InterfaceHeader:
                serial = "virtual " + super.getHeading(mode) + " =0;";
                break;

            default:
                serial = super.serialize(mode);
                break;
        }
    
        return serial;
    }

}

export class PureVirtualMemberFunction  extends MemberFunction{
    constructor(name:string, 
                returnVal:string, 
                args:string,       
                isConst: boolean,
                classNameGen:ClassNameGenerator) {
                    super(name,returnVal,args,isConst,classNameGen);
                }

    serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            case SerializableMode.Header:
                serial = "virtual " + super.getHeading(mode) + " =0;";
                break;

            case SerializableMode.ImplHeader:
                serial = super.getHeading(mode) + " override;";
                break;

            case SerializableMode.ImplSource:                
                serial = this.getHeading(mode) + " {\n";
                if (this.returnVal !== "void") {
                    serial = serial + this.returnVal + " returnValue;\n return returnValue;\n";
                }
                serial += "}";
                break;

            case SerializableMode.InterfaceHeader:
            case SerializableMode.Source:
            default:
                serial = "";
                break;
        }
    
        return serial;
    }

}



//TODO STATIC