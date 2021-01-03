import { IClass, IFunction, SerializableMode } from "./TypeInterfaces";
import {Parser} from "../Parser";
import { ClassNameGenerator, TextFragment, TextScope } from "../io";

class ClassBase  extends TextScope implements IClass {
    constructor(
        scope:TextScope,
        public readonly name:string,
        public readonly inheritance:string[]) {
        super(scope.scopeStart, scope.scopeEnd)
;    }

    tryAddNestedClass(possibleNestedClass: IClass) {
        if (this.fullyContains(possibleNestedClass)) {
            this.nestedClasses.push(possibleNestedClass);
            return true;
        }
        return false;
    }

    deserialize (data: TextFragment) {
        
        this.nestedClasses = [];

        const privateContent:TextFragment = Parser.parseClassPrivateScope(data);
        this.privateFunctions = Parser.parseClassMemberFunctions(privateContent, this.classNameGen);

        const publicContent:TextFragment = Parser.parseClassPublicScope(data);
        this.publicFunctions = Parser.parseClassMemberFunctions(publicContent, this.classNameGen);

        const protectedContent:TextFragment = Parser.parseClassProtectedScope(data);
        this.protectedFunctions = Parser.parseClassMemberFunctions(protectedContent, this.classNameGen);
    }

    serialize (mode:SerializableMode) {
        return "";
    }

    protected classNameGen: ClassNameGenerator = new ClassNameGenerator(this.name, false);

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