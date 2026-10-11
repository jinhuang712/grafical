// Usage: node spikes/text/run-compare.ts [--all]
import { compare, measurers, summarize } from "./compare.ts";

const all = process.argv.includes("--all");
for (const m of measurers()) {
  for (const [lib, draw] of [
    ["runs", "runs"],
    ["runs", "stack"],
    ["stack", "stack"],
  ] as const) {
    const rows = compare(m, lib, draw);
    console.log(`\n== ${m.name} / measure=${lib} draw=${draw} ==`);
    console.log(summarize(rows));
    const worst = [...rows].sort((a, b) => Math.abs(b.dInkWidth) - Math.abs(a.dInkWidth));
    for (const r of all ? rows : worst.slice(0, 5)) {
      console.log(
        `${r.size}px/${r.weight} adv lib=${r.libAdvance.toFixed(3)} resvg=${r.resvgAdvance.toFixed(3)} ` +
          `dAdv=${r.dAdvance.toFixed(3)} dInkW=${r.dInkWidth.toFixed(3)} dPix=${r.dPixelWidth.toFixed(3)} ${r.label}`,
      );
    }
  }
}
