// Line break opportunities (DESIGN.md, "Bundled fonts"). Pure functions over characters.

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}　-〿＀-￯]/u;
const ALNUM = /[\p{L}\p{N}]/u;

/** Must not start a line. */
const CLOSING = new Set([..."，。、：；！？）」』》】〕〉”’…‥·,.;:!?)]}%"]);
/** Must not end a line. */
const OPENING = new Set([..."（「『《【〔〈“‘([{"]);
/** A pair of these is never split. */
const JOINED = new Set([..."…—‥"]);
/** In Latin text a line may break after these. */
const AFTER = new Set([..."-_/"]);

export function isSpace(ch: string): boolean {
  return ch === " " || ch === "\t";
}

/**
 * Indices i (0 < i < chars.length) where a line may break before chars[i].
 * Spaces stay with the text before the break, and the caller trims them.
 */
export function breakPoints(chars: string[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < chars.length; i++) {
    const prev = chars[i - 1] as string;
    const cur = chars[i] as string;
    if (isSpace(cur)) continue;
    if (CLOSING.has(cur) || OPENING.has(prev)) continue;
    if (JOINED.has(prev) && JOINED.has(cur)) continue;
    let ok = false;
    if (isSpace(prev)) ok = true;
    else if (CJK.test(prev) || CJK.test(cur)) ok = true;
    else if (AFTER.has(prev)) {
      const before = chars[i - 2];
      ok = before !== undefined && ALNUM.test(before) && ALNUM.test(cur);
    }
    if (ok) out.push(i);
  }
  return out;
}
