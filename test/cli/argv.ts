// The tests state a call by its parts, noun and verb and file; this puts them in the form a caller types.

import { NOUNS, surfaceName } from "../../src/cli/surface.ts";

const FILE_COMMANDS = ["new", "apply", "try", "show", "diff", "check", "render", "view"];

/** `node add a.yaml x` as `-f a.yaml node --add x`. */
export function typed(args: readonly string[]): string[] {
  const [first, second, third, ...rest] = args;
  if (first === undefined) return [];
  if (NOUNS.includes(first) && second !== undefined && !second.startsWith("-")) {
    const verb = surfaceName(`${first} ${second}`).split(" ")[1] as string;
    if (third === undefined || third.startsWith("-")) {
      return [first, verb, ...(third === undefined ? [] : [third]), ...rest];
    }
    return ["-f", third, first, verb, ...rest];
  }
  if (FILE_COMMANDS.includes(first) && second !== undefined && !second.startsWith("-")) {
    return ["-f", second, first, ...(third === undefined ? [] : [third]), ...rest];
  }
  return [...args];
}
