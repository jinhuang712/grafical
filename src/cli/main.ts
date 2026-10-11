#!/usr/bin/env node
// The grafical command line (DESIGN.md D16). Exit codes: 0 success, 1 an
// operation error or a defect, 2 a usage error.

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Command, CommanderError } from "commander";
import { parse } from "yaml";
import { advise } from "../check/advice.ts";
import { layout } from "../layout/index.ts";
import { diffDiagrams } from "../model/diff.ts";
import type { Op } from "../model/ops.ts";
import { parseOp, parseOps } from "../model/ops.ts";
import { renderPng, renderSvg } from "../render/index.ts";
import { createMeasurer } from "../text/index.ts";
import { atRevision, formatOps } from "./diff.ts";
import { GUIDE } from "./guide.ts";
import {
  emit,
  failure,
  fileError,
  inspect,
  isReport,
  loadDiagram,
  runWrite,
  writeAtomic,
} from "./pipeline.ts";
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

/** Runs an operation built from flags through the shared write path. */
async function write(file: string, raw: Record<string, unknown>, opts: Opts, create = false) {
  const op = parseOp(raw, 0);
  if (Array.isArray(op)) {
    process.exitCode = emit(failure(op), opts.json === true);
    return;
  }
  await finish(file, [op], opts, create);
}

async function finish(file: string, ops: Op[], opts: Opts, create = false) {
  const report = await runWrite(file, ops, create);
  process.exitCode = emit(report, opts.json === true);
}

function renderName(file: string): string {
  const base = basename(file).replace(/\.grafical\.ya?ml$|\.ya?ml$/, "");
  return join(dirname(file), base);
}

