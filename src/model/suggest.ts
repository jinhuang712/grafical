// Helpers that turn a wrong value into a suggestion (DESIGN.md D5).

/** Levenshtein distance. */
export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0] ?? 0;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j] ?? 0;
      const left = prev[j - 1] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(up + 1, left + 1, diag + cost);
      diag = up;
    }
  }
  return prev[b.length] ?? 0;
}

/** The candidates nearest to the target, nearest first, ties in candidate order. */
export function closest(target: string, candidates: readonly string[], limit = 3): string[] {
  return candidates
    .map((c, i) => ({ c, i, d: editDistance(target, c) }))
    .sort((x, y) => x.d - y.d || x.i - y.i)
    .slice(0, limit)
    .map((x) => x.c);
}

/** A suggestion for an id that does not exist. */
export function suggestIds(target: string, candidates: readonly string[], noun: string): string {
  if (candidates.length === 0) return `no ${noun} exists yet`;
  return `closest ${noun}s: ${closest(target, candidates).join(", ")}`;
}

export function allowed(values: readonly string[]): string {
  return `allowed: ${values.join(", ")}`;
}
