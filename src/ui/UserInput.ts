export const USER_INPUT_TITLE = "Creating Stubs...";

export interface UserInputPrompt {
  prompt(step: number, nTotalSteps: number): Promise<void>;
}

export interface UserInputReturn<ReturnType> {
  resolve: (value: ReturnType | PromiseLike<ReturnType>) => void;
}

class UserInputGeneric<ReturnType> {
  private _inputPrompts: UserInputPrompt[] = [];

  registerElement(
    elementType: new (
      UserInputReturn: UserInputReturn<ReturnType>,
      ...args: any
    ) => UserInputPrompt,
    ...args: any
  ): Promise<ReturnType> {
    return new Promise<ReturnType>((resolve) => {
      const element = new elementType({ resolve }, ...args);
      this._inputPrompts.push(element);
    });
  }

  async prompt(): Promise<void> {
    const nTotalSteps = this._inputPrompts.length;
    for (let index = 0; index < this._inputPrompts.length; index++) {
      const input = this._inputPrompts[index];
      await input.prompt(index + 1, nTotalSteps);
    }

    this._inputPrompts = [];
  }
}

export class UserInput extends UserInputGeneric<any> {}
