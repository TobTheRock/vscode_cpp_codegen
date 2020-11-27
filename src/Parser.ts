import { INamespace } from "./cpptypes";
import { Namespace } from "./cpptypes/Namespace";


class NamespaceMatch {
    constructor(regexMatchArr:RegExpExecArray) {
        if (regexMatchArr.length-1 !== NamespaceMatch.NOF_GROUPMATCHES) {
            throw new Error("ParserError: Unexpected number of matches!");  
        }
        else if (regexMatchArr[1] === undefined) {
            throw new Error("ParserError: No namespace name, this should not happen!");               
        }

        this.nameMatch = regexMatchArr[1];

        this.namespaceMatch = (regexMatchArr[2]) ? regexMatchArr[2] : "";
        this.contentMatch = (regexMatchArr[3]) ? regexMatchArr[3] : "";
    }

    // static readonly REGEX_STR:string = 'namespace ([^\\s]*)\\s*{([\\s\\S]*namespace [^\\s]*\\s*{[\\s\\S]*})*((?!namespace)[\\s\\S]*)}';
    static readonly REGEX_STR:string = 'namespace ([^\\s]*)\\s*{([\\s\\S]*namespace [^\\s]*\\s*{[\\s\\S]*})*((?:(?!namespace)[\\s\\S])*)}';
    static readonly NOF_GROUPMATCHES = 3;
    nameMatch:string;
    namespaceMatch:string;
    contentMatch:string;
}

export abstract class Parser {

    static parseNamespaces(content:string) {
        
        const namespaceRegex = new RegExp(NamespaceMatch.REGEX_STR, 'g');
        let rawMatch;
        let namespaces:INamespace[] = [];

        if (!content) {
            return namespaces;
        }

        // TODO function for this
        while ((rawMatch = namespaceRegex.exec(content)) !== null) {
            if (rawMatch.index === namespaceRegex.lastIndex) {
                namespaceRegex.lastIndex++;
            }
            let match = new NamespaceMatch (rawMatch);

            //TODO avoid recursion?
            let subNamespaces:INamespace[] = Parser.parseNamespaces(match.namespaceMatch);
            let newNamespace =new Namespace(match.nameMatch, subNamespaces);
            try {
                newNamespace.deserialize(match.contentMatch);
                namespaces.push(newNamespace);
            } catch (error) {
                console.log(error, "Failed to parse namespace contents, skipping!");
            }
        }
        
        return namespaces;
    }
}