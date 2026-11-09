// Reading and writing the diagram file (FEATURES.md, "The diagram file"; DESIGNS.md, "What grafical cannot fully read, it refuses").

import type { OpError } from "../errors.ts";
import { parseGrafical, writeGrafical } from "./grafical-format.ts";
import { validateDiagram } from "./schema.ts";
import type { Diagram } from "./types.ts";

/** A diagram from the text of a .grafical file, or the errors that refuse it. */
export function readDiagram(text: string): Diagram | OpError[] {
  const plain = parseGrafical(text);
  return Array.isArray(plain) ? plain : validateDiagram(plain);
}

/** The text of a .grafical file. */
export function writeDiagram(d: Diagram): string {
  return writeGrafical(d);
}

/** A YAML syntax error in a batch: the line and column it is at, from 1, and the text of that line. */
export function yamlError(text: string, err: unknown): OpError {
  const at = (err as { linePos?: { line: number; col: number }[] } | null)?.linePos?.[0];
  const line = at?.line ?? 1;
  return {
    code: "bad-yaml",
    index: 0,
    found: (text.split("\n")[line - 1] ?? "").trim(),
    facts: { line, ...(at !== undefined ? { column: at.col } : {}) },
  };
}
