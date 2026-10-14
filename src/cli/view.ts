// `grafical view <file>`: the diagram as it is now, in a window, redrawn within a
// moment of every change to the file or its stylesheet, from any process
// (DESIGN.md D31). It shows; it never edits. The parts that changed are marked
// for a moment by boxes laid over the picture, so the SVG stays the same bytes
// that `render` writes. A side panel lists each change as operations, taken from
// `grafical diff` between the last good file and the new one (D18).

import { spawn } from "node:child_process";
import { existsSync, readFileSync, watch } from "node:fs";
import { createServer, type Server, type ServerResponse } from "node:http";
import { basename, dirname } from "node:path";
import { drawing } from "../check/drawing.ts";
import { layout } from "../layout/index.ts";
import { diffDiagrams } from "../model/diff.ts";
import type { Op } from "../model/ops.ts";
import { everyNode } from "../model/steps.ts";
import type { Diagram } from "../model/types.ts";
import { renderSvg } from "../render/index.ts";
import type { Rect, Scene } from "../scene.ts";
import { FONT_FILES } from "../text/fonts.ts";
import { createMeasurer } from "../text/index.ts";
import type { FontFace } from "../text/types.ts";
import { formatReport, inspect, isReport, loadDiagram, type Report } from "./pipeline.ts";

/** What the page shows: the picture, what changed, and the problems. */
export interface Frame {
  svg: string;
  width: number;
  height: number;
  /** Boxes around the parts that changed since the last frame. */
  changed: Rect[];
  /** Errors, defects and the counts, one per line. */
  problems: string[];
  /** The picture is the last good one: the file cannot be drawn right now. */
  stale: boolean;
  /** What happened since the last frame, for the list of changes. */
  event?: ViewEvent;
}

/** One entry in the list of changes. */
export interface ViewEvent {
  /** ISO time. */
  at: string;
  kind: "open" | "change" | "error";
  lines: string[];
}

/**
 * One operation in a few words, for people: `node add search "search-api" in
 * services`, `edge add bff → search "query"`, `lane join webteam search`.
 * Places within a row are left out.
 */
export function describeOp(op: Op): string {
  const o = op as unknown as Record<string, unknown>;
  const words = [String(o.op).replace(".", " ")];
  for (const key of ["id", "group", "lane"]) if (typeof o[key] === "string") words.push(o[key]);
  if (o.from !== undefined || o.to !== undefined) words.push(`${o.from ?? "…"} → ${o.to ?? "…"}`);
  for (const key of ["label", "text", "sublabel"]) {
    if (typeof o[key] === "string") words.push(JSON.stringify(o[key]));
  }
  if (typeof o.layer === "string") words.push(`in ${o.layer}`);
  for (const key of ["nodes", "members", "edges"]) {
    if (Array.isArray(o[key])) words.push((o[key] as string[]).join(", "));
  }
  const verb = String(o.op).split(".")[1];
  for (const key of ["kind", "size", "style", "density", "mode", "line", "into"]) {
    // A new node or edge of the default kind says nothing about its kind.
    const plain =
      key === "kind" &&
      ((o.op === "node.add" && o[key] === "service") || (o.op === "edge.add" && o[key] === "call"));
    if (o[key] === undefined || plain) continue;
    // `diagram style dark`, not `diagram style style dark`.
    words.push(key === verb ? String(o[key]) : `${key} ${String(o[key])}`);
  }
  if (o.both === true) words.push("both ends");
  if (o.off === true) words.push("off");
  return words.join(" ");
}

const nodeCount = (d: Diagram) => everyNode(d).length;

function bounds(points: { x: number; y: number }[], pad: number): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs) - pad;
  const y0 = Math.min(...ys) - pad;
  return { x: x0, y: y0, w: Math.max(...xs) + pad - x0, h: Math.max(...ys) + pad - y0 };
}

/**
 * Boxes around what an agent changed since `before`: new nodes and edges, text
 * that changed, a node that changed size, an edge with new ends, kind or label.
 * Elements that only moved because the layout re-flowed are not marked.
 */
export function changedParts(before: Scene | undefined, after: Scene): Rect[] {
  if (before === undefined) return [];
  const words = (texts: { runs: { text: string }[] }[]) =>
    texts.map((t) => t.runs.map((r) => r.text).join("")).join("\n");
  const out: Rect[] = [];
  const nodes = new Map(before.nodes.map((n) => [n.id, n]));
  for (const n of after.nodes) {
    const was = nodes.get(n.id);
    const resized = was !== undefined && (was.rect.w !== n.rect.w || was.rect.h !== n.rect.h);
    const reworded = was !== undefined && words(was.texts) !== words(n.texts);
    if (
      was === undefined ||
      resized ||
      reworded ||
      was.kind !== n.kind ||
      was.accent !== n.accent
    ) {
      out.push(n.rect);
    }
  }
  const edges = new Map(before.edges.map((e) => [e.id, e]));
  for (const e of after.edges) {
    const was = edges.get(e.id);
    if (e.points.length === 0) continue;
    const label = (x: typeof e) => (x.label === undefined ? "" : words([x.label]));
    const same =
      was !== undefined &&
      was.from === e.from &&
      was.to === e.to &&
      was.kind === e.kind &&
      label(was) === label(e);
    if (!same) out.push(bounds(e.points, 4));
  }
  return out;
}

