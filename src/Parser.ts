import { Namespace } from "./cpptypes/Namespace";
export abstract class Parser {

    static parseNameSpaces(fileContent:string)
    {
        let singleNameSpaceRegex = RegExp('namespace ([^\s]*)\s*{(?:[\s\S]*namespace ([^\s]*)\s*{)*((?!namespace)[\s\S])*}');
        // TODO resolve nested namepaces

    }
}