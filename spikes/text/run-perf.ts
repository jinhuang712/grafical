// Usage: node spikes/text/run-perf.ts
// Load time, measure throughput and memory growth of the two libraries on the 40 labels.
import { labels } from "./labels.ts";
import { fontkitMeasurer, harfbuzzMeasurer } from "./measure.ts";

const rounds = Number(process.argv[2] ?? 250); // rounds x 40 labels
for (const [name, make] of [
  ["harfbuzzjs", harfbuzzMeasurer],
  ["fontkit", fontkitMeasurer],
] as const) {
  const t0 = performance.now();
  const m = make();
  m.measure("warm up 预热", 12, 400, "runs");
  const load = performance.now() - t0;
  global.gc?.();
  const rss0 = process.memoryUsage().rss;
  const t1 = performance.now();
  for (let i = 0; i < rounds; i++) {
    for (const l of labels) m.measure(l, 12, 400, "runs");
    if (i % 20 === 19) global.gc?.();
  }
  const ms = performance.now() - t1;
  const rss1 = process.memoryUsage().rss;
  console.log(
    `${name}: load+first ${load.toFixed(0)} ms, ${(rounds * labels.length).toLocaleString()} measures in ${ms.toFixed(0)} ms ` +
      `(${((ms * 1000) / (rounds * labels.length)).toFixed(1)} us each), rss growth ${((rss1 - rss0) / 1048576).toFixed(1)} MiB`,
  );
}