export interface Viewer {
  url: string;
  /** The picture's size now, or undefined while there is none. */
  size(): { width: number; height: number } | undefined;
  close(): Promise<void>;
}

/** Changes kept for a window that opens later. */
const HISTORY = 200;

/** Serves the live view of `file` on 127.0.0.1. Port 0 picks a free one. */
export async function startViewer(file: string, port = 0): Promise<Viewer> {
  const m = await createMeasurer();
  let scene: Scene | undefined;
  let diagram: Diagram | undefined;
  let frame: Frame = { svg: "", width: 0, height: 0, changed: [], problems: [], stale: true };
  const clients = new Set<ServerResponse>();
  const history: ViewEvent[] = [];
  const note = (kind: ViewEvent["kind"], lines: string[]): ViewEvent => {
    const event = { at: new Date().toISOString(), kind, lines };
    history.push(event);
    if (history.length > HISTORY) history.shift();
    return event;
  };

  // One save can raise several file events. A frame that shows nothing new is not
  // sent, so it cannot wipe the marks of the frame before it.
  const same = (a: Frame, b: Frame) =>
    a.svg === b.svg && a.stale === b.stale && a.problems.join("\n") === b.problems.join("\n");
  const redraw = (): boolean => {
    const before = frame;
    const d = loadDiagram(file);
    if (isReport(d)) {
      const problems = formatReport(d).trim().split("\n");
      frame = { ...frame, changed: [], problems, stale: true };
      const fresh = !same(before, frame);
      if (fresh) {
        const missing = problems.some((l) => l.includes("file-not-found"));
        frame.event = note(
          missing ? "open" : "error",
          missing ? [`waiting for ${basename(file)}`] : problems.slice(1, 3),
        );
      }
      return fresh;
    }
    let next: Scene;
    let report: Report;
    try {
      next = layout(d, m);
      report = {
        ok: true,
        changed: [],
        errors: [],
        defects: inspect(d, m),
        counts: drawing(d, next).counts,
      };
    } catch (err) {
      // An engine bug must not stop the window: it keeps the last good picture.
      const message = err instanceof Error ? err.message : String(err);
      frame = {
        ...frame,
        changed: [],
        problems: [`error: cannot draw the file: ${message}`],
        stale: true,
      };
      const fresh = !same(before, frame);
      if (fresh) frame.event = note("error", [`cannot draw the file: ${message}`]);
      return fresh;
    }
    const lines = formatReport(report).trim().split("\n").slice(1);
    frame = {
      svg: renderSvg(next),
      width: next.width,
      height: next.height,
      changed: changedParts(scene, next),
      problems: lines,
      stale: false,
    };
    scene = next;
    const fresh = !same(before, frame);
    if (fresh) {
      const ops = diagram === undefined ? [] : diffDiagrams(diagram, d);
      frame.event =
        diagram === undefined
          ? note("open", [`${basename(file)}: ${nodeCount(d)} boxes, ${d.edges.length} arrows`])
          : note("change", ops.length > 0 ? ops.map(describeOp) : ["the stylesheet changed"]);
    }
    diagram = d;
    return fresh;
  };
  const send = (res: ServerResponse) => res.write(`data: ${JSON.stringify(frame)}\n\n`);
  redraw();

  // Writes replace the file by renaming over it, so the folder is watched, not the file.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const watcher = watch(dirname(file), (_event, name) => {
    const n = name === null ? "" : String(name);
    if (n !== basename(file) && !n.endsWith(".grafical-style.yaml")) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      if (redraw()) for (const c of clients) send(c);
    }, 60);
  });

  const server: Server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0] ?? "/";
    if (path === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(page(basename(file)));
    } else if (path === "/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      clients.add(res);
      // A page that just opened sees the picture and the changes so far, not marks
      // for changes it never saw.
      const { event: _, ...now } = frame;
      res.write(`data: ${JSON.stringify({ ...now, changed: [], history })}\n\n`);
      req.on("close", () => clients.delete(res));
    } else if (path.startsWith("/fonts/")) {
      const face = path.slice("/fonts/".length) as FontFace;
      const f = FONT_FILES[face];
      if (f === undefined || !existsSync(f)) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "content-type": "font/ttf", "cache-control": "max-age=3600" });
      res.end(readFileSync(f));
    } else {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const address = server.address();
  const actual = typeof address === "object" && address !== null ? address.port : port;
  return {
    url: `http://127.0.0.1:${actual}/`,
    size: () => (frame.svg ? { width: frame.width, height: frame.height } : undefined),
    close: () =>
      new Promise<void>((resolve) => {
        watcher.close();
        if (timer !== undefined) clearTimeout(timer);
        for (const c of clients) c.end();
        server.close(() => resolve());
      }),
  };
}

