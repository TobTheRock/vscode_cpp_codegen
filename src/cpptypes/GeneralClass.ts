import { IClass, IFunction, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import { ClassNameGenerator } from "../io";


export class GeneralClass implements IClass {
    constructor(    
        public readonly name:string) {
        
    }


    deserialize (content: string) {
        //TODO Member functions etc
        const classNameGen:ClassNameGenerator = new ClassNameGenerator(this.name, false); // TODO interface handling!
        let privateContent:string = Parser.parseClassPrivateScope(content);
        this.privateFunctions = Parser.parseClassMemberFunctions(privateContent, classNameGen);


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