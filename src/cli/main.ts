#!/usr/bin/env node
// The grafical command line (DESIGN.md, "Interfaces"). Exit codes: 0 success, 1 an
// operation error or a defect, 2 a usage error.

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Command, CommanderError } from "commander";
import { parse } from "yaml";
import {
  bentLines,
  type Counts,
  countsText,
  delta,
  deltaText,
  drawing,
  drawingText,
} from "../check/drawing.ts";
import type { Facts, UsageCode } from "../errors.ts";
import { USAGE_CODES } from "../errors.ts";
import { layout } from "../layout/index.ts";
import { diffDiagrams } from "../model/diff.ts";
import { yamlError } from "../model/io.ts";
import type { Op, OpName } from "../model/ops.ts";
import { parseOp, parseOps } from "../model/ops.ts";
import { STEP_KEYS } from "../model/steps.ts";
import { closest, editDistance } from "../model/suggest.ts";
import {
  EDGE_KINDS,
  MARK_COLORS,
  MARK_SHAPES,
  MARK_SIZES,
  MARK_SLOTS,
  NODE_KINDS,
  STEP_NUMBER_MAX,
} from "../model/types.ts";
import { block, record } from "../records.ts";
import { renderPng, renderSvg } from "../render/index.ts";
import { createMeasurer } from "../text/index.ts";
import { batchSection, opCommands } from "./batch.ts";
import { atRevision, formatOps } from "./diff.ts";
import { GUIDES, guideList, guideNamed } from "./guides.ts";
import { PAGES, PROGRAM_ABOUT, PROGRAM_AFTER } from "./help.ts";
import {
  emit,
  failure,
  fileError,
  formatReport,
  inspect,
  isReport,
  loadDiagram,
  type Report,
  reportBody,
  runWrite,
  tryWrite,
  writeAtomic,
} from "./pipeline.ts";
import { type Block, kindsOf, usageBlock } from "./problems.ts";
import { showDiagram } from "./show.ts";
import { openWindow, startViewer, windowSize } from "./view.ts";

type Opts = Record<string, unknown>;

/** Keeps the flags that were given. Commander leaves the others undefined. */
function pick(opts: Opts, names: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const n of names) if (opts[n] !== undefined && opts[n] !== false) out[n] = opts[n];
  return out;
}

function splitIds(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x !== "");
}

const POSITION = ["first", "last", "before", "after"];

/** The box steps start from, and the steps, as numbers where they read as one (DESIGN.md, "Steps from another box"). */
function stepFlags(opts: Opts): Record<string, unknown> {
  const out = pick(opts, ["from"]);
  for (const k of STEP_KEYS) {
    const v = opts[k];
    if (v !== undefined) out[k] = typeof v === "string" && /^[0-9.]+$/.test(v) ? Number(v) : v;
  }
  return out;
}

/** The step options of node add and node move (DESIGN.md, "Steps from another box"). */
function withSteps(c: Command): Command {
  return c
    .option("--from <node>", "in no row: placed by steps from this box, and moves with it")
    .option("--down <n>", "steps down from --from, 1 to 10")
    .option("--up <n>", "steps up")
    .option("--left <n>", "steps left")
    .option("--right <n>", "steps right");
}

/** Runs an operation built from flags through the shared write path. */
async function write(file: string, raw: Record<string, unknown>, opts: Opts, create = false) {
  const op = parseOp(raw, 0);
  if (Array.isArray(op)) {
    process.exitCode = emit(failure(op), opts.json === true);
    return;
  }
  await finish(file, [op], opts, create);
}

async function finish(file: string, ops: Op[], opts: Opts, create = false, counts = false) {
  const report = await runWrite(file, ops, create, counts);
  process.exitCode = emit(report, opts.json === true);
}

function renderName(file: string): string {
  const base = basename(file).replace(/\.grafical\.ya?ml$|\.ya?ml$/, "");
  return join(dirname(file), base);
}

/**
 * Gives each command its help page (DESIGN.md, "One entry page, help where it is used"): the one-line description
 * stays the summary in its parent's list, and the page's paragraph, its line in a batch and its sections show on
 * its own help.
 */
function attachHelp(parent: Command, ops: Map<Command, OpName>, path: string[] = []): void {
  for (const c of parent.commands) {
    const at = [...path, c.name()];
    const page = PAGES[at.join(" ")];
    const op = ops.get(c);
    if (page?.about !== undefined) c.summary(c.description()).description(page.about);
    const after = [op === undefined ? "" : `\n${batchSection(op, c)}\n`, page?.after ?? ""].join(
      "",
    );
    if (after !== "") c.addHelpText("after", after.trimEnd());
    attachHelp(c, ops, at);
  }
}

