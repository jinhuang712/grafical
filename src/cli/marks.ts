// Reading the pictures behind marks (DESIGN.md D40, D15). Node only: the engine
// stays pure, so the command line reads each file and each emoji here and hands the
// bytes to the SVG writer with provideMarkImage(), the way it hands in stylesheets.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, normalize } from "node:path";
import type { OpError } from "../errors.ts";
import type { Op } from "../model/ops.ts";
import { isMarkFile } from "../model/schema.ts";
import { type Diagram, MARK_SLOTS, type Mark, type MarkSlot, markText } from "../model/types.ts";
import { isEmoji, markKey, provideMarkImage } from "../render/marks.ts";

const require = createRequire(import.meta.url);

/** The Twemoji file name of an emoji: its code points in hex, joined by hyphens. */
export function twemojiName(emoji: string): string {
  // The variation selector is dropped unless a joiner holds the sequence together.
  const zwj = emoji.includes("‍");
  const points = [...emoji]
    .map((c) => c.codePointAt(0) as number)
    .filter((p) => zwj || p !== 0xfe0f);
  return points.map((p) => p.toString(16)).join("-");
}

function emojiPath(emoji: string): string {
  return join(dirname(require.resolve("@twemoji/svg/package.json")), `${twemojiName(emoji)}.svg`);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** What makes an SVG file unsafe to embed: code, or a reference to something outside it. */
function svgProblem(svg: string): string | undefined {
  if (!/<svg[\s>]/.test(svg)) return "not-svg";
  if (/<script|<foreignObject|\son[a-z]+\s*=/i.test(svg)) return "script";
  if (/(?:href|src)\s*=\s*["'](?!#|data:)/i.test(svg) || /url\(\s*["']?(?!#|data:)/i.test(svg)) {
    return "external-reference";
  }
  return undefined;
}

function problem(code: string, index: number, found: string, fix?: string[]): OpError {
  return {
    code,
    index,
    field: "icon",
    found,
    ...(fix === undefined ? {} : { facts: { fix } }),
  };
}

/** The SHA-256 of a file, in hex. */
export function fileHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Reads a mark's picture and hands it to the SVG writer. A text that is not an emoji
 * has no picture. Returns the file's hash for a file, so that a caller can bind it.
 */
function prepare(
  folder: string,
  mark: string | Mark,
  index: number,
): { sha256?: string; error?: OpError } {
  const text = typeof mark === "string" ? (isMarkFile(mark) ? undefined : mark) : markText(mark);
  if (text !== undefined) {
    // A plain text is drawn by the SVG writer, with no picture to read. An emoji is a picture.
    if (!isEmoji(text)) return {};
    const path = emojiPath(text);
    if (!existsSync(path)) {
      return { error: problem("mark-not-drawn", index, text, ["use an emoji from Unicode 15"]) };
    }
    provideMarkImage(markKey(mark), {
      mime: "image/svg+xml",
      base64: readFileSync(path).toString("base64"),
    });
    return {};
  }
  const file = typeof mark === "string" ? mark : (mark as { file: string }).file;
  if (isAbsolute(file) || normalize(file).startsWith("..")) {
    return {
      error: problem("mark-file-outside", index, file, ["put the file next to the diagram"]),
    };
  }
  const path = join(folder, file);
  if (!existsSync(path)) return { error: problem("mark-file-not-found", index, path) };
  const bytes = readFileSync(path);
  const sha256 = fileHash(bytes);
  if (typeof mark !== "string" && "sha256" in mark && mark.sha256 !== sha256) {
    return {
      error: {
        ...problem("mark-file-changed", index, file),
        facts: { fix: [`node icon <file> <id> --slot <slot> --icon ${file}`] },
      },
    };
  }
  if (/\.png$/i.test(file)) {
    if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
      return { error: problem("mark-file-unreadable", index, file) };
    }
    provideMarkImage(`f:${sha256}`, { mime: "image/png", base64: bytes.toString("base64") });
    return { sha256 };
  }
  const bad = svgProblem(bytes.toString("utf8"));
  if (bad !== undefined) {
    return { error: { ...problem("mark-file-unsafe", index, file), facts: { allowed: [bad] } } };
  }
  provideMarkImage(`f:${sha256}`, { mime: "image/svg+xml", base64: bytes.toString("base64") });
  return { sha256 };
}

/**
 * Reads every mark of a diagram. Returns the errors of the ones that cannot be
 * drawn: a missing or changed file, an unsafe SVG, an emoji with no picture.
 */
export function loadMarks(file: string, d: Diagram, setting: Set<string> = new Set()): OpError[] {
  const folder = dirname(file);
  const errors: OpError[] = [];
  for (const layer of d.layers) {
    for (const node of layer.nodes) {
      for (const slot of MARK_SLOTS) {
        const mark = node.icons?.[slot];
        if (mark === undefined) continue;
        // A mark that an operation sets or clears is read again by that operation, so it
        // may be the one that fixes a changed or missing file.
        if (setting.has(markSlotKey(node.id, slot))) continue;
        const { error } = prepare(folder, mark, 0);
        if (error !== undefined) errors.push({ ...error, field: `${node.id}.icons.${slot}` });
      }
    }
  }
  return errors;
}

/** Names one slot of one node, for the marks that operations are about to set. */
export function markSlotKey(node: string, slot: MarkSlot): string {
  return `${node}:${slot}`;
}

/** The slots the operations set or clear. */
export function settingSlots(ops: Op[]): Set<string> {
  const out = new Set<string>();
  for (const op of ops) if (op.op === "node.icon") out.add(markSlotKey(op.id, op.slot));
  return out;
}

/**
 * Fills in the hash of each file mark an operation sets, and reads its picture, so
 * that applying the operation stays pure. Returns the errors of the ones it cannot read.
 */
export function bindMarkOps(file: string, ops: Op[]): { ops: Op[]; errors: OpError[] } {
  const folder = dirname(file);
  const errors: OpError[] = [];
  const bound = ops.map((op, i) => {
    if (op.op !== "node.icon" || op.icon === undefined) return op;
    const { sha256, error } = prepare(folder, op.icon, i);
    if (error !== undefined) {
      errors.push(error);
      return op;
    }
    return sha256 === undefined ? op : { ...op, sha256 };
  });
  return { ops: bound, errors };
}
