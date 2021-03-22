import * as io from "../io";

export function removeDefaultInitializersFromArgs(args: string): string {
  const defaultArgumentRegex = "\\s*=(?:(?!,)[\\s\\S])+";
  const regexMatcherCurlyBracket = new io.RemovingRegexWithBodyMatcher(
    defaultArgumentRegex
  );
  const regexMatcherBracket = new io.RemovingRegexWithBodyMatcher(
    defaultArgumentRegex,
    undefined,
    "(",
    ")"
  );
  const regexMatcher = new io.RemovingRegexMatcher(defaultArgumentRegex);
  const tempFragment = io.TextFragment.createFromString(args);
  regexMatcherCurlyBracket.match(tempFragment);
  regexMatcherBracket.match(tempFragment);
  regexMatcher.match(tempFragment);
  return tempFragment.toString();
}

export function joinNameScopes(...nameScopes: (string | undefined)[]): string {
  return nameScopes.reduce((acc: string, nameScope) => {
    if (!nameScope?.length) {
      return acc;
    }
    if (!acc.length) {
      return nameScope;
    }
    return acc + "::" + nameScope;
  }, "");
}
