#!/usr/bin/env node
// The grafical command line (DESIGN.md D16). Exit codes: 0 success, 1 an
// operation error or a defect, 2 a usage error.

import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Command, CommanderError } from "commander";
import { parse } from "yaml";
import { layout } from "../layout/index.ts";
import type { Op } from "../model/ops.ts";
import { parseOp, parseOps } from "../model/ops.ts";
import { renderPng, renderSvg } from "../render/index.ts";
import { createMeasurer } from "../text/index.ts";
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

type Opts = Record<string, unknown>;

/** Keeps the flags that were given. Commander leaves the others undefined. */
function pick(opts: Opts, names: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const n of names) if (opts[n] !== undefined && opts[n] !== false) out[n] = opts[n];
  return out;
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
      .option("--density <density>", "compact, normal or airy"),
  ).action(async (file: string, opts: Opts) => {
    await write(file, { op: "diagram.new", ...pick(opts, ["title", "density"]) }, opts, true);
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
      .option("--kind <kind>", "call, async or data"),
  ).action(async (file: string, from: string, to: string, opts: Opts) => {
    await write(file, { op: "edge.add", from, to, ...pick(opts, ["id", "label", "kind"]) }, opts);
  });
  json(
    edge.command("remove").description("remove an edge").argument("<file>").argument("<id>"),
  ).action(async (file: string, id: string, opts: Opts) => {
    await write(file, { op: "edge.remove", id }, opts);
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
    program.command("check").description("report defects in a diagram").argument("<file>"),
  ).action(async (file: string, opts: Opts) => {
    const d = loadDiagram(file);
    if (isReport(d)) {
      process.exitCode = emit(d, opts.json === true);
      return;
    }
    const defects = inspect(d, await createMeasurer());
    process.exitCode = emit(
      { ok: defects.length === 0, changed: [], errors: [], defects },
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
    const report = { ok: defects.length === 0, changed: [], errors: [], defects };
    if (opts.json !== true) for (const f of files) process.stdout.write(`wrote ${f}\n`);
    process.exitCode = emit(report, opts.json === true, { files });
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