/** The command line, every command and its help; the tests read it too. */
export function build(): Command {
  const program = new Command("grafical");
  program
    .description(PROGRAM_ABOUT)
    .exitOverride()
    .configureOutput({
      writeOut: (s) => process.stdout.write(s),
      writeErr: (s) => process.stderr.write(s),
      // The same help on every terminal, so that it is the same text for every agent.
      getOutHelpWidth: () => 80,
      getErrHelpWidth: () => 80,
      // The parser's sentence is replaced by a record in main().
      outputError: () => {},
    })
    .showHelpAfterError(false)
    .addHelpText("after", PROGRAM_AFTER.trimEnd());

  const json = (c: Command): Command => c.option("--json", "print the report as JSON");

  json(
    program
      .command("new")
      .description("create an empty diagram file")
      .argument("<file>")
      .requiredOption("--title <text>", "diagram title")
      .option("--density <density>", "compact, normal or airy")
      .option("--sizing <sizing>", "auto (default) or fixed: sizing of nodes without --size")
      .option(
        "--style <style>",
        "a theme (default, dark, print) or a <name>.grafical-style.yaml beside the file",
      )
      .option("--subtitle <text>", "one sentence under the title")
      .option("--note <text>", "a footnote"),
  ).action(async (file: string, opts: Opts) => {
    const names = ["title", "density", "sizing", "style", "subtitle", "note"];
    await write(file, { op: "diagram.new", ...pick(opts, names) }, opts, true);
  });

  const diagram = program
    .command("diagram")
    .description("the whole diagram: title, subtitle, note, legend, style, density, sizing");
  json(
    diagram
      .command("style")
      .description("take the look from a theme or a stylesheet; without one, the default theme")
      .argument("<file>")
      .argument("[style]", "default, dark, print, or a <name>.grafical-style.yaml beside the file"),
  ).action(async (file: string, style: string | undefined, opts: Opts) => {
    const raw: Record<string, unknown> = { op: "diagram.style" };
    if (style !== undefined) raw.style = style;
    await write(file, raw, opts);
  });
  json(
    diagram
      .command("sizing")
      .description("auto: size nodes without --size to their text; fixed: make them medium")
      .argument("<file>")
      .argument("<mode>", "auto or fixed"),
  ).action(async (file: string, mode: string, opts: Opts) => {
    await write(file, { op: "diagram.sizing", mode }, opts);
  });
  for (const field of ["subtitle", "note"] as const) {
    json(
      diagram
        .command(field)
        .description(`set the ${field}; without --text, clear it`)
        .argument("<file>")
        .option("--text <text>"),
    ).action(async (file: string, opts: Opts) => {
      await write(file, { op: `diagram.${field}`, ...pick(opts, ["text"]) }, opts);
    });
  }

  const group = program
    .command("group")
    .description(
      "a box per system: add, copy, join, leave, rename, describe, title, order, remove",
    );
  json(
    group
      .command("add")
      .description("add a group, optionally with member nodes, optionally inside another group")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>", "the name, short, as a reader would say it")
      .option("--sublabel <text>", "a second, quieter part of the label")
      .option("--nodes <ids>", "the members, comma-separated: a,b,c")
      .option("--in <group>", "the group it sits inside"),
  ).action(async (file: string, id: string, opts: Opts) => {
    const raw: Record<string, unknown> = {
      op: "group.add",
      id,
      ...pick(opts, ["label", "sublabel", "in"]),
    };
    if (typeof opts.nodes === "string") raw.nodes = splitIds(opts.nodes);
    await write(file, raw, opts);
  });
  json(
    group
      .command("join")
      .description("put nodes, or groups with everything in them, into a group")
      .argument("<file>")
      .argument("<group>")
      .argument("<nodes...>"),
  ).action(async (file: string, g: string, nodes: string[], opts: Opts) => {
    await write(file, { op: "group.join", group: g, nodes }, opts);
  });
  json(
    group
      .command("leave")
      .description("take nodes or groups out of every group")
      .argument("<file>")
      .argument("<nodes...>")
      .option("--up", "only one level out, into the group around the one they leave"),
  ).action(async (file: string, nodes: string[], opts: Opts) => {
    await write(
      file,
      { op: "group.leave", nodes, ...(opts.up === true ? { up: true } : {}) },
      opts,
    );
  });
  json(
    group
      .command("rename")
      .description("change a group's label")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>", "the name, short, as a reader would say it"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "group.rename", id, ...pick(opts, ["label"]) }, opts);
  });
  json(
    group
      .command("remove")
      .description("remove a group; its nodes and inner groups move into the group around it")
      .argument("<file>")
      .argument("<id>")
      .option("--out", "its nodes and inner groups leave every group instead"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(
      file,
      { op: "group.remove", id, ...(opts.out === true ? { out: true } : {}) },
      opts,
    );
  });

  const lane = program
    .command("lane")
    .description("swimlanes, who owns what: add, join, leave, rename, remove");
  json(
    lane
      .command("add")
      .description("add a lane, optionally with members: layers (rows), nodes (columns) or groups")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>", "the name, short, as a reader would say it")
      .option("--members <ids>", "comma-separated layer, node or group ids"),
  ).action(async (file: string, id: string, opts: Opts) => {
    const raw: Record<string, unknown> = { op: "lane.add", id, ...pick(opts, ["label"]) };
    if (typeof opts.members === "string") raw.members = splitIds(opts.members);
    await write(file, raw, opts);
  });
  json(
    lane
      .command("join")
      .description("put layers, nodes or groups into a lane")
      .argument("<file>")
      .argument("<lane>")
      .argument("<members...>"),
  ).action(async (file: string, l: string, members: string[], opts: Opts) => {
    await write(file, { op: "lane.join", lane: l, members }, opts);
  });
  json(
    lane
      .command("leave")
      .description("take layers, nodes or groups out of their lane")
      .argument("<file>")
      .argument("<members...>"),
  ).action(async (file: string, members: string[], opts: Opts) => {
    await write(file, { op: "lane.leave", members }, opts);
  });
  json(
    lane
      .command("rename")
      .description("change a lane's label")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>", "the name, short, as a reader would say it"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "lane.rename", id, ...pick(opts, ["label"]) }, opts);
  });
  json(
    lane
      .command("remove")
      .description("remove a lane; its members stay")
      .argument("<file>")
      .argument("<id>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "lane.remove", id }, opts);
  });

  const column = program.command("column").description("column guides: add, join, leave, remove");
  json(
    column
      .command("add")
      .description("add a column, last unless placed, optionally with members")
      .argument("<file>")
      .argument("<id>")
      .option("--nodes <ids>", "the members, comma-separated: nodes, or groups with their nodes")
      .option("--before <column>", "just left of this column")
      .option("--after <column>", "just right of this column"),
  ).action(async (file: string, id: string, opts: Opts) => {
    const raw: Record<string, unknown> = {
      op: "column.add",
      id,
      ...pick(opts, ["before", "after"]),
    };
    if (typeof opts.nodes === "string") raw.nodes = splitIds(opts.nodes);
    await write(file, raw, opts);
  });
  json(
    column
      .command("join")
      .description("put nodes, or groups with their nodes, into a column")
      .argument("<file>")
      .argument("<column>")
      .argument("<members...>"),
  ).action(async (file: string, c: string, members: string[], opts: Opts) => {
    await write(file, { op: "column.join", column: c, members }, opts);
  });
  json(
    column
      .command("leave")
      .description("take nodes, or groups' nodes, out of their column")
      .argument("<file>")
      .argument("<members...>"),
  ).action(async (file: string, members: string[], opts: Opts) => {
    await write(file, { op: "column.leave", members }, opts);
  });
  json(
    column
      .command("remove")
      .description("remove a column; its nodes stay where they are")
      .argument("<file>")
      .argument("<id>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "column.remove", id }, opts);
  });

  const wall = program
    .command("wall")
    .description("walls between parts: add, allow, relabel, remove");
  json(
    wall
      .command("add")
      .description("add a wall between two sides; grafical decides where it runs")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--between <ids>", "one side: nodes and groups, comma-separated")
      .requiredOption("--and <ids>", "the other side")
      .option("--allow <ids>", "lines, or nodes and groups whose lines, may cross")
      .option("--label <text>", "draw a dashed divider through it with these words"),
  ).action(async (file: string, id: string, opts: Opts) => {
    const raw: Record<string, unknown> = { op: "wall.add", id, ...pick(opts, ["label"]) };
    for (const key of ["between", "and", "allow"] as const) {
      const v = opts[key];
      if (typeof v === "string") raw[key] = splitIds(v);
    }
    await write(file, raw, opts);
  });
  json(
    wall
      .command("allow")
      .description("let lines through a wall: by id, or every line of a node or group")
      .argument("<file>")
      .argument("<id>")
      .argument("<allow...>", "lines, or nodes and groups whose lines, may cross")
      .option("--off", "stop letting them through"),
  ).action(async (file: string, id: string, pass: string[], opts: Opts) => {
    await write(
      file,
      { op: "wall.allow", id, allow: pass, ...(opts.off === true ? { off: true } : {}) },
      opts,
    );
  });
  json(
    wall
      .command("relabel")
      .description("set the words on a wall's divider; without --label, it is space alone")
      .argument("<file>")
      .argument("<id>")
      .option("--label <text>", "draw a dashed divider through it with these words"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "wall.relabel", id, ...pick(opts, ["label"]) }, opts);
  });
  json(
    wall.command("remove").description("remove a wall").argument("<file>").argument("<id>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "wall.remove", id }, opts);
  });

  const note = program.command("note").description("notes on a box, line, group: add, remove");
  json(
    note
      .command("add")
      .description("add a note to a node, group or line, or replace the one it has")
      .argument("<file>")
      .requiredOption("--on <id>", "the node, group or line it is about")
      .requiredOption("--text <text>", "a sentence or two")
      .option("--footnote", "a number on it and the text at the bottom, rather than a card"),
  ).action(async (file: string, opts: Opts) => {
    await write(file, { op: "note.add", ...pick(opts, ["on", "text", "footnote"]) }, opts);
  });
  json(
    note
      .command("remove")
      .description("remove a note")
      .argument("<file>")
      .requiredOption("--on <id>", "the node, group or line it is about"),
  ).action(async (file: string, opts: Opts) => {
    await write(file, { op: "note.remove", ...pick(opts, ["on"]) }, opts);
  });

  const layer = program
    .command("layer")
    .description("rows: add, move, split, rename, look, remove");
  json(
    layer
      .command("add")
      .description("add a layer, at the bottom unless placed")
      .argument("<file>")
      .argument("<id>")
      .option("--label <text>", "the name, short, as a reader would say it")
      .option("--before <layer>", "just above this row")
      .option("--after <layer>", "just below this row"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "layer.add", id, ...pick(opts, ["label", "before", "after"]) }, opts);
  });

  const node = program
    .command("node")
    .description(
      "boxes: add, move, swap, align, merge, kind, describe, icon, rename, resize, emphasize, remove",
    );
  json(
    withSteps(
      node
        .command("add")
        .description("add a node to a layer, or by steps from another box")
        .argument("<file>")
        .argument("<id>")
        .option("--layer <layer>", "the row")
        .requiredOption("--label <text>", "the name, short, as a reader would say it")
        .option("--kind <kind>", "what the box is: see Kinds below")
        .option("--sublabel <text>", "a quieter second line: technology, port, count")
        .option("--size <size>", "s, m or l; leave it out")
        .option("--first", "the first place")
        .option("--last", "the last place")
        .option("--before <node>", "just before this node in the row")
        .option("--after <node>", "just after this node in the row")
        .option("--align <node>", "sit directly above or below a node in another layer")
        .option("--accent", "mark as one of the nodes to see first"),
    ),
  ).action(async (file: string, id: string, opts: Opts) => {
    const names = ["layer", "label", "kind", "sublabel", "size", "align", "accent", ...POSITION];
    await write(file, { op: "node.add", id, ...pick(opts, names), ...stepFlags(opts) }, opts);
  });
  json(
    node
      .command("rename")
      .description("change a node's label")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>", "the name, short, as a reader would say it"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "node.rename", id, ...pick(opts, ["label"]) }, opts);
  });
  json(
    node
      .command("resize")
      .description("set a node's box size; without --size, grafical sizes it to its text")
      .argument("<file>")
      .argument("<id>")
      .option("--size <size>", "s, m or l"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "node.resize", id, ...pick(opts, ["size"]) }, opts);
  });
  json(
    withSteps(
      node
        .command("move")
        .description("move a node to another layer or position, or by steps from another box")
        .argument("<file>")
        .argument("<id>")
        .option("--layer <layer>", "the row to move it to")
        .option("--first", "the first place")
        .option("--last", "the last place")
        .option("--before <node>", "just before this node in the row")
        .option("--after <node>", "just after this node in the row"),
    ),
  ).action(async (file: string, id: string, opts: Opts) => {
    const op = { op: "node.move", id, ...pick(opts, ["layer", ...POSITION]), ...stepFlags(opts) };
    await write(file, op, opts);
  });
  json(
    node
      .command("remove")
      .description("remove a node and its edges")
      .argument("<file>")
      .argument("<id>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "node.remove", id }, opts);
  });

  const edge = program
    .command("edge")
    .description(
      "lines: add, emphasize, retarget, reverse, kind, relabel, weight, both, pass, step, remove",
    );
  json(
    edge
      .command("add")
      .description("connect two nodes")
      .argument("<file>")
      .argument("<from>")
      .argument("<to>")
      .option("--id <id>", "default: <from>-><to>")
      .option("--label <text>", "what the line means; leave it out when that is obvious")
      .option("--kind <kind>", "see Kinds below")
      .option("--both", "an arrowhead at both ends")
      .option("--pass", "may pass a bar, a row with no box, between its ends"),
  ).action(async (file: string, from: string, to: string, opts: Opts) => {
    await write(
      file,
      { op: "edge.add", from, to, ...pick(opts, ["id", "label", "kind", "both", "pass"]) },
      opts,
    );
  });
  json(
    edge.command("remove").description("remove an edge").argument("<file>").argument("<id>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "edge.remove", id }, opts);
  });
  json(
    edge
      .command("relabel")
      .description("set an edge's label; without --label, clear it")
      .argument("<file>")
      .argument("<id>")
      .option("--label <text>", "what the line means; leave it out when that is obvious"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "edge.relabel", id, ...pick(opts, ["label"]) }, opts);
  });
  json(
    edge
      .command("kind")
      .description("change an edge's kind")
      .argument("<file>")
      .argument("<id>")
      .argument("<kind>", EDGE_KINDS.join(", ")),
  ).action(async (file: string, id: string, kind: string, opts: Opts) => {
    await write(file, { op: "edge.kind", id, kind }, opts);
  });
  json(
    edge
      .command("emphasize")
      .description("draw edges thick, as the main path, or thin again with --off")
      .argument("<file>")
      .argument("<edges...>")
      .option("--off", "undo it"),
  ).action(async (file: string, edges: string[], opts: Opts) => {
    await write(file, { op: "edge.emphasize", edges, ...pick(opts, ["off"]) }, opts);
  });
  json(
    edge
      .command("weight")
      .description("set how thick edges are: a level or a width in pixels; without --weight, thin")
      .argument("<file>")
      .argument("<edges...>")
      .option(
        "--weight <weight>",
        "thin, thick, heavy or a stylesheet's level, or pixels, 0.5 to 8",
      ),
  ).action(async (file: string, edges: string[], opts: Opts) => {
    const w = opts.weight;
    // A number of pixels is a number in the file; anything else is a level name.
    const weight = typeof w === "string" && /^[0-9.]+$/.test(w) ? Number(w) : w;
    await write(
      file,
      { op: "edge.weight", edges, ...(weight === undefined ? {} : { weight }) },
      opts,
    );
  });
  json(
    edge
      .command("both")
      .description("draw an arrowhead at both ends of an edge, or at one end again with --off")
      .argument("<file>")
      .argument("<id>")
      .option("--off", "undo it"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "edge.both", id, ...pick(opts, ["off"]) }, opts);
  });
  json(
    edge
      .command("pass")
      .description("let a line pass the bars between its ends, or no longer with --off")
      .argument("<file>")
      .argument("<id>")
      .option("--off", "undo it"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "edge.pass", id, ...pick(opts, ["off"]) }, opts);
  });
  json(
    edge
      .command("step")
      .description("number an edge as a step of a process; without --n, clear it")
      .argument("<file>")
      .argument("<id>")
      .option("--n <number>", `the step's number, 1 to ${STEP_NUMBER_MAX}`),
  ).action(async (file: string, id: string, opts: Opts) => {
    const n = opts.n;
    // A number is a number in the file, as in edge weight; anything else is refused.
    const step = typeof n === "string" && /^[0-9.]+$/.test(n) ? Number(n) : n;
    await write(file, { op: "edge.step", id, ...(step === undefined ? {} : { n: step }) }, opts);
  });
  json(
    edge
      .command("reverse")
      .description("swap an edge's direction")
      .argument("<file>")
      .argument("<id>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "edge.reverse", id }, opts);
  });
  json(
    edge
      .command("retarget")
      .description("move one or both ends of an edge; its id, kind and label stay")
      .argument("<file>")
      .argument("<id>")
      .option("--from <end>", "a node, group, layer or lane")
      .option("--to <end>", "a node, group, layer or lane"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "edge.retarget", id, ...pick(opts, ["from", "to"]) }, opts);
  });

  json(
    node
      .command("describe")
      .description("set a node's sublabel; without --text, clear it")
      .argument("<file>")
      .argument("<id>")
      .option("--text <text>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "node.describe", id, ...pick(opts, ["text"]) }, opts);
  });
  json(
    node
      .command("kind")
      .description("change a node's kind")
      .argument("<file>")
      .argument("<id>")
      .argument("<kind>", NODE_KINDS.join(", ")),
  ).action(async (file: string, id: string, kind: string, opts: Opts) => {
    await write(file, { op: "node.kind", id, kind }, opts);
  });
  json(
    node
      .command("emphasize")
      .description("turn a node's accent on, or off with --off")
      .argument("<file>")
      .argument("<id>")
      .option("--off", "undo it"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "node.emphasize", id, ...pick(opts, ["off"]) }, opts);
  });
  json(
    node
      .command("icon")
      .description("put a mark on a node: an emoji, a short text, or an SVG or PNG file")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--slot <slot>", MARK_SLOTS.join(", "))
      .option(
        "--icon <mark>",
        "an emoji, up to 6 characters, or a file next to the diagram; leave it out to clear",
      )
      .option(
        "--bg <color>",
        `a text mark's background: ${Object.keys(MARK_COLORS).join(", ")} or #rrggbb`,
      )
      .option("--fg <color>", "a text mark's text color; the default reads on the background")
      .option("--border <color>", "a text mark's border color; the default has none")
      .option("--shape <shape>", `a text mark's badge: ${MARK_SHAPES.join(", ")}`)
      .option("--size <size>", `any mark's size: ${MARK_SIZES.join(", ")}`),
  ).action(async (file: string, id: string, opts: Opts) => {
    const names = ["slot", "icon", "bg", "fg", "border", "shape", "size"];
    await write(file, { op: "node.icon", id, ...pick(opts, names) }, opts);
  });
  json(
    node
      .command("align")
      .description("sit directly above or below a node; without --to, clear it")
      .argument("<file>")
      .argument("<id>")
      .option("--to <node>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "node.align", id, ...pick(opts, ["to"]) }, opts);
  });
  json(
    node
      .command("swap")
      .description("two nodes trade places")
      .argument("<file>")
      .argument("<a>")
      .argument("<b>"),
  ).action(async (file: string, a: string, b: string, opts: Opts) => {
    await write(file, { op: "node.swap", a, b }, opts);
  });
  json(
    node
      .command("merge")
      .description("replace nodes with one new node that keeps all their edges")
      .argument("<file>")
      .argument("<id>", "the new node's id")
      .requiredOption("--nodes <ids>", "comma-separated nodes to merge")
      .requiredOption("--label <text>", "the name, short, as a reader would say it")
      .option("--sublabel <text>")
      .option("--kind <kind>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    const raw: Record<string, unknown> = {
      op: "node.merge",
      id,
      ...pick(opts, ["label", "sublabel", "kind"]),
    };
    if (typeof opts.nodes === "string") raw.nodes = splitIds(opts.nodes);
    await write(file, raw, opts);
  });

  json(
    layer
      .command("rename")
      .description("change a layer's label")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>", "the name, short, as a reader would say it"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "layer.rename", id, ...pick(opts, ["label"]) }, opts);
  });
  json(
    layer
      .command("look")
      .description("draw a row as a box or a band, even when no line ends at it")
      .argument("<file>")
      .argument("<id>")
      .argument("[look]", "box or band"),
  ).action(async (file: string, id: string, look: string | undefined, opts: Opts) => {
    await write(file, { op: "layer.look", id, ...(look === undefined ? {} : { look }) }, opts);
  });
  json(
    layer
      .command("move")
      .description("move a layer up or down")
      .argument("<file>")
      .argument("<id>")
      .option("--first", "the first place")
      .option("--last", "the last place")
      .option("--before <layer>", "just above this row")
      .option("--after <layer>", "just below this row"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "layer.move", id, ...pick(opts, POSITION) }, opts);
  });
  json(
    layer
      .command("remove")
      .description("remove an empty layer")
      .argument("<file>")
      .argument("<id>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "layer.remove", id }, opts);
  });
  json(
    layer
      .command("split")
      .description("move the second half of a layer, or from --from on, into a new layer below")
      .argument("<file>")
      .argument("<id>")
      .argument("<into>", "the new layer's id")
      .requiredOption("--label <text>", "the new layer's label")
      .option("--from <node>", "the first node to move"),
  ).action(async (file: string, id: string, into: string, opts: Opts) => {
    await write(file, { op: "layer.split", id, into, ...pick(opts, ["label", "from"]) }, opts);
  });

  json(
    group
      .command("describe")
      .description("set a group's second, quieter label; without --text, clear it")
      .argument("<file>")
      .argument("<id>")
      .option("--text <text>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "group.describe", id, ...pick(opts, ["text"]) }, opts);
  });
  json(
    group
      .command("title")
      .alias("label")
      .description(
        "say where a group's label sits; without a place, the engine seats it at the top",
      )
      .argument("<file>")
      .argument("<id>")
      .argument("[at]", "where the label sits"),
  ).action(async (file: string, id: string, at: string | undefined, opts: Opts) => {
    await write(file, { op: "group.title", id, ...(at === undefined ? {} : { at }) }, opts);
  });
  json(
    group
      .command("order")
      .description(
        "put a group's boxes, its inner groups' too, before or after another group's, in every shared layer",
      )
      .argument("<file>")
      .argument("<id>")
      .option("--before <group>", "just before this group")
      .option("--after <group>", "just after this group"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "group.order", id, ...pick(opts, ["before", "after"]) }, opts);
  });
  json(
    group
      .command("copy")
      .description("copy a group with its inner groups, boxes and the lines between them")
      .argument("<file>")
      .argument("<id>")
      .argument("<into>", "the copy's id")
      .requiredOption("--label <text>", "the copy's label")
      .requiredOption("--suffix <suffix>", "added to every other id the copy makes")
      .option("--before <group>", "just before this group, in every row of the copy")
      .option("--after <group>", "just after this group, in every row of the copy")
      .option("--outside", "copy the lines to boxes outside the group too"),
  ).action(async (file: string, id: string, into: string, opts: Opts) => {
    const raw: Record<string, unknown> = {
      op: "group.copy",
      id,
      into,
      ...pick(opts, ["label", "suffix", "before", "after"]),
    };
    if (opts.outside === true) raw.outside = true;
    await write(file, raw, opts);
  });

  json(
    diagram
      .command("title")
      .description("change the title")
      .argument("<file>")
      .requiredOption("--text <text>"),
  ).action(async (file: string, opts: Opts) => {
    await write(file, { op: "diagram.title", ...pick(opts, ["text"]) }, opts);
  });
  json(
    diagram
      .command("density")
      .description("change the spacing")
      .argument("<file>")
      .argument("<density>", "compact, normal or airy"),
  ).action(async (file: string, density: string, opts: Opts) => {
    await write(file, { op: "diagram.density", density }, opts);
  });
  json(
    diagram
      .command("legend")
      .description(
        "name a line style, line width or mark in the legend; without --text, take its entry away",
      )
      .argument("<file>")
      .argument("[style]", "how the lines look: solid, dashed, dotted or plain")
      .option(
        "--weight <weight>",
        "a line width instead: thick, heavy, a stylesheet's level, or pixels",
      )
      .option("--mark <mark>", "a mark instead: its emoji, text or file, as node icon set it")
      .option("--text <text>"),
  ).action(async (file: string, style: string | undefined, opts: Opts) => {
    const w = opts.weight;
    // A number of pixels is a number, as in edge weight (DESIGN.md, "Edge weights").
    const weight = typeof w === "string" && /^[0-9.]+$/.test(w) ? Number(w) : w;
    await write(
      file,
      {
        op: "diagram.legend",
        ...(style === undefined ? {} : { style }),
        ...(weight === undefined ? {} : { weight }),
        ...pick(opts, ["mark", "text"]),
      },
      opts,
    );
  });
  json(
    program
      .command("apply")
      .description("apply a batch of operations, all or none")
      .argument("<file>")
      .argument("<batch.yaml>"),
  ).action(async (file: string, batch: string, opts: Opts) => {
    const ops = readBatch(batch, opts);
    // A batch is usually a draft or a large change: its report carries the counts (DESIGN.md, "Records over prose").
    if (ops !== undefined) await finish(file, ops, opts, false, true);
  });

  json(
    program
      .command("try")
      .description("counts before and after, no write")
      .argument("<file>")
      .argument("<batch...>"),
  ).action(async (file: string, batches: string[], opts: Opts) => {
    if (batches.length === 1) {
      const ops = readBatch(batches[0] as string, opts);
      if (ops === undefined) return;
      const r = await tryWrite(file, ops);
      if (isReport(r)) {
        process.exitCode = emit(r, opts.json === true);
      } else if (opts.json === true) {
        const body = { ok: true, changed: r.report.changed, before: r.before, after: r.after };
        process.stdout.write(`${JSON.stringify({ ...body, delta: delta(r.before, r.after) })}\n`);
      } else {
        process.stdout.write(
          `${record("ok", { changed: r.report.changed, written: "no" })}\n${countsText(r.before, "before")}\n${countsText(r.after, "after")}\n${deltaText(delta(r.before, r.after))}\n`,
        );
      }
      return;
    }
    process.exitCode = await tryMany(file, batches, opts.json === true);
  });

  json(
    program
      .command("show")
      .description("print a compact view of a diagram")
      .argument("<file>")
      .option("--drawn", "how it is drawn: each box, line and group, as facts and counts"),
  ).action(async (file: string, opts: Opts) => {
    const d = loadDiagram(file);
    if (isReport(d)) {
      process.exitCode = emit(d, opts.json === true);
    } else if (opts.drawn === true) {
      const dr = drawing(d, layout(d, await createMeasurer()));
      process.stdout.write(
        opts.json === true
          ? `${JSON.stringify({ ok: true, drawing: dr }, (k, v) => (k === "composition" ? undefined : v))}\n`
          : drawingText(dr),
      );
    } else if (opts.json === true) {
      process.stdout.write(`${JSON.stringify({ ok: true, diagram: d })}\n`);
    } else {
      process.stdout.write(showDiagram(d));
    }
  });

  json(
    program
      .command("diff")
      .description("changes since a revision, as operations")
      .argument("<file>")
      .argument("[rev]", "a git revision", "HEAD"),
  ).action((file: string, rev: string, opts: Opts) => {
    const now = loadDiagram(file);
    if (isReport(now)) {
      process.exitCode = emit(now, opts.json === true);
      return;
    }
    const was = atRevision(file, rev);
    if (was !== null && isReport(was)) {
      process.exitCode = emit(was, opts.json === true);
      return;
    }
    const ops = diffDiagrams(was, now);
    if (opts.json === true) {
      process.stdout.write(`${JSON.stringify({ ok: true, ops })}\n`);
    } else {
      process.stdout.write(formatOps(ops));
    }
  });

  json(
    program
      .command("check")
      .description("the defects you can fix, and the counts")
      .argument("<file>")
      .option("--all", "also report engine-owned defects, which are engine bugs"),
  ).action(async (file: string, opts: Opts) => {
    const d = loadDiagram(file);
    if (isReport(d)) {
      process.exitCode = emit(d, opts.json === true);
      return;
    }
    const m = await createMeasurer();
    const defects = inspect(d, m, opts.all === true);
    const dr = drawing(d, layout(d, m));
    process.exitCode = emit(
      {
        ok: defects.length === 0,
        changed: [],
        errors: [],
        defects,
        bent: bentLines(dr.lines),
        counts: dr.counts,
        kinds: kindsOf(d),
      },
      opts.json === true,
    );
  });

  json(
    program
      .command("render")
      .description("write SVG and PNG")
      .argument("<file>")
      .option("--svg [out]", "write only the SVG: to <out>, or beside the file")
      .option("--png [out]", "write only the PNG: to <out>, or beside the file")
      .option("--scale <n>", "PNG scale, 1 to 4", "2"),
  ).action(async (file: string, opts: Opts) => {
    const scale = Number(opts.scale);
    if (!Number.isFinite(scale) || scale < 1 || scale > 4) {
      throw usage("bad-scale", { field: "--scale", found: String(opts.scale) }, { min: 1, max: 4 });
    }
    const d = loadDiagram(file);
    if (isReport(d)) {
      process.exitCode = emit(d, opts.json === true);
      return;
    }
    const m = await createMeasurer();
    const scene = layout(d, m);
    const defects = inspect(d, m);
    const both = opts.svg === undefined && opts.png === undefined;
    const files: string[] = [];
    const svg = renderSvg(scene);
    if (both || opts.svg !== undefined) {
      const out = typeof opts.svg === "string" ? opts.svg : `${renderName(file)}.svg`;
      writeAtomic(out, svg);
      files.push(out);
    }
    if (both || opts.png !== undefined) {
      const out = typeof opts.png === "string" ? opts.png : `${renderName(file)}.png`;
      writeAtomic(out, renderPng(svg, scale));
      files.push(out);
    }
    const dr = drawing(d, scene);
    const report = {
      ok: defects.length === 0,
      changed: [],
      errors: [],
      defects,
      bent: bentLines(dr.lines),
      counts: dr.counts,
      kinds: kindsOf(d),
    };
    const wrote = files.map((f) => record("wrote", { file: f }));
    process.exitCode = emit(report, opts.json === true, { files }, wrote);
  });

  program
    .command("view")
    .description("a live window, redrawn on every change")
    .argument("<file>")
    .option("--port <n>", "the local port to serve on; default: a free one")
    .option("--no-open", "print the address instead of opening a window")
    .action(async (file: string, opts: Opts) => {
      const port = Number(opts.port ?? 0);
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw usage(
          "bad-port",
          { field: "--port", found: String(opts.port) },
          { min: 0, max: 65535 },
        );
      }
      // The file need not exist yet: the window can open before the agent starts drawing.
      if (!existsSync(dirname(file))) {
        throw usage("no-folder", { field: "file", found: dirname(file) });
      }
      const viewer = await startViewer(file, port);
      process.stdout.write(`${record("viewing", { file, url: viewer.url, stop: "ctrl-c" })}\n`);
      if (opts.open !== false) openWindow(viewer.url, windowSize(viewer.size()));
      await new Promise<void>((resolve) => {
        process.once("SIGINT", resolve);
        process.once("SIGTERM", resolve);
      });
      await viewer.close();
    });

  // Best practice apart from the help, for an agent that wants it (DESIGN.md, "Help for the tool, guides for best
  // practice").
  program
    .command("guide")
    .description("how common kinds of diagram are usually drawn, if you want it")
    .argument("[name]", "a guide; without one, the list of them")
    .action((name: string | undefined) => {
      if (name === undefined) {
        process.stdout.write(`${guideList()}\n`);
        return;
      }
      const guide = guideNamed(name);
      if (guide === undefined) {
        throw usage(
          "unknown-guide",
          { found: name },
          { likely: closest(name, Object.keys(GUIDES), 2) },
        );
      }
      process.stdout.write(`${guide.text}\n`);
    });

  attachHelp(program, new Map([...opCommands(program)].map(([op, c]) => [c, op])));
  // A command's page is <command> --help, the one way to it: commander's own help command would be a second, which
  // takes one word and prints the entry page for a wrong one.
  for (const c of [program, ...program.commands]) c.helpCommand(false);
  return program;
}

