import * as vscode from "vscode";
import { TextBlock, TextRegexMatch } from "./Text";

function getConfigArray<T>(section: string): T[] {
    const config = vscode.workspace.getConfiguration();
    const value:T[]|undefined = config.get(section);
    if (value) {
        return value;
    } else {
        return [];
    }
} 
export module Configuration {
    export function getCppSourceFileHeader(): string {
        const lines:string[] = getConfigArray("codegen-cpp.cppSourceFileHeader");
        let header = "";
        for (const line of lines) {
            header += line + "\n";
        }
        return header;
    }

    export function getCppHeaderFileHeader(): string {
        const lines:string[] = getConfigArray("codegen-cpp.cppHeaderFileHeader");
        let header = "";
        for (const line of lines) {
            header += line + "\n";
        }
        return header;
    }

}