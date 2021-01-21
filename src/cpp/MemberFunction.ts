import { IFunction,  SerializableMode} from "./TypeInterfaces";
import { ClassNameGenerator } from "./ClassNameGenerator";

export class MemberFunction implements IFunction {
    constructor(public readonly name:string, 
                public readonly returnVal:string, 
                public readonly args:string,       
                public readonly isConst: boolean,
                private readonly classNameGen:ClassNameGenerator
                ) {}

    async serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            case SerializableMode.source:
                serial = await this.getHeading(mode) + " {\n";
                if (this.returnVal !== "void") {
                    serial += "\t" + this.returnVal + " returnValue;\n\treturn returnValue;\n";
                }
                serial += "}";
                break;
            
            case SerializableMode.header:
                serial = await this.getHeading(mode) + ";";
                break;

            default:
                break;
        }
    
        return serial;
    }


    protected async getHeading(mode:SerializableMode) {

        switch (mode) {
            case SerializableMode.header:
            case SerializableMode.implHeader:
            case SerializableMode.interfaceHeader:
                return this.returnVal + " " + this.name + " (" + this.args + ")" + (this.isConst? " const" : "");
            case SerializableMode.source:
            case SerializableMode.implSource:
                return this.returnVal + " " + await this.classNameGen.createName(mode) + "::" + this.name + " (" + this.args + ")" + (this.isConst? " const" : "");
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

    async serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            case SerializableMode.header:
                serial = await super.getHeading(mode) + " override;";
                break;
            
            case SerializableMode.interfaceHeader:
                serial = "virtual " + await super.getHeading(mode) + " =0;";
                break;

            default:
                serial = await super.serialize(mode);
                break;
        }
    
        return serial;
    }

}
export class StaticMemberFunction extends MemberFunction {
    constructor(name:string, 
                returnVal:string, 
                args:string,       
                isConst: boolean,
                classNameGen:ClassNameGenerator) {
                   super(name,returnVal,args,isConst, classNameGen);
                }

    async serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            case SerializableMode.source:
                serial = await this.getHeading(mode) + " {\n";
                if (this.returnVal !== "void") {
                    serial += "\t" + this.returnVal + " returnValue;\n\treturn returnValue;\n";
                }
                serial += "}";
                break;
            
            case SerializableMode.header:
                serial = "static " + await this.getHeading(mode) + ";";
                break;

            default:
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

    async serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            case SerializableMode.header:
                serial = "virtual " + await super.getHeading(mode) + " =0;";
                break;

            case SerializableMode.implHeader:
                serial = await super.getHeading(mode) + " override;";
                break;

            case SerializableMode.implSource:                
                serial = await this.getHeading(mode) + " {\n";
                if (this.returnVal !== "void") {
                    serial += "\t" + this.returnVal + " returnValue;\n\treturn returnValue;\n";
                }
                serial += "}";
                break;

            case SerializableMode.interfaceHeader:
            case SerializableMode.source:
            default:
                serial = "";
                break;
        }
    
        return serial;
    }

}



//TODO STATIC