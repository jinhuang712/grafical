// What caused a problem (DESIGN.md, "Refusals say what happened and which commands can change it"): the command line
// as typed, an operation of a batch by the line it starts on and as it was written, or what was already in the file.

import { isMap, isSeq, type Node, parseDocument } from "yaml";

/** The source of a problem the file had before the command. */
export const IN_FILE = "already in the file";

/** An operation of a batch file: the line it starts on, from 1, and its text as written, on one line. */
export interface Item {
  line: number;
  text: string;
}

/** Where a write's operations came from: the command line as typed and, for a batch, its file and operations. */
export interface Origin {
  command: string;
  batch?: { file: string; items: readonly Item[] };
}

/** A word of the command line as a shell would take it back: as typed, or in double quotes. */
function word(w: string): string {
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(w) ? w : JSON.stringify(w);
}

/** The command line as typed: grafical and its words. */
export function commandLine(args: readonly string[]): string {
  return ["grafical", ...args.map(word)].join(" ");
}

/** The source of the operation at `index`: its batch's line, or the command line. */
export function itemSource(origin: Origin, index: number): string {
  const item = origin.batch?.items[index];
  if (origin.batch === undefined || item === undefined) return origin.command;
  return `${origin.batch.file} line ${item.line}: ${item.text}`;
}

/** The source of a problem of a batch whose line cannot be known: the batch file, with no line, or the command line. */
export function unlined(origin: Origin): string {
  return origin.batch?.file ?? origin.command;
}

/** A YAML node as it was written, on one line: a flow item as its text, a block one in flow form. */
function written(n: unknown, text: string): string {
  const node = n as Node | null;
  if (node === null || node === undefined) return "";
  const range = (node as { range?: [number, number, number] }).range;
  if ((isMap(node) || isSeq(node)) && !node.flow) {
    if (isSeq(node)) return `[${node.items.map((x) => written(x, text)).join(", ")}]`;
    const pairs = node.items.map((p) => {
      const value = p.value === null ? "" : ` ${written(p.value, text)}`;
      return `${written(p.key, text)}:${value}`;
    });
    return `{${pairs.join(", ")}}`;
  }
  return range === undefined ? String(node) : text.slice(range[0], range[1]).replace(/\s+/g, " ");
}

/** Each operation of a batch's text, by the line it starts on: none when the text is not a YAML list. */
export function batchItems(text: string): Item[] {
  const doc = parseDocument(text);
  const list = doc.contents;
  if (!isSeq(list)) return [];
  return list.items.map((x) => {
    const at = (x as { range?: [number, number, number] } | null)?.range?.[0] ?? 0;
    return { line: text.slice(0, at).split("\n").length, text: written(x, text) };
  });
}
