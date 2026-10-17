// Each command's line in a batch, shown on its help page (DESIGN.md, "One entry page, help where it is used"). It
// is built from the operation's schema, so it cannot drift from what a batch accepts: the operation's name and
// the fields it needs. A command's arguments and options are named as its operation's fields.

import type { Command } from "commander";
import { z } from "zod";
import { OP_NAMES, type OpName, SCHEMAS } from "../model/ops.ts";
import { edgeId, idSuffix, nodeId } from "../model/schema.ts";

/** The command each operation runs as: its path with a dot, and `new` for diagram.new. */
export function opCommands(program: Command): Map<OpName, Command> {
  const out = new Map<OpName, Command>();
  for (const c of program.commands) {
    if (c.name() === "new") out.set("diagram.new", c);
    for (const s of c.commands) {
      const name = `${c.name()}.${s.name()}`;
      if ((OP_NAMES as string[]).includes(name)) out.set(name as OpName, s);
    }
  }
  return out;
}

type Json = {
  type?: string;
  enum?: unknown[];
  pattern?: string;
  items?: Json;
  properties?: Record<string, Json>;
  required?: string[];
};

const json = (s: z.ZodType): Json =>
  z.toJSONSchema(s, { io: "input", unrepresentable: "any" }) as Json;

/** The shared values, by the placeholder the line shows for them. */
const PLACEHOLDERS = new Map<string | undefined, string>([
  [json(nodeId).pattern, "<id>"],
  [json(edgeId).pattern, "<line>"],
  [json(idSuffix).pattern, "<suffix>"],
]);

/** A needed field's placeholder: <id>, <text>, a list of them, or <field> for one of several words. */
function placeholder(field: string, s: Json): string {
  if (s.enum !== undefined) return `<${field}>`;
  if (s.type === "array") return `[${placeholder(field, s.items ?? {})}, ...]`;
  return PLACEHOLDERS.get(s.pattern) ?? "<text>";
}

/** Wraps a YAML flow item at 80 columns: a break after a comma keeps it one item. */
function wrapFlow(item: string): string {
  const lines: string[] = [];
  let line = "  -";
  for (const part of item.split(" ")) {
    if (line.length + 1 + part.length > 80) {
      lines.push(line);
      line = `    ${part}`;
    } else {
      line = `${line} ${part}`;
    }
  }
  lines.push(line);
  return lines.join("\n");
}

/** The section a command's page shows under its options: its operation and the fields it needs. */
export function batchSection(op: OpName, command: Command): string {
  const schema = json(SCHEMAS[op] as z.ZodType);
  const needed = (schema.required ?? []).filter((k) => k !== "op");
  const fields = [
    `op: ${op}`,
    ...needed.map((k) => `${k}: ${placeholder(k, schema.properties?.[k] ?? {})}`),
  ];
  const options = command.options.some((o) => o.attributeName() !== "json");
  return [
    "In a batch:",
    wrapFlow(`{${fields.join(", ")}}`),
    ...(options ? ["  Options are fields too, without the dashes."] : []),
  ].join("\n");
}
