import { IClass, IFunction, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import { ClassNameGenerator } from "../io";


export class GeneralClass implements IClass {
    constructor(    
        public readonly name:string) {
        
    }


    deserialize (content: string) {
        const classNameGen: ClassNameGenerator = new ClassNameGenerator(this.name, false); // TODO interface handling!
        
        this.nestedClasses = this.nestedClasses.concat(Parser.parseGeneralClasses(content));

        const privateContent:string = Parser.parseClassPrivateScope(content);
        this.privateFunctions = Parser.parseClassMemberFunctions(privateContent, classNameGen);

        const publicContent:string = Parser.parseClassPublicScope(content);
        this.publicFunctions = Parser.parseClassMemberFunctions(publicContent, classNameGen);

        const protectedContent:string = Parser.parseClassProtectedScope(content);
        this.protectedFunctions = Parser.parseClassMemberFunctions(protectedContent, classNameGen);
    }


    serialize (mode:SerializableMode) {
        let serial = "";

        return serial;
    }

    inheritance: string[] = []; // TODO
    publicFunctions:IFunction[] = [];
    privateFunctions:IFunction[] = [];
    nestedClasses: IClass[] = [];
    protectedFunctions:IFunction[] = [];
}