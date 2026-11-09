// What caused a problem (specs/decisions, "Refusals say what happened and which commands can change it"): the command line
// as typed, or what was already in the file.

/** The source of a problem the file had before the command. */
export const IN_FILE = "already in the file";

/** Where a write's operation came from: the command line as typed. */
export interface Origin {
  command: string;
}

/** A word of the command line as a shell would take it back: as typed, or in double quotes. */
function word(w: string): string {
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(w) ? w : JSON.stringify(w);
}

/** The command line as typed: grafical and its words. */
export function commandLine(args: readonly string[]): string {
  return ["grafical", ...args.map(word)].join(" ");
}
