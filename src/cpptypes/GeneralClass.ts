import { IClass, IFunction, ISerializableMode } from "./TypeInterfaces";


export class GeneralClass implements IClass {
    constructor(    
        public readonly name:string) {
        
    }


    deserialize (content: string) {
        //TODO Member functions etc
    }


    serialize (mode:ISerializableMode) {
        let serial = "";

        return serial;
    }

    readonly inheritance: string[] = []; // TODO
    readonly publicFunctions:IFunction[] = [];
    readonly privateFunctions:IFunction[] = [];
    readonly nestedClasses: IClass[] = [];
    readonly protectedFunctions:IFunction[] = [];
}