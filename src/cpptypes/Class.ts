import { IClass, IFunction, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import { ClassNameGenerator } from "../io";

class ClassBase implements IClass {
    constructor(    
        public readonly name:string) {
        
    }

    deserialize (content: string) {
        
        this.nestedClasses = this.nestedClasses.concat(Parser.parseClasses(content));

        const privateContent:string = Parser.parseClassPrivateScope(content);
        this.privateFunctions = Parser.parseClassMemberFunctions(privateContent, this.classNameGen);

        const publicContent:string = Parser.parseClassPublicScope(content);
        this.publicFunctions = Parser.parseClassMemberFunctions(publicContent, this.classNameGen);

        const protectedContent:string = Parser.parseClassProtectedScope(content);
        this.protectedFunctions = Parser.parseClassMemberFunctions(protectedContent, this.classNameGen);
    }

    serialize (mode:SerializableMode) {
        return "";
    }

    protected classNameGen: ClassNameGenerator = new ClassNameGenerator(this.name, false);

    inheritance: string[] = []; // TODO
    publicFunctions:IFunction[] = [];
    privateFunctions:IFunction[] = [];
    nestedClasses: IClass[] = [];
    protectedFunctions:IFunction[] = [];
}

export class ClassImpl extends ClassBase {
    //TODO
    serialize (mode:SerializableMode) {
        return "";
    }
} 

export class ClassInterface extends ClassBase {
    //TODO
    serialize (mode:SerializableMode) {
        return "";
    }

    protected classNameGen: ClassNameGenerator = new ClassNameGenerator(this.name, true);
} 