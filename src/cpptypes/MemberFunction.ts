import { IFunction,  SerializableMode} from "./TypeInterfaces";

export class MemberFunction implements IFunction {
    constructor(public readonly name:string, 
                public readonly returnVal:string, 
                public readonly args:string,       
                public readonly isConst: boolean
                ) {}

    serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            //TODO for source we need the class scope?!
            case SerializableMode.Source:
                serial = this.getHeading() + " {\n";
                if (this.returnVal !== "void") {
                    serial = serial + this.returnVal + " returnValue;\n return returnValue;\n";
                }
                serial += "}";
                break;
            
            case SerializableMode.Header:
                serial = this.getHeading() + ";";
                break;

            default:
                break;
        }
    
        return serial;
    }


    protected getHeading() {
        return this.returnVal + " " + this.name + " (" + this.args + " )" + (this.isConst? " const" : "");
    }
}

export class VirtualMemberFunction extends MemberFunction {
    constructor(name:string, 
                returnVal:string, 
                args:string,       
                isConst: boolean) {
                   super(name,returnVal,args,isConst);
                }

    serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            
            case SerializableMode.InterfaceHeader:
                serial = "virtual " + super.getHeading() + " =0;";
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
                isConst: boolean) {
                    super(name,returnVal,args,isConst);
                }

    serialize(mode:SerializableMode) {
        let serial = "";
        
        switch (mode) {
            
            case SerializableMode.InterfaceHeader:
                serial = "virtual " + super.getHeading() + " =0;";
                break;

            case SerializableMode.ImplHeader:
                serial = super.getHeading() + " override;";
                break;

            case SerializableMode.ImplSource:
                serial =  super.serialize(SerializableMode.Source);
                break;

            default:
                serial = super.serialize(mode);
                break;
        }
    
        return serial;
    }

}



//TODO STATIC