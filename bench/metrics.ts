// Turns a headless `stream-json` transcript into the metrics of EXPERIMENTS.md.
// The transcript is JSON Lines: a `system` init event, `assistant` and `user`
// events, and a final `result` event.

export type StepKind = "draft" | "change";

// biome-ignore lint/suspicious/noExplicitAny: transcript events are loose JSON
export type Event = any;

export interface Turn {
  /** The API message id. */
  id: string;
  uncachedInput: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
  /** cache reads ÷ (uncached input + cache writes + cache reads) */
  cacheHitRate: number;
}

export interface GraficalStats {
  /** Tool calls that ran grafical: one per call, however many grafical commands it chains. */
  calls: number;
  /** Calls that grafical accepted. */
  successes: number;
  /** Successes that changed the diagram: layer, node, edge or apply (not guide, new, show, check or render). */
  editSuccesses: number;
  /** Calls that grafical refused with an operation error (or a non-zero exit with no report). */
  opErrors: number;
  /** Calls that grafical refused with a defect. */
  defects: number;
  /** Calls the harness refused before grafical ran: the result starts with "Permission to use". */
  permissionDenials: number;
  /** (opErrors + defects) / (calls - permissionDenials): how often grafical itself said no. */
  rejectedShare: number;
  /** Successful calls whose previous call on the same diagram failed, for any reason. */
  retries: number;
  /** Failed calls that a later call on the same diagram followed with a success. */
  recovered: number;
}

export interface Metrics {
  sessionId: string | null;
  /** The model id the API reported, not the alias. */
  model: string | null;
  finished: boolean;
  isError: boolean;
  subtype: string | null;
  /** This step's own cost: the session total minus the previous step's session total. */
  costUsd: number;
  /** The session's running total, as `total_cost_usd` reports it. */
  sessionCostUsd: number;
  wallSeconds: number;
  /** This step's own API time (`duration_api_ms` is a running total on a resumed session). */
  apiSeconds: number;
  sessionApiSeconds: number;
  turns: number;
  toolCalls: Record<string, number>;
  toolCallTotal: number;
  tokens: {
    uncachedInput: number;
    cacheWrite: number;
    cacheRead: number;
    output: number;
    /** uncached input + cache writes + output */
    fresh: number;
    cacheHitRate: number;
  };
  perTurn: Turn[];
  /** Read calls on .png or .svg files. */
  imageReads: number;
  /** null for the raw arm. */
  grafical: GraficalStats | null;
  /** Hypothesis H4 audit, grafical arm only: Bash commands that draw by other means. */
  offTool: number | null;
  /** Change requests answered by redrawing the whole diagram. Always 0 for a draft. */
  regenerations: number;
}

export function parseTranscript(text: string): Event[] {
  const events: Event[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // A cut-off last line (a run killed by its cap) is kept out, not fatal.
    }
  }
  return events;
}

function ratio(n: number, d: number): number {
  return d === 0 ? 0 : n / d;
}

interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

function toolUses(events: Event[]): ToolUse[] {
  const out: ToolUse[] = [];
  for (const e of events) {
    if (e.type !== "assistant") continue;
    for (const b of e.message?.content ?? []) {
      if (b.type === "tool_use") out.push({ id: b.id, name: b.name, input: b.input ?? {} });
    }
  }
  return out;
}

/** The text of every tool result, by tool_use id. */
function toolResults(events: Event[]): Map<string, { text: string; isError: boolean }> {
  const out = new Map<string, { text: string; isError: boolean }>();
  for (const e of events) {
    if (e.type !== "user" || !Array.isArray(e.message?.content)) continue;
    for (const b of e.message.content) {
      if (b.type !== "tool_result") continue;
      const c = b.content;
      const text =
        typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => x.text ?? "").join("") : "";
      out.set(b.tool_use_id, { text, isError: b.is_error === true });
    }
  }
  return out;
}

/** One API call is one turn. Its content blocks may arrive as several events with one message id. */
export function perTurn(events: Event[]): Turn[] {
  const byId = new Map<string, Turn>();
  for (const e of events) {
    if (e.type !== "assistant" || !e.message?.usage) continue;
    const u = e.message.usage;
    const id: string = e.message.id ?? `event-${byId.size}`;
    const prev = byId.get(id);
    const uncachedInput = Math.max(prev?.uncachedInput ?? 0, u.input_tokens ?? 0);
    const cacheWrite = Math.max(prev?.cacheWrite ?? 0, u.cache_creation_input_tokens ?? 0);
    const cacheRead = Math.max(prev?.cacheRead ?? 0, u.cache_read_input_tokens ?? 0);
    const output = Math.max(prev?.output ?? 0, u.output_tokens ?? 0);
    byId.set(id, {
      id,
      uncachedInput,
      cacheWrite,
      cacheRead,
      output,
      cacheHitRate: ratio(cacheRead, uncachedInput + cacheWrite + cacheRead),
    });
  }
  return [...byId.values()];
}

