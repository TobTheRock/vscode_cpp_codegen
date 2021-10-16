import * as cpp from "./cpp";
import * as io from "./io";
import * as vscode from "vscode";
import { differenceWith } from "lodash";

export interface FileMergerOptions {
  disableRemoving?: boolean;
  skipConfirmRemoving?: boolean;
  skipConfirmAdding?: boolean;
}

export interface IFileMerger {
  merge(): void;
}