/** A batch file's operations, or the refusal to read it. */
function readBatchOps(batch: string): Op[] | Report {
  let text: string;
  let raw: unknown;
  try {
    text = readFileSync(batch, "utf8");
  } catch {
    return fileError("batch-unreadable", batch);
  }
  try {
    raw = parse(text);
  } catch (err) {
    return failure([yamlError(text, err)]);
  }
  const ops = parseOps(raw);
  return isOps(ops) ? ops : failure(ops);
}

/** A batch file's operations, or nothing when it is refused, with the refusal printed. */
function readBatch(batch: string, opts: Opts): Op[] | undefined {
  const ops = readBatchOps(batch);
  if (isReport(ops)) {
    process.exitCode = emit(ops, opts.json === true);
    return undefined;
  }
  return ops;
}

/**
 * Several batches tried against one file (FEATURES.md, "Trying a change"): the `before` counts once, then each
 * batch's `ok`, `after` and `delta` records keyed by `batch=<file>`; a refused batch prints its refusal records
 * with the same key, and the rest are still tried. Exit 1 when any is refused.
 */
async function tryMany(file: string, batches: string[], json: boolean): Promise<number> {
  const out: string[] = [];
  const results: Record<string, unknown>[] = [];
  let before: Counts | undefined;
  let code = 0;
  for (const batch of batches) {
    const ops = readBatchOps(batch);
    const r = isReport(ops) ? ops : await tryWrite(file, ops);
    if (isReport(r)) {
      code = 1;
      // The refusal as apply prints it, its outcome keyed by the batch.
      const [, ...rest] = formatReport(r).trimEnd().split("\n");
      out.push(record("failed", { batch, changed: [] }), ...rest, "");
      results.push({ batch, ...reportBody(r) });
      continue;
    }
    before ??= r.before;
    const d = delta(r.before, r.after);
    out.push(
      record("ok", { batch, changed: r.report.changed, written: "no" }),
      countsText(r.after, "after").replace("after", `after batch=${batch}`),
      deltaText(d).replace("delta", `delta batch=${batch}`),
    );
    results.push({ batch, ok: true, changed: r.report.changed, after: r.after, delta: d });
  }
  if (json) {
    process.stdout.write(
      `${JSON.stringify({ ok: code === 0, before: before ?? null, batches: results })}\n`,
    );
  } else {
    if (before !== undefined) out.unshift(countsText(before, "before"));
    process.stdout.write(`${out.join("\n").trimEnd()}\n`);
  }
  return code;
}