/** The grafical subcommand of each `&&`/`;`/newline part of a Bash command that starts with grafical. */
function graficalCommands(command: string): string[] {
  const found: string[] = [];
  for (const part of command.split(/&&|\|\||;|\n/)) {
    const m = /^\s*grafical\s+(\w+)/.exec(part);
    if (m) found.push(m[1] as string);
  }
  return found;
}

/** The diagram file a grafical call works on; "?" when the command does not name one. */
function diagramOf(command: string): string {
  for (const part of command.split(/&&|\|\||;|\n/)) {
    if (!/^\s*grafical\s/.test(part)) continue;
    const m = /(\S+\.ya?ml)\b/.exec(part);
    if (m) return (m[1] as string).replace(/^["']|["']$/g, "");
  }
  return "?";
}

const EDIT_COMMANDS = new Set(["layer", "node", "edge", "apply"]);

export type Outcome = "success" | "opError" | "defect" | "denied";

/**
 * How one grafical call ended. The harness's refusal comes first: its text starts with
 * "Permission to use". Then grafical's own report, as JSON or as the plain lines
 * `error op ...` and `defect ...`. A failure with neither is an operation error.
 */
export function classify(text: string, isError: boolean): Outcome {
  if (text.trimStart().startsWith("Permission to use")) return "denied";
  const start = text.indexOf("{");
  if (start >= 0) {
    try {
      const j = JSON.parse(text.slice(start));
      if (Array.isArray(j.errors) && j.errors.length > 0) return "opError";
      if (Array.isArray(j.defects) && j.defects.length > 0) return "defect";
      if (j.ok === false) return "opError";
      if (j.ok === true) return "success";
    } catch {
      // Not JSON (the agent did not pass --json): read the plain lines.
    }
  }
  if (/^error op /m.test(text)) return "opError";
  if (/^defect /m.test(text)) return "defect";
  if (/^failed, file unchanged/m.test(text)) return "opError";
  return isError ? "opError" : "success";
}

export function graficalStats(events: Event[]): GraficalStats {
  const results = toolResults(events);
  const calls: { outcome: Outcome; diagram: string; edit: boolean }[] = [];
  for (const t of toolUses(events)) {
    if (t.name !== "Bash" || typeof t.input.command !== "string") continue;
    const subcommands = graficalCommands(t.input.command);
    if (subcommands.length === 0) continue;
    const r = results.get(t.id);
    if (!r) continue; // a run cut off before the result: not a finished call
    calls.push({
      outcome: classify(r.text, r.isError),
      diagram: diagramOf(t.input.command),
      edit: subcommands.some((c) => EDIT_COMMANDS.has(c)),
    });
  }
  const count = (o: Outcome) => calls.filter((c) => c.outcome === o).length;
  let retries = 0;
  let recovered = 0;
  const last = new Map<string, Outcome>();
  const openFailures = new Map<string, number>();
  // Retries and recoveries are about edits: a `show` after a failure retries nothing.
  for (const c of calls.filter((c) => c.edit)) {
    const before = last.get(c.diagram);
    if (c.outcome === "success") {
      if (before !== undefined && before !== "success") retries++;
      recovered += openFailures.get(c.diagram) ?? 0;
      openFailures.delete(c.diagram);
    } else {
      openFailures.set(c.diagram, (openFailures.get(c.diagram) ?? 0) + 1);
    }
    last.set(c.diagram, c.outcome);
  }
  const rejected = count("opError") + count("defect");
  return {
    calls: calls.length,
    successes: count("success"),
    editSuccesses: calls.filter((c) => c.edit && c.outcome === "success").length,
    opErrors: count("opError"),
    defects: count("defect"),
    permissionDenials: count("denied"),
    rejectedShare: ratio(rejected, calls.length - count("denied")),
    retries,
    recovered,
  };
}

const INTERPRETER =
  /^(?:sudo\s+|time\s+|\w+=\S*\s+)*(python3?|node|nodejs|deno|bun|ruby|perl|dot|neato|fdp|twopi|circo|rsvg-convert|convert|magick|inkscape|mmdc|d2|plantuml|java)(?:\s|$)/;
const PICTURE_OUT = /(?:>>?|\btee\s+(?:-a\s+)?|\s-o\s*|--output[ =])\s*\S*\.(?:svg|png)\b/i;
const COORDINATES = /<svg|viewBox|\b(?:x|y|cx|cy|x1|x2|y1|y2|width|height)\s*=\s*["']?\d/;

/**
 * Whether a Bash command draws by other means than grafical: it writes a .svg or .png,
 * runs an interpreter or a drawing program, or writes coordinates. A part that starts
 * with `grafical` is never counted, so `grafical render --png` is fine.
 */
export function offToolCommand(command: string): boolean {
  for (const part of command.split(/&&|\|\||;|\n/)) {
    if (/^\s*grafical\s/.test(part)) continue;
    if (PICTURE_OUT.test(part) || COORDINATES.test(part)) return true;
    for (const piece of part.split("|")) if (INTERPRETER.test(piece.trim())) return true;
  }
  return false;
}

export function offToolCount(events: Event[]): number {
  return toolUses(events).filter(
    (t) =>
      t.name === "Bash" && typeof t.input.command === "string" && offToolCommand(t.input.command),
  ).length;
}

const SOURCE_EXT = /\.(svg|html?|dot|gv|mmd|puml|py|js|mjs|ts)$/i;

/**
 * Change requests answered by redrawing the whole diagram. For grafical, a
 * `grafical new` in a change step. For the raw arm, a heuristic: a Write of a
 * diagram source file in a change step (an Edit alone is a patch).
 */
export function regenerations(events: Event[], arm: "grafical" | "raw", kind: StepKind): number {
  if (kind === "draft") return 0;
  const uses = toolUses(events);
  if (arm === "grafical") {
    const news = uses.filter(
      (t) =>
        t.name === "Bash" &&
        typeof t.input.command === "string" &&
        graficalCommands(t.input.command).includes("new"),
    );
    return news.length > 0 ? 1 : 0;
  }
  const rewrote = uses.some(
    (t) =>
      t.name === "Write" &&
      typeof t.input.file_path === "string" &&
      SOURCE_EXT.test(t.input.file_path),
  );
  return rewrote ? 1 : 0;
}

/**
 * One step's share of a session total. On a resumed session `total_cost_usd` and
 * `duration_api_ms` run on from the earlier steps, so the step's own part is the
 * difference. A total below the previous one means a new session: it is the step's own.
 */
export function stepTotal(sessionTotal: number, previous: number | undefined): number {
  if (previous === undefined || sessionTotal < previous) return sessionTotal;
  return sessionTotal - previous;
}

export function computeMetrics(
  events: Event[],
  o: {
    arm: "grafical" | "raw";
    kind: StepKind;
    /** The session's running totals after the previous step. Omit for a first step. */
    previous?: { costUsd: number; apiSeconds: number };
  },
): Metrics {
  const init = events.find((e) => e.type === "system" && e.subtype === "init");
  const result = [...events].reverse().find((e) => e.type === "result");
  const turns = perTurn(events);
  const sum = (k: "uncachedInput" | "cacheWrite" | "cacheRead" | "output") =>
    turns.reduce((a, t) => a + t[k], 0);
  const uncachedInput = sum("uncachedInput");
  const cacheWrite = sum("cacheWrite");
  const cacheRead = sum("cacheRead");
  const output = sum("output");

  const uses = toolUses(events);
  const toolCalls: Record<string, number> = {};
  for (const t of uses) toolCalls[t.name] = (toolCalls[t.name] ?? 0) + 1;
  const imageReads = uses.filter(
    (t) =>
      t.name === "Read" &&
      typeof t.input.file_path === "string" &&
      /\.(png|svg)$/i.test(t.input.file_path),
  ).length;

  const sessionCostUsd: number = result?.total_cost_usd ?? 0;
  const sessionApiSeconds = (result?.duration_api_ms ?? 0) / 1000;
  return {
    sessionId: result?.session_id ?? init?.session_id ?? null,
    model: init?.model ?? null,
    finished: result !== undefined,
    isError: result?.is_error === true,
    subtype: result?.subtype ?? null,
    costUsd: stepTotal(sessionCostUsd, o.previous?.costUsd),
    sessionCostUsd,
    wallSeconds: (result?.duration_ms ?? 0) / 1000,
    apiSeconds: stepTotal(sessionApiSeconds, o.previous?.apiSeconds),
    sessionApiSeconds,
    turns: result?.num_turns ?? turns.length,
    toolCalls,
    toolCallTotal: uses.length,
    tokens: {
      uncachedInput,
      cacheWrite,
      cacheRead,
      output,
      fresh: uncachedInput + cacheWrite + output,
      cacheHitRate: ratio(cacheRead, uncachedInput + cacheWrite + cacheRead),
    },
    perTurn: turns,
    imageReads,
    grafical: o.arm === "grafical" ? graficalStats(events) : null,
    offTool: o.arm === "grafical" ? offToolCount(events) : null,
    regenerations: regenerations(events, o.arm, o.kind),
  };
}