function build(): Command {
  const program = new Command("grafical");
  program
    .description("Build architecture diagrams in small, checked steps. Run `grafical guide`.")
    .exitOverride()
    .configureOutput({
      writeOut: (s) => process.stdout.write(s),
      writeErr: (s) => process.stderr.write(s),
    })
    .showHelpAfterError(false);

  const json = (c: Command): Command => c.option("--json", "print the report as JSON");

  json(
    program
      .command("new")
      .description("create an empty diagram file")
      .argument("<file>")
      .requiredOption("--title <text>", "diagram title")
      .option("--density <density>", "compact, normal or airy")
      .option("--sizing <sizing>", "auto (default) or fixed: how nodes without --size are sized")
      .option(
        "--style <style>",
        "a theme (default, dark, print) or a <name>.grafical-style.yaml beside the file",
      )
      .option("--subtitle <text>", "one sentence under the title")
      .option("--note <text>", 'a footnote, such as "Not shown: ..."'),
  ).action(async (file: string, opts: Opts) => {
    const names = ["title", "density", "sizing", "style", "subtitle", "note"];
    await write(file, { op: "diagram.new", ...pick(opts, names) }, opts, true);
  });

  const diagram = program.command("diagram").description("diagram-wide settings and text");
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

  const group = program.command("group").description("group (system box) operations");
  json(
    group
      .command("add")
      .description("add a group, optionally with member nodes")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>")
      .option("--sublabel <text>", "a second, quieter part of the label")
      .option("--nodes <ids>", "comma-separated member node ids"),
  ).action(async (file: string, id: string, opts: Opts) => {
    const raw: Record<string, unknown> = {
      op: "group.add",
      id,
      ...pick(opts, ["label", "sublabel"]),
    };
    if (typeof opts.nodes === "string") raw.nodes = splitIds(opts.nodes);
    await write(file, raw, opts);
  });
  json(
    group
      .command("join")
      .description("put nodes into a group")
      .argument("<file>")
      .argument("<group>")
      .argument("<node...>"),
  ).action(async (file: string, g: string, nodes: string[], opts: Opts) => {
    await write(file, { op: "group.join", group: g, nodes }, opts);
  });
  json(
    group
      .command("leave")
      .description("take nodes out of their group")
      .argument("<file>")
      .argument("<node...>"),
  ).action(async (file: string, nodes: string[], opts: Opts) => {
    await write(file, { op: "group.leave", nodes }, opts);
  });
  json(
    group
      .command("rename")
      .description("change a group's label")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "group.rename", id, ...pick(opts, ["label"]) }, opts);
  });
  json(
    group
      .command("remove")
      .description("remove a group; its nodes stay")
      .argument("<file>")
      .argument("<id>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "group.remove", id }, opts);
  });

  const lane = program.command("lane").description("swimlane operations (D32)");
  json(
    lane
      .command("add")
      .description("add a lane, optionally with members: layers (rows), nodes (columns) or groups")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>")
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
      .argument("<member...>"),
  ).action(async (file: string, l: string, members: string[], opts: Opts) => {
    await write(file, { op: "lane.join", lane: l, members }, opts);
  });
  json(
    lane
      .command("leave")
      .description("take layers, nodes or groups out of their lane")
      .argument("<file>")
      .argument("<member...>"),
  ).action(async (file: string, members: string[], opts: Opts) => {
    await write(file, { op: "lane.leave", members }, opts);
  });
  json(
    lane
      .command("rename")
      .description("change a lane's label")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>"),
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

  const layer = program.command("layer").description("layer operations");
  json(
    layer
      .command("add")
      .description("add a layer, at the bottom unless placed")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>")
      .option("--before <layer>")
      .option("--after <layer>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "layer.add", id, ...pick(opts, ["label", "before", "after"]) }, opts);
  });

  const node = program.command("node").description("node operations");
  json(
    node
      .command("add")
      .description("add a node to a layer")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--layer <layer>")
      .requiredOption("--label <text>")
      .option("--kind <kind>", "service, store, queue, external or actor")
      .option("--sublabel <text>")
      .option("--size <size>", "s, m or l")
      .option("--first")
      .option("--last")
      .option("--before <node>")
      .option("--after <node>")
      .option("--align <node>", "sit directly above or below a node in another layer")
      .option("--accent", "mark as one of the nodes to see first"),
  ).action(async (file: string, id: string, opts: Opts) => {
    const names = ["layer", "label", "kind", "sublabel", "size", "align", "accent", ...POSITION];
    await write(file, { op: "node.add", id, ...pick(opts, names) }, opts);
  });
  json(
    node
      .command("rename")
      .description("change a node's label")
      .argument("<file>")
      .argument("<id>")
      .requiredOption("--label <text>"),
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
    node
      .command("move")
      .description("move a node to another layer or position")
      .argument("<file>")
      .argument("<id>")
      .option("--layer <layer>")
      .option("--first")
      .option("--last")
      .option("--before <node>")
      .option("--after <node>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "node.move", id, ...pick(opts, ["layer", ...POSITION]) }, opts);
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

  const edge = program.command("edge").description("edge operations");
  json(
    edge
      .command("add")
      .description("connect two nodes")
      .argument("<file>")
      .argument("<from>")
      .argument("<to>")
      .option("--id <id>", "default: <from>-><to>")
      .option("--label <text>")
      .option("--kind <kind>", "call, async, data, optional or link")
      .option("--both", "an arrowhead at both ends"),
  ).action(async (file: string, from: string, to: string, opts: Opts) => {
    await write(
      file,
      { op: "edge.add", from, to, ...pick(opts, ["id", "label", "kind", "both"]) },
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
      .option("--label <text>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "edge.relabel", id, ...pick(opts, ["label"]) }, opts);
  });
  json(
    edge
      .command("kind")
      .description("change an edge's kind")
      .argument("<file>")
      .argument("<id>")
      .argument("<kind>", "call, async, data, optional or link"),
  ).action(async (file: string, id: string, kind: string, opts: Opts) => {
    await write(file, { op: "edge.kind", id, kind }, opts);
  });
  json(
    edge
      .command("emphasize")
      .description("draw edges thick, as the main path, or thin again with --off")
      .argument("<file>")
      .argument("<id...>")
      .option("--off"),
  ).action(async (file: string, edges: string[], opts: Opts) => {
    await write(file, { op: "edge.emphasize", edges, ...pick(opts, ["off"]) }, opts);
  });
  json(
    edge
      .command("both")
      .description("draw an arrowhead at both ends of an edge, or at one end again with --off")
      .argument("<file>")
      .argument("<id>")
      .option("--off"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "edge.both", id, ...pick(opts, ["off"]) }, opts);
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
      .argument("<kind>", "service, store, queue, external or actor"),
  ).action(async (file: string, id: string, kind: string, opts: Opts) => {
    await write(file, { op: "node.kind", id, kind }, opts);
  });
  json(
    node
      .command("emphasize")
      .description("turn a node's accent on, or off with --off")
      .argument("<file>")
      .argument("<id>")
      .option("--off"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "node.emphasize", id, ...pick(opts, ["off"]) }, opts);
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
      .requiredOption("--label <text>")
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
      .requiredOption("--label <text>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "layer.rename", id, ...pick(opts, ["label"]) }, opts);
  });
  json(
    layer
      .command("move")
      .description("move a layer up or down")
      .argument("<file>")
      .argument("<id>")
      .option("--first")
      .option("--last")
      .option("--before <layer>")
      .option("--after <layer>"),
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
      .command("tidy")
      .description("reorder a layer's nodes once, to untangle lines")
      .argument("<file>")
      .argument("<id>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "layer.tidy", id }, opts);
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
      .command("order")
      .description("put a group's members before or after another group's, in every shared layer")
      .argument("<file>")
      .argument("<id>")
      .option("--before <group>")
      .option("--after <group>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "group.order", id, ...pick(opts, ["before", "after"]) }, opts);
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
      .description("name a line style in the legend; without --text, the default wording")
      .argument("<file>")
      .argument("<line>", "solid, dashed, dotted or plain")
      .option("--text <text>"),
  ).action(async (file: string, line: string, opts: Opts) => {
    await write(file, { op: "diagram.legend", line, ...pick(opts, ["text"]) }, opts);
  });
  json(
    diagram
      .command("tidy")
      .description("reorder every layer once, to untangle lines")
      .argument("<file>"),
  ).action(async (file: string, opts: Opts) => {
    await write(file, { op: "diagram.tidy" }, opts);
  });

  json(
    program
      .command("apply")
      .description("apply a YAML list of operations, all or nothing")
      .argument("<file>")
      .argument("<batch.yaml>"),
  ).action(async (file: string, batch: string, opts: Opts) => {
    let raw: unknown;
    try {
      raw = parse(readFileSync(batch, "utf8"));
    } catch (err) {
      const why = err instanceof Error ? (err.message.split("\n")[0] ?? "") : String(err);
      process.exitCode = emit(
        fileError("batch-unreadable", batch, "a readable YAML list of operations", why),
        opts.json === true,
      );
      return;
    }
    const ops = parseOps(raw);
    if (!isOps(ops)) {
      process.exitCode = emit(failure(ops), opts.json === true);
      return;
    }
    await finish(file, ops, opts);
  });

  json(
    program.command("show").description("print a compact view of a diagram").argument("<file>"),
  ).action((file: string, opts: Opts) => {
    const d = loadDiagram(file);
    if (isReport(d)) {
      process.exitCode = emit(d, opts.json === true);
    } else if (opts.json === true) {
      process.stdout.write(`${JSON.stringify({ ok: true, diagram: d })}\n`);
    } else {
      process.stdout.write(showDiagram(d));
    }
  });

  json(
    program
      .command("diff")
      .description("print how the file differs from a git revision, as a batch of operations")
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
      .description("report the defects you can fix; --all adds the engine's own")
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
    process.exitCode = emit(
      {
        ok: defects.length === 0,
        changed: [],
        errors: [],
        defects,
        warnings: advise(d, layout(d, m)),
      },
      opts.json === true,
    );
  });

  json(
    program
      .command("render")
      .description("write SVG and PNG; with neither --svg nor --png, both beside the file")
      .argument("<file>")
      .option("--svg <out>")
      .option("--png <out>")
      .option("--scale <n>", "PNG scale, 1 to 4", "2"),
  ).action(async (file: string, opts: Opts) => {
    const scale = Number(opts.scale);
    if (!Number.isFinite(scale) || scale < 1 || scale > 4) {
      throw new CommanderError(
        2,
        "grafical.badScale",
        `--scale must be from 1 to 4, got ${String(opts.scale)}`,
      );
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
    const report = {
      ok: defects.length === 0,
      changed: [],
      errors: [],
      defects,
      warnings: advise(d, scene),
    };
    if (opts.json !== true) for (const f of files) process.stdout.write(`wrote ${f}\n`);
    process.exitCode = emit(report, opts.json === true, { files });
  });

  program
    .command("view")
    .description("open a live view of the diagram, redrawn as it changes; Ctrl-C stops it")
    .argument("<file>")
    .option("--port <n>", "the local port to serve on; default: a free one")
    .option("--no-open", "print the address instead of opening a window")
    .action(async (file: string, opts: Opts) => {
      const port = Number(opts.port ?? 0);
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new CommanderError(
          2,
          "grafical.badPort",
          `--port must be a whole number from 0 to 65535, got ${String(opts.port)}`,
        );
      }
      // The file need not exist yet: the window can open before the agent starts drawing.
      if (!existsSync(dirname(file))) {
        throw new CommanderError(2, "grafical.noFolder", `no folder ${dirname(file)} to watch`);
      }
      const viewer = await startViewer(file, port);
      process.stdout.write(`viewing ${file} at ${viewer.url} (Ctrl-C stops it)\n`);
      if (opts.open !== false) openWindow(viewer.url, windowSize(viewer.size()));
      await new Promise<void>((resolve) => {
        process.once("SIGINT", resolve);
        process.once("SIGTERM", resolve);
      });
      await viewer.close();
    });

  json(program.command("guide").description("print the reference for agents")).action(
    (opts: Opts) => {
      if (opts.json === true)
        process.stdout.write(`${JSON.stringify({ ok: true, guide: GUIDE })}\n`);
      else process.stdout.write(GUIDE);
    },
  );

  return program;
}

function isOps(x: Op[] | unknown[]): x is Op[] {
  return x.every((i) => typeof i === "object" && i !== null && "op" in i && !("code" in i));
}

async function main(argv: string[]) {
  try {
    await build().parseAsync(argv);
  } catch (err) {
    if (err instanceof CommanderError) {
      if (err.code === "commander.helpDisplayed" || err.code === "commander.version") {
        process.exitCode = 0;
        return;
      }
      if (err.code.startsWith("grafical.")) process.stderr.write(`error: ${err.message}\n`);
      process.exitCode = 2;
      return;
    }
    throw err;
  }
}

await main(process.argv);