function isOps(x: Op[] | unknown[]): x is Op[] {
  return x.every((i) => typeof i === "object" && i !== null && "op" in i && !("code" in i));
}

/** A command line grafical cannot read: exit 2, with its block in place of anything else. */
class UsageError extends CommanderError {
  readonly problem: Block;
  constructor(problem: Block) {
    super(2, "grafical.usage", problem.code);
    this.problem = problem;
  }
}

function usage(code: UsageCode, given: { field?: string; found?: string }, facts?: Facts) {
  return new UsageError(usageBlock(code, given, facts));
}

/** A usage error as grafical prints it: failed, then its block (DESIGN.md, "Refusals say what happened and which commands can change it"). */
function usageText(b: Block): string {
  return `${record("failed", { changed: [] })}\n\n${block(b)}\n`;
}

/** The arguments a command takes, as its usage names them: <file>, [at], <nodes...>. */
function takes(c: Command): string[] {
  return c.registeredArguments.map((a) => {
    const name = `${a.name()}${a.variadic ? "..." : ""}`;
    return a.required ? `<${name}>` : `[${name}]`;
  });
}

/**
 * The parser's refusal as a block: its code in kebab case, and what its sentence names. A missing argument or option
 * is the field; extra arguments are what was found, with the arguments the command takes.
 */
