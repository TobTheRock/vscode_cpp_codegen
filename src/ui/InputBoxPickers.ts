import {
  UserInputPrompt,
  UserInputReturn,
  USER_INPUT_TITLE,
} from "./UserInput";
import * as vscode from "vscode";

interface InputBoxParameters {
  value?: string;
  step: number;
  nTotalSteps: number;
  prompt?: string;
  placeHolder?: string;
  abortMessage?: string;
}

async function showInputBox(params: InputBoxParameters): Promise<string> {
  const disposables: vscode.Disposable[] = [];
  try {
    return await new Promise<string>((displayResolve, displayReject) => {
      const input = vscode.window.createInputBox();
      input.title = USER_INPUT_TITLE;
      input.step = params.step;
      input.totalSteps = params.nTotalSteps;
      input.value = params.value || "";
      input.prompt = params.prompt;
      input.placeholder = params.placeHolder;
      disposables.push(
        input.onDidAccept(() => {
          const value = input.value;
          if (value) {
            displayResolve(value);
          } else {
            displayReject(new Error(params.abortMessage));
          }
          input.hide();
        }),
        input.onDidHide(() => {
          displayReject(new Error(params.abortMessage));
          input.dispose();
        })
      );
      input.show();
    });
  } finally {
    disposables.forEach((d) => d.dispose());
  }
}

export class InterfaceNamePicker implements UserInputPrompt {
  constructor(
    private readonly _userInputReturn: UserInputReturn<string>,
    private readonly _originalName: string,
    private readonly _nameSuggestion?: string
  ) {}

  async prompt(step: number, nTotalSteps: number): Promise<void> {
    let input = await showInputBox({
      step,
      nTotalSteps,
      prompt: `Enter name for implementation of interface ${this._originalName}`,
      placeHolder: this._nameSuggestion ?? this._originalName + "Impl",
      abortMessage: `No name was provided for interface ${this._originalName}`,
      value: this._nameSuggestion,
    });

    this._userInputReturn.resolve(input);
  }
}

export class FileNamePicker implements UserInputPrompt {
  constructor(
    private readonly _userInputReturn: UserInputReturn<string>,
    private readonly _fileName: string
  ) {}

  async prompt(step: number, nTotalSteps: number): Promise<void> {
    let input = await showInputBox({
      step,
      nTotalSteps,
      prompt: `File base name of generated file(s):`,
      placeHolder: this._fileName,
      abortMessage: `No name was provided for file ${this._fileName}`,
    });

    if (!input?.length) {
      const msg = `No name was provided for file ${this._fileName}`;
      throw new Error(msg);
    }

    this._userInputReturn.resolve(input);
  }
}
