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
  /** Commands that change the diagram: new, layer, node, edge, apply. */
  writes: number;
  /** Writes that grafical rejected: an operation error, a defect, or a non-zero exit. */
  rejected: number;
  rejectedShare: number;
  /** Writes issued right after a rejected write. */
  retries: number;
  /** Rejected writes that a later write followed. */
  recovered: number;
}

export interface Metrics {
  sessionId: string | null;
  /** The model id the API reported, not the alias. */
  model: string | null;
  finished: boolean;
  isError: boolean;
  subtype: string | null;
  costUsd: number;
  wallSeconds: number;
  apiSeconds: number;
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

const WRITE_COMMANDS = new Set(["new", "layer", "node", "edge", "apply"]);

/** The grafical subcommand in a Bash command, or null. Looks at each `&&`/`;` part. */
function graficalCommands(command: string): string[] {
  const found: string[] = [];
  for (const part of command.split(/&&|\|\||;|\n/)) {
    const m = /^\s*grafical\s+(\w+)/.exec(part);
    if (m) found.push(m[1] as string);
  }
  return found;
}

/** Whether grafical's reply says the write was rejected. Reads its JSON when it can. */
function rejected(text: string, isError: boolean): boolean {
  const start = text.indexOf("{");
  if (start >= 0) {
    try {
      const j = JSON.parse(text.slice(start));
      if (j.ok === false) return true;
      if (Array.isArray(j.errors) && j.errors.length > 0) return true;
      if (Array.isArray(j.defects) && j.defects.length > 0) return true;
      if (j.ok === true || Array.isArray(j.errors) || Array.isArray(j.defects)) return false;
    } catch {
      // Not JSON (the agent did not pass --json): fall back to the exit status.
    }
  }
  return isError;
}

export function graficalStats(events: Event[]): GraficalStats {
  const results = toolResults(events);
  const outcomes: boolean[] = []; // true = rejected, in call order
  for (const t of toolUses(events)) {
    if (t.name !== "Bash" || typeof t.input.command !== "string") continue;
    const writes = graficalCommands(t.input.command).filter((c) => WRITE_COMMANDS.has(c));
    if (writes.length === 0) continue;
    const r = results.get(t.id);
    // A compound command counts once per write; its outcome is the command's.
    const bad = r ? rejected(r.text, r.isError) : false;
    for (let i = 0; i < writes.length; i++) outcomes.push(bad);
  }
  let retries = 0;
  let recovered = 0;
  outcomes.forEach((bad, i) => {
    if (i > 0 && outcomes[i - 1]) retries++;
    if (bad && i + 1 < outcomes.length) recovered++;
  });
  const bad = outcomes.filter(Boolean).length;
  return {
    writes: outcomes.length,
    rejected: bad,
    rejectedShare: ratio(bad, outcomes.length),
    retries,
    recovered,
  };
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

export function computeMetrics(
  events: Event[],
  o: { arm: "grafical" | "raw"; kind: StepKind },
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

  return {
    sessionId: result?.session_id ?? init?.session_id ?? null,
    model: init?.model ?? null,
    finished: result !== undefined,
    isError: result?.is_error === true,
    subtype: result?.subtype ?? null,
    costUsd: result?.total_cost_usd ?? 0,
    wallSeconds: (result?.duration_ms ?? 0) / 1000,
    apiSeconds: (result?.duration_api_ms ?? 0) / 1000,
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
    regenerations: regenerations(events, o.arm, o.kind),
  };
}
