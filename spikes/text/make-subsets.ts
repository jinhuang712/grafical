// Usage: node spikes/text/make-subsets.ts <NotoSansSC[wght].ttf> <outDir>
// Writes a GB 2312 subset and a 8,105 subset of Noto Sans SC at weights 400 and 600.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import subsetFont from "subset-font";
import { ascii, cjkPunctuation, gb2312Hanzi, tghHanzi } from "./charsets.ts";

const [src, outDir] = process.argv.slice(2);
if (!src || !outDir) throw new Error("usage: make-subsets.ts <variable ttf> <outDir>");
mkdirSync(outDir, { recursive: true });
const source = readFileSync(src);

const gb = gb2312Hanzi();
const tgh = tghHanzi();
const base = [...ascii(), ...cjkPunctuation()];
const sets = { gb2312: gb, tgh8105: tgh, union: [...new Set([...gb, ...tgh])] };
console.log(`gb2312=${gb.length} tgh=${tgh.length} base=${base.length}`);
const tghSet = new Set(tgh);
console.log(`gb2312 not in tgh: ${gb.filter((c) => !tghSet.has(c)).join("")}`);
const gbSet = new Set(gb);
console.log(`tgh not in gb2312: ${tgh.filter((c) => !gbSet.has(c)).length}`);

for (const [name, hanzi] of Object.entries(sets)) {
  for (const [label, wght] of [
    ["Regular", 400],
    ["SemiBold", 600],
  ] as const) {
    const out = await subsetFont(source, [...base, ...hanzi].join(""), {
      targetFormat: "truetype",
      variationAxes: { wght },
      preserveNameIds: [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17],
    });
    const file = join(outDir, `NotoSansSC-${label}.${name}.ttf`);
    const woff2 = await subsetFont(source, [...base, ...hanzi].join(""), {
      targetFormat: "woff2",
      variationAxes: { wght },
    });
    console.log(`${name} ${label} woff2 ${woff2.length}`);
    writeFileSync(file, out);
    console.log(`${file} ${out.length}`);
  }
}
