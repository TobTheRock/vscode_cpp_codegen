import * as io from "../io";

export function joinRegexStringsWithFiller(
  strings: string[],
  filler: string
): string {
  let joinedStrings = "";
  for (let index = 0; index < strings.length - 1; index++) {
    joinedStrings += strings[index] + filler;
  }

  return joinedStrings + strings[strings.length - 1];
}

export function joinRegexStringsWithWhiteSpace(...strings: string[]): string {
  return joinRegexStringsWithFiller(strings, "\\s*");
}

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

export function joinNameScopes(...nameScopes: (string | undefined)[]) {
  return nameScopes.filter((nameScope) => nameScope?.length).join("::");
}

export function joinNameScopesWithFunctionName(
  nameScopes: string[] | undefined,
  functionName: string
): string {
  if (nameScopes) {
    return [...nameScopes, functionName].join("::");
  }
  return functionName;
}

export function joinNameScopesWithMemberFunctionName(
  nameScopes: string[] | undefined,
  className: string,
  functionName: string
): string {
  nameScopes = nameScopes ?? [];
  return [...nameScopes, className, functionName].join("::");
}

export class EmptySerializer implements io.ISerializable {
  serialize(options: io.SerializationOptions): io.Text {
    return io.Text.createEmpty(options.indentStep);
  }
}