/** The list of changes beside the picture, and the window's own bars, in px. */
const SIDE = 300;
const BARS = { width: 32, height: 41 + 32 + 28 };

/**
 * A window that fits the picture at its own size and the list of changes beside
 * it, shrunk to fit within 1440 x 900 (a small laptop screen), and never
 * smaller than 760 x 520. Without a picture yet: 1200 x 860.
 */
export function windowSize(picture?: { width: number; height: number }): {
  width: number;
  height: number;
} {
  if (picture === undefined || picture.width <= 0) return { width: 1200, height: 860 };
  const room = { width: 1440 - SIDE - BARS.width, height: 900 - BARS.height };
  const scale = Math.min(1, room.width / picture.width, room.height / picture.height);
  return {
    width: Math.max(760, Math.round(picture.width * scale + SIDE + BARS.width)),
    height: Math.max(520, Math.round(picture.height * scale + BARS.height)),
  };
}

/** Opens the page in a window without browser tabs where Chrome is installed, else in the browser. */
export function openWindow(url: string, size = windowSize()): void {
  const detached = (cmd: string, args: string[]) => {
    const p = spawn(cmd, args, { detached: true, stdio: "ignore" });
    p.on("error", () => {});
    p.unref();
  };
  if (process.platform === "darwin") {
    if (existsSync("/Applications/Google Chrome.app")) {
      detached("open", [
        "-na",
        "Google Chrome",
        "--args",
        `--app=${url}`,
        `--window-size=${size.width},${size.height}`,
      ]);
    } else detached("open", [url]);
  } else if (process.platform === "win32") {
    detached("cmd", ["/c", "start", "", url]);
  } else {
    detached("sh", [
      "-c",
      `google-chrome --app='${url}' --window-size=${size.width},${size.height} || chromium --app='${url}' --window-size=${size.width},${size.height} || xdg-open '${url}'`,
    ]);
  }
}

