import { IClass, IFunction, ISerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";


export class GeneralClass implements IClass {
    constructor(    
        public readonly name:string) {
        
    }


    deserialize (content: string) {
        //TODO Member functions etc
        let privateContent:string = Parser.parseClassPrivateScope(content);
        this.privateFunctions = Parser.parseClassMemberFunctions(privateContent);


    }


    serialize (mode:ISerializableMode) {
        let serial = "";

        return serial;
    }

    inheritance: string[] = []; // TODO
    publicFunctions:IFunction[] = [];
    privateFunctions:IFunction[] = [];
    nestedClasses: IClass[] = [];
    protectedFunctions:IFunction[] = [];
}