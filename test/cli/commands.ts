// The commands of the command line, as the tests read them.

import type { Command } from "commander";
import { build } from "../../src/cli/main.ts";

/** Every command, by its path, in the order the help lists them: the entry page's, then each group's. */
export function commandOrder(): string[] {
  const walk = (c: Command, path: string[]): string[] =>
    c.commands.flatMap((x) => {
      const at = [...path, x.name()];
      return x.commands.length > 0 ? walk(x, at) : [at.join(" ")];
    });
  return walk(build(), []);
}