function page(name: string): string {
  const faces = (Object.keys(FONT_FILES) as FontFace[])
    .map((f) => {
      const family = f.startsWith("inter") ? "Inter" : "Noto Sans SC";
      const weight = f.endsWith("600") ? 600 : 400;
      return `@font-face{font-family:"${family}";font-weight:${weight};src:url(/fonts/${f}) format("truetype")}`;
    })
    .join("\n");
  const title = name.replace(/[<>&"]/g, "");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · grafical</title>
<style>
${faces}
:root{--bg:#eef0f3;--bar:#ffffff;--ink:#1f2328;--muted:#6b727c;--line:#d5d9df;--mark:#2f5fc4;--warn:#9a6700;--bad:#cf222e;--side:${SIDE}px}
@media (prefers-color-scheme: dark){:root{--bg:#0b0f14;--bar:#151a21;--ink:#e6e8eb;--muted:#9aa3ad;--line:#30363d;--mark:#4c8dff;--warn:#d29922;--bad:#f85149}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:13px/1.4 Inter,system-ui,sans-serif;height:100vh;display:flex;flex-direction:column}
header{display:flex;gap:12px;align-items:center;padding:8px 16px;background:var(--bar);border-bottom:1px solid var(--line)}
header b{font-weight:600}
#status{color:var(--muted);margin-left:auto;white-space:nowrap}
#status.stale{color:var(--bad)}
.view{flex:1;min-height:0;display:flex}
main{flex:1;min-width:0;min-height:0;overflow:auto;display:flex;justify-content:center;align-items:flex-start;padding:16px}
aside{width:var(--side);flex:none;display:flex;flex-direction:column;background:var(--bar);border-left:1px solid var(--line);min-height:0}
aside h2{margin:0;padding:10px 14px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)}
#changes{list-style:none;margin:0;padding:0;overflow:auto;flex:1}
#changes li{padding:8px 14px 8px 12px;border-bottom:1px solid var(--line);border-left:3px solid var(--mark)}
#changes li.open{border-left-color:var(--line)}#changes li.error{border-left-color:var(--bad)}
#changes li.new{animation:flash 1.6s ease-out}
@keyframes flash{0%{background:color-mix(in srgb,var(--mark) 18%,transparent)}100%{background:transparent}}
#changes time{display:block;color:var(--muted);font-size:11px;font-variant-numeric:tabular-nums}
#changes code{display:block;font:12px/1.5 ui-monospace,Menlo,monospace;overflow-wrap:anywhere}
@media (max-width: 760px){.view{flex-direction:column}aside{width:auto;max-height:30vh;border-left:0;border-top:1px solid var(--line)}}
#stage{position:relative;flex:none;box-shadow:0 1px 3px rgba(0,0,0,.12);background:#fff;line-height:0}
#stage svg{width:100%;height:auto;display:block}
.mark{position:absolute;border:2px solid var(--mark);border-radius:6px;pointer-events:none;animation:fade 1.6s ease-out forwards}
@keyframes fade{0%{opacity:1}70%{opacity:.8}100%{opacity:0}}
#problems{margin:0;padding:8px 16px;background:var(--bar);border-top:1px solid var(--line);max-height:25vh;overflow:auto;font:12px/1.5 ui-monospace,Menlo,monospace}
#problems:empty{display:none}
#problems div.warning{color:var(--warn)}#problems div.bad{color:var(--bad)}
</style></head>
<body>
<header><b>grafical</b><span>${title}</span><span id="status">connecting…</span></header>
<div class="view"><main><div id="stage"></div></main><aside><h2>Changes</h2><ol id="changes"></ol></aside></div>
<div id="problems"></div>
<script>
const stage = document.getElementById("stage");
const status = document.getElementById("status");
const problems = document.getElementById("problems");
const main = document.querySelector("main");
const changes = document.getElementById("changes");
let count = 0;
let size;
// Each entry of the list of changes, newest first.
function entry(e, fresh) {
  const li = document.createElement("li");
  li.className = e.kind + (fresh ? " new" : "");
  const t = document.createElement("time");
  t.textContent = new Date(e.at).toLocaleTimeString();
  li.append(t);
  for (const line of e.lines) {
    const c = document.createElement("code");
    c.textContent = line;
    li.append(c);
  }
  changes.prepend(li);
}
// The window follows the picture's size, where the browser lets a page resize its window.
let shaped;
function shape(f) {
  const key = f.width + "x" + f.height;
  if (shaped === key) return;
  shaped = key;
  try {
    const side = innerWidth > 760 ? ${SIDE} : 0;
    const roomW = screen.availWidth - side - ${BARS.width};
    const roomH = screen.availHeight - ${BARS.height};
    const scale = Math.min(1, roomW / f.width, roomH / f.height);
    const w = Math.max(760, Math.round(f.width * scale + side + ${BARS.width}));
    const h = Math.max(520, Math.round(f.height * scale + ${BARS.height}));
    if (Math.abs(outerWidth - w) > 24 || Math.abs(outerHeight - h) > 24) resizeTo(w, h);
  } catch {}
}
// The whole picture stays in view: it shrinks to the window, and grows at most twice.
function fit() {
  if (!size) return;
  const scale = Math.min((main.clientWidth - 32) / size.width, (main.clientHeight - 32) / size.height, 2);
  stage.style.width = Math.max(scale, 0.1) * size.width + "px";
}
addEventListener("resize", fit);
const at = (v, whole) => "calc(" + (v / whole) * 100 + "% - 3px)";
const span = (v, whole) => "calc(" + (v / whole) * 100 + "% + 6px)";
function show(f) {
  if (f.history) for (const e of f.history) entry(e, false);
  if (f.event) entry(f.event, true);
  if (f.svg) {
    stage.innerHTML = f.svg;
    size = f;
    shape(f);
    for (const r of f.changed) {
      const m = document.createElement("div");
      m.className = "mark";
      m.style.left = at(r.x, f.width);
      m.style.top = at(r.y, f.height);
      m.style.width = span(r.w, f.width);
      m.style.height = span(r.h, f.height);
      stage.appendChild(m);
    }
  }
  count += 1;
  const time = new Date().toLocaleTimeString();
  status.className = f.stale ? "stale" : "";
  status.textContent = f.stale
    ? (f.svg ? "cannot draw the file right now · showing the last good picture · " : "nothing to draw yet · ") + time
    : (count === 1 ? "live · " : "updated · ") + f.changed.length + " changed · " + time;
  problems.innerHTML = "";
  for (const line of f.problems) {
    const div = document.createElement("div");
    div.textContent = line;
    div.className = line.startsWith("warning") ? "warning" : "bad";
    problems.appendChild(div);
  }
  fit();
}
const events = new EventSource("/events");
events.onmessage = (e) => show(JSON.parse(e.data));
events.onerror = () => { status.textContent = "disconnected: is grafical view still running?"; status.className = "stale"; };
</script>
</body></html>
`;
}
