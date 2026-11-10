// The command line a caller meets (specs/decisions, "A command names its file with a flag", "A command's verb is a
// flag", "One name for each thing, and a name says what it is"): `grafical -f <file> edge --look <id>`. Inside, each
// verb stays a subcommand of its noun that takes the file first, so that commander parses its arguments, options and
// help. This file turns the words one way on the way in and the text the other way on the way out.

/** The nouns that hold verbs. */
export const NOUNS = [
  "diagram",
  "layer",
  "node",
  "edge",
  "group",
  "lane",
  "column",
  "wall",
  "note",
  "label",
  "mark",
  "legend",
  "type",
  "style",
];

/** The commands of a file with no noun. */
export const FILE_COMMANDS = ["show", "diff", "check", "render", "view"];

/** A command's name as a caller writes it: `node move` is `node --move`, and one word stays one word. */
export function surfaceName(name: string): string {
  const [noun, verb] = name.split(" ");
  return noun !== undefined && verb !== undefined && NOUNS.includes(noun)
    ? `${noun} --${verb}`
    : name;
}

/** What a call needs and did not give. */
export interface Unread {
  field: string;
  found?: string;
  /** The command a caller meant, when the verb exists in the old form. */
  likely?: string;
}

const isHelp = (w: string | undefined) => w === "-h" || w === "--help";

/**
 * The words as the parser reads them: the file after the verb, the verb a subcommand. A call's first flag after its
 * noun is its verb, so `edge --weight a --weight 2` has one verb and one value.
 */
export function inward(args: readonly string[]): string[] | Unread {
  const words = [...args];
  let file: string | undefined;
  const at = words.findIndex((w) => w === "-f" || w === "--file");
  if (at >= 0) {
    file = words[at + 1];
    if (file === undefined) return { field: "--file" };
    words.splice(at, 2);
  }
  const [first, ...rest] = words;
  if (first === undefined || isHelp(first) || first === "guide" || first === "library")
    return words;
  if (NOUNS.includes(first)) {
    const [flag, ...after] = rest;
    if (flag === undefined || isHelp(flag)) return words;
    if (!flag.startsWith("--")) {
      const meant =
        known.get(first)?.has(flag) === true ? surfaceName(`${first} ${flag}`) : undefined;
      return { field: "verb", found: flag, ...(meant === undefined ? {} : { likely: meant }) };
    }
    const verb = flag.slice(2);
    if (isHelp(after[0])) return [first, verb, ...after];
    if (file === undefined) return { field: "--file" };
    return [first, verb, file, ...after];
  }
  if (FILE_COMMANDS.includes(first)) {
    if (isHelp(rest[0])) return words;
    if (file === undefined) return { field: "--file" };
    return [first, file, ...rest];
  }
  return words;
}

const NOUN_WORDS = NOUNS.join("|");
const VERB_WORDS = new RegExp(`\\b(${NOUN_WORDS}) ([a-z][a-z-]*)\\b`, "g");
const USAGE_VERB = new RegExp(
  `^Usage: grafical (${NOUN_WORDS}) ([a-z-]+)(?:\\|[a-z-]+)? \\[options\\] <file>(.*)$`,
  "gm",
);
const USAGE_NOUN = new RegExp(
  `^Usage: grafical (${NOUN_WORDS}) \\[options\\] \\[command\\]$`,
  "gm",
);
/** An example of a verb: `grafical node set a.grafical x`, or `grafical node set <file> x`. */
const EXAMPLE_VERB = new RegExp(
  `\\bgrafical (${NOUN_WORDS}) ([a-z-]+) (\\S+\\.grafical\\b|<file>)`,
  "g",
);
const EXAMPLE_COMMAND = /\bgrafical (show|diff|check|render|view) (\S+\.grafical)\b/g;

/** Every verb a noun has, by its subcommand's name. */
const known = new Map<string, Set<string>>();

/** Tells this file which commands exist, so that it rewrites them and no other words. */
export function learn(names: readonly string[]): void {
  for (const name of names) {
    const [noun, verb] = name.split(" ");
    if (noun === undefined || verb === undefined) continue;
    known.set(noun, (known.get(noun) ?? new Set()).add(verb));
  }
}

/** Help text as a caller reads it: every command in the form it is typed. */
export function surfaceText(text: string): string {
  return text
    .replace(
      USAGE_VERB,
      (_, noun: string, verb: string, more: string) =>
        `Usage: grafical -f <file> ${noun} --${verb}${more} [options]`,
    )
    .replace(
      /^Usage: grafical (show|diff|check|render|view) \[options\] <file>(.*)$/gm,
      (_, command: string, more: string) => `Usage: grafical -f <file> ${command}${more} [options]`,
    )
    .replace(USAGE_NOUN, "Usage: grafical -f <file> $1 --<verb> [options]")
    .replace(
      /^ {2}([a-z-]+)\|?[a-z-]* \[options\] <file>(.*)$/gm,
      (_, verb: string, more: string) =>
        FILE_COMMANDS.includes(verb) ? `  ${verb}${more}` : `  --${verb}${more}`,
    )
    .replace(/\bgrafical (show|diff|check|render|view) <file>/g, "grafical -f <file> $1")
    .replace(EXAMPLE_VERB, "grafical -f $3 $1 $2")
    .replace(EXAMPLE_COMMAND, "grafical -f $2 $1")
    .replace(VERB_WORDS, (whole, noun: string, verb: string) =>
      known.get(noun)?.has(verb) === true ? `${noun} --${verb}` : whole,
    );
}
