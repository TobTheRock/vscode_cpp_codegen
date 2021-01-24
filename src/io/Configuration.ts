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
    export function getFileHeaderForCppSource(): string {
        const lines:string[] = getConfigArray("codegen-cpp.FileHeader.ForC++Source");
        let header = "";
        for (const line of lines) {
            header += line + "\n";
        }
        return header;
    }

    export function getFileHeaderForCppHeader(): string {
        const lines:string[] = getConfigArray("codegen-cpp.FileHeader.ForC++Header");
        let header = "";
        for (const line of lines) {
            header += line + "\n";
        }
        return header;
    }

    export function getDeduceFileNames(): boolean {
        const config = vscode.workspace.getConfiguration();
        const deduceFilenames: boolean| undefined =  config.get("codegen-cpp.deduceOutputFileNames");    
        if (deduceFilenames) {
            return deduceFilenames;
        } else {
            return false;
        }
    }
}