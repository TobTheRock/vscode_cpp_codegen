import { throws } from "assert";

// TODO utils
function error(condition: boolean, errMsg: string = "") {
  if (!condition) {
    throw new Error(errMsg);
  }
}

export class TextScope {
  constructor(
    public readonly scopeStart: number,
    public readonly scopeEnd: number
  ) {
    error(scopeStart <= scopeEnd, "scopeEnd must be greater than scopeStart");
    error(scopeStart >= 0, "Scope start muss be greater zero!");
    error(scopeEnd >= 0, "Scope end muss be greater zero!");
  }

  static createEmpty() {
    return new TextScope(0, 0);
  }

  fullyContains(other: TextScope): boolean {
    return (
      this.scopeStart <= other.scopeStart && this.scopeEnd >= other.scopeEnd
    );
  }

  contains(other: TextScope): boolean {
    return this.containsAtStart(other) && this.containsAtEnd(other);
  }

  containsAtStart(other: TextScope): boolean {
    return other.scopeEnd >= this.scopeStart;
  }

  containsAtEnd(other: TextScope): boolean {
    return other.scopeStart <= this.scopeEnd;
  }

  static merge(...scopes: TextScope[]): TextScope[] {
    if (scopes.length <= 1) {
      return scopes;
    }

    const mergedScopes: TextScope[] = [];
    scopes = scopes.sort((a, b) => {
      return a.scopeStart - b.scopeStart;
    });

    for (let index = 1; index < scopes.length; index++) {
      const scope = scopes[index - 1];
      const nextScope = scopes[index];

      if (scope.contains(nextScope)) {
        mergedScopes.push(new TextScope(scope.scopeStart, nextScope.scopeEnd));
      } else {
        mergedScopes.push(scope);
        if (index === scopes.length - 1) {
          mergedScopes.push(nextScope);
        }
      }
    }
    return mergedScopes;
  }
}

export class TextBlock extends TextScope {
  public readonly content: string;
  constructor(content: string, scopeOffset: number = 0) {
    error(content.length > 0, "Content is empty");
    super(scopeOffset, scopeOffset + content.length - 1);
    this.content = content;
  }

  private trySliceContent(start: number, end: number): TextBlock[] {
    if (start > this.scopeEnd) {
      return [];
    }
    const splittedBlocks: TextBlock[] = [];
    let startRel = start - this.scopeStart;
    startRel = startRel < 0 ? 0 : startRel;
    let endRel = end - this.scopeStart;
    endRel = endRel < 0 ? 0 : endRel;
    if (endRel > startRel) {
      let slicedContent = this.content.slice(startRel, endRel);
      if (slicedContent.length) {
        splittedBlocks.push(
          new TextBlock(slicedContent, this.scopeStart + startRel)
        );
      }
    }
    return splittedBlocks;
  }

  splice(...scopes: TextScope[]): TextBlock[] {
    if (!scopes.length) {
      return [this];
    }

    scopes = TextScope.merge(...scopes);

    let lastStart = this.scopeStart;
    const splittedBlocks: TextBlock[] = [];
    for (let index = 0; index < scopes.length; index++) {
      const scope = scopes[index];

      if (
        scope.scopeStart === this.scopeStart &&
        scope.scopeEnd === this.scopeEnd
      ) {
        return [];
      }

      splittedBlocks.push(...this.trySliceContent(lastStart, scope.scopeStart));
      lastStart = scope.scopeEnd + 1;
    }
    splittedBlocks.push(...this.trySliceContent(lastStart, this.scopeEnd + 1));

    return splittedBlocks;
  }

  slice(...scopes: TextScope[]): TextBlock[] {
    if (!scopes.length) {
      return [this];
    }
    scopes = TextScope.merge(...scopes);

    const splittedBlocks: TextBlock[] = [];
    scopes.forEach((scope) => {
      splittedBlocks.push(
        ...this.trySliceContent(scope.scopeStart, scope.scopeEnd + 1)
      );
    });

    return splittedBlocks;
  }

  clone(): TextBlock {
    return new TextBlock(this.content.slice(), this.scopeStart);
  }
}
export class TextFragment {
  readonly blocks: TextBlock[] = [];

  static createFromString(content: string = ""): TextFragment {
    const blocks: TextBlock[] = [];
    if (content.length) {
      blocks.push(new TextBlock(content));
    }
    return new TextFragment(blocks);
  }

  static createFromTextBlock(
    ...blocks: (TextBlock | undefined)[]
  ): TextFragment {
    const definedBlocks: TextBlock[] = [];

    blocks.forEach((block) => {
      if (block) {
        definedBlocks.push(block);
      }
    });

    return new TextFragment(definedBlocks);
  }

  static createEmpty(): TextFragment {
    return new TextFragment();
  }

  private constructor(blocks: TextBlock[] = []) {
    this.blocks = blocks;
  }

  clone(): TextFragment {
    const newFragment = new TextFragment();
    this.blocks.forEach((block) => {
      newFragment.blocks.push(block.clone());
    });
    return newFragment;
  }

  push(...blocks: TextBlock[]): void {
    this.blocks.push(...blocks);
  }

  reset(): void {
    this.blocks.length = 0;
  }

  remove(...scopes: TextScope[]): void {
    for (let index = this.blocks.length - 1; index >= 0; index--) {
      const block = this.blocks[index];
      const splicedBlocks = block.splice(...scopes);
      this.blocks.splice(index, 1, ...splicedBlocks);
    }
  }

  slice(scope: TextScope): TextFragment {
    const textFragment = TextFragment.createEmpty();
    this.blocks.forEach((block) => {
      textFragment.push(...block.slice(scope));
    });

    return textFragment;
  }

  isEmpty() {
    return !this.blocks.length;
  }

  toString() {
    let content = "";
    this.blocks.forEach((block) => (content += block.content));
    return content;
  }

  getScopeStart() {
    return Math.min(...Array.from(this.blocks, (block) => block.scopeStart));
  }

  getScopeEnd() {
    return Math.max(...Array.from(this.blocks, (block) => block.scopeEnd));
  }
}
