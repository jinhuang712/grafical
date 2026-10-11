// Usage: node spikes/text/extract-tgh.ts <Unihan_OtherMappings.txt>
// Writes spikes/text/data/tgh-8105.txt from the Unicode Unihan field kTGH (2013 table).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
if (!input) throw new Error("pass the path of Unihan_OtherMappings.txt");
const chars: number[] = [];
for (const line of readFileSync(input, "utf8").split("\n")) {
  const m = /^U\+([0-9A-F]+)\tkTGH\t/.exec(line);
  if (m?.[1]) chars.push(Number.parseInt(m[1], 16));
}
chars.sort((a, b) => a - b);
const outUrl = new URL("data/tgh-8105.txt", import.meta.url);
mkdirSync(new URL("data/", import.meta.url), { recursive: true });
writeFileSync(outUrl, `${String.fromCodePoint(...chars)}\n`);
console.log(`wrote ${chars.length} characters`);