function parserError(err: CommanderError, program: Command, args: string[]): Block {
  const code = err.code
    .slice("commander.".length)
    .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`) as UsageCode;
  const quoted = /'([^']*)'/.exec(err.message)?.[1];
  switch (code) {
    case "missing-argument":
      return usageBlock(code, { field: quoted ?? "" });
    case "option-missing-argument":
    case "missing-mandatory-option-value":
      return usageBlock(code, {
        field: (quoted ?? "").split(/[\s,]+/).find((w) => w.startsWith("--")) ?? quoted ?? "",
      });
    case "excess-arguments": {
      const [command] = follow(
        program,
        args.filter((a) => !a.startsWith("-")),
      );
      const m = /Expected (\d+) arguments? but got \d+: (.*)\.$/.exec(err.message);
      const extra = m === null ? [] : (m[2] ?? "").split(", ").slice(Number(m[1]));
      return usageBlock(code, { found: extra }, { takes: takes(command) });
    }
    case "unknown-option": {
      const likely = /Did you mean (\S+?)\?/.exec(err.message)?.[1];
      return usageBlock(
        code,
        { found: quoted ?? "" },
        likely === undefined ? {} : { likely: [likely] },
      );
    }
    default:
      return usageBlock(USAGE_CODES.includes(code) ? code : "unknown-command", {
        found: quoted ?? "",
      });
  }
}

/** The commands the words name below a command, as far as they name one, and the last of them. */
function follow(from: Command, words: string[]): [Command, string[]] {
  let at = from;
  const path: string[] = [];
  for (const w of words) {
    const next = at.commands.find((c) => c.name() === w || c.aliases().includes(w));
    if (next === undefined) break;
    at = next;
    path.push(w);
  }
  return [at, path];
}

/**
 * A word where a command belongs that names none, as a block that gives the word it most likely means as a value
 * (DESIGN.md, "Refusals say what happened and which commands can change it"): "help" means --help, "node add" or
 * node.add is two names in one word, and nodee a misspelling. Undefined when the command line names commands only;
 * commander reads the rest. Commander would print the entry page for a wrong name with --help, and say nothing of
 * what was meant.
 */
export function wrongCommand(program: Command, args: string[]): Block | undefined {
  // The program and its groups take no option with a value, so every other word up to a command is a command's name.
  const words = args.filter((a) => !a.startsWith("-"));
  const [at, path] = follow(program, words);
  const word = words[path.length];
  if (at.commands.length === 0 || word === undefined) return undefined;
  let likely: string | undefined;
  const parts = word.split(/[\s.]+/);
  const named = follow(at, parts)[1];
  if (word === "help") likely = "--help";
  else if (parts.length > 1 && named.length === parts.length) likely = named.join(" ");
  else {
    const [near] = closest(
      word,
      at.commands.map((c) => c.name()),
      1,
    );
    if (near !== undefined && editDistance(word, near) <= Math.max(1, Math.floor(word.length / 3)))
      likely = near;
  }
  return usageBlock(
    "unknown-command",
    { found: word },
    likely === undefined ? {} : { likely: [likely] },
  );
}

async function main(argv: string[]) {
  const program = build();
  try {
    const wrong = wrongCommand(program, argv.slice(2));
    if (wrong !== undefined) throw new UsageError(wrong);
    await program.parseAsync(argv);
  } catch (err) {
    if (err instanceof CommanderError) {
      if (err.code === "commander.helpDisplayed" || err.code === "commander.version") {
        process.exitCode = 0;
        return;
      }
      // A usage error is a block too (DESIGN.md, "Refusals say what happened and which commands can change it"),
      // in place of commander's sentence.
      if (err instanceof UsageError) process.stderr.write(usageText(err.problem));
      else if (err.code.startsWith("commander.") && err.code !== "commander.help") {
        process.stderr.write(usageText(parserError(err, program, argv.slice(2))));
      }
      process.exitCode = 2;
      return;
    }
    throw err;
  }
}

// Run only as the command, not when a test imports the command line to read it.
if (import.meta.main) await main(process.argv);
