import { readFileSync } from "node:fs";

/** GB 2312 level 1 and 2 hanzi (rows 16-87), decoded with the GBK decoder. 6,763 characters. */
export function gb2312Hanzi(): string[] {
  const decoder = new TextDecoder("gbk", { fatal: true });
  const out: string[] = [];
  for (let row = 0xb0; row <= 0xf7; row++) {
    for (let cell = 0xa1; cell <= 0xfe; cell++) {
      // Row 55 (0xD7) holds 89 characters: 0xD7FA..0xD7FE are unassigned (3755 + 3008 = 6763).
      if (row === 0xd7 && cell > 0xf9) continue;
      out.push(decoder.decode(new Uint8Array([row, cell])));
    }
  }
  return out;
}

/**
 * The 8,105 characters of the Table of General Standard Chinese Characters (2013), read from the
 * committed list `data/tgh-8105.txt`. The list comes from the Unicode Unihan field kTGH.
 */
export function tghHanzi(): string[] {
  const text = readFileSync(new URL("data/tgh-8105.txt", import.meta.url), "utf8").trim();
  return [...text];
}

/** ASCII printable characters. */
export function ascii(): string[] {
  const out: string[] = [];
  for (let c = 0x20; c <= 0x7e; c++) out.push(String.fromCharCode(c));
  return out;
}

/** CJK punctuation and symbols that labels use, so a label never needs a second font. */
export function cjkPunctuation(): string[] {
  const ranges: [number, number][] = [
    [0x00b7, 0x00b7], // middle dot
    [0x00d7, 0x00d7], // multiplication sign
    [0x2013, 0x2014], // en and em dash
    [0x2018, 0x201f], // quotation marks
    [0x2022, 0x2022], // bullet
    [0x2026, 0x2026], // ellipsis
    [0x2190, 0x2193], // arrows
    [0x3000, 0x303f], // CJK symbols and punctuation
    [0xff01, 0xff5e], // fullwidth forms
    [0xffe0, 0xffe5], // fullwidth signs
  ];
  const out: string[] = [];
  for (const [a, b] of ranges) for (let c = a; c <= b; c++) out.push(String.fromCodePoint(c));
  return out;
}
