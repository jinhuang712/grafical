# Phase 0 text spike: fonts, measurement, determinism

Branch `spike/text-measurement`, 2026-10-11. Covers DESIGN.md D12 (fonts, measurement) and D15 (determinism). This report records findings. The owner records the decisions in DESIGN.md.

## Answers

1. **Chinese subset:** use the Table of General Standard Chinese Characters (8,105). It is about 516 KB per weight larger than GB 2312.
2. **Measurement library:** `harfbuzzjs`. Both libraries match resvg to 0.0001 px, but only when each font run is its own `<text>` element.
3. **Determinism:** macOS arm64 and Linux x64 give identical SVG bytes, PNG pixels and even PNG bytes.

## 1. Chinese font subset (D12)

### Sources

| Font | Source | License |
|---|---|---|
| Inter 4.1 | `extras/ttf/Inter-Regular.ttf` and `Inter-SemiBold.ttf` from the rsms/inter v4.1 release (2024-11-16) | SIL OFL 1.1, `fonts/Inter-OFL.txt` |
| Noto Sans SC 2.004 | `google/fonts` `ofl/notosanssc/NotoSansSC[wght].ttf`, a variable font built from `notofonts/noto-cjk` Sans2.004 (commit 523d033d, per its `upstream_info.md`) | SIL OFL 1.1, `fonts/NotoSansSC-OFL.txt` |

The Noto CJK static releases have no 600 weight, so the variable font is the source. `subset-font` pins `wght` to 400 or 600 while subsetting, which gives static TTF files. resvg-js does not apply variable axes, so static files are required.

### Character sets

- **GB 2312:** 6,763 hanzi, from `new TextDecoder("gbk", { fatal: true })` over rows 0xB0 to 0xF7. Row 0xD7 has 89 characters, so 3,755 + 3,008 = 6,763.
- **8,105:** the Table of General Standard Chinese Characters (2013), taken from the Unicode Unihan field `kTGH` (Unicode 18.0.0, file dated 2026-07-31, `unicode.org/Public/UCD/latest/ucd/Unihan.zip`). Exactly 8,105 code points carry the field. The list is committed as `spikes/text/data/tgh-8105.txt`. It was not compared with the State Council's PDF.
- Both subsets also keep ASCII (95 code points) and 182 CJK and general punctuation code points.
- 1,467 characters are only in the 8,105 table. 125 are only in GB 2312, mostly radicals (丨 丿 亻) and variant forms (後 馀 麴).

### Sizes (bytes)

| File | Regular TTF | SemiBold TTF | Regular WOFF2 | SemiBold WOFF2 |
|---|---|---|---|---|
| Noto Sans SC, GB 2312 | 2,235,740 | 2,233,964 | 998,616 | 1,016,780 |
| Noto Sans SC, 8,105 (bundled) | 2,751,540 | 2,749,304 | 1,211,328 | 1,235,264 |
| 8,105 plus the 125 GB 2312-only characters | 2,784,920 | 2,782,640 | 1,226,092 | 1,249,972 |
| Inter 4.1, full (bundled) | 411,640 | 419,744 | 111,268 | 114,812 |
| Source: variable Noto Sans SC | 17,772,300 | | | |

### Recommendation

Use the 8,105 table. It is the current national standard. Adding the 125 GB 2312-only characters costs about 33 KB more per weight, if no gap against GB 2312 text is wanted.

Two defects found:
- The pinned Noto files' `name` table still says "Noto Sans SC Thin" (name IDs 1 and 4). resvg still picks the right face through name ID 16 and `usWeightClass`, but a production build should rewrite the names.
- Noto Sans SC lacks `≤ ✓ ✗ ↔ ⇒`, and Inter has them. The D14 check for "a character the bundled fonts cannot draw" therefore means "in neither Inter's nor Noto's character map".

## 2. Text measurement library (D12)

### Package facts

Checked on 2026-10-11 on the npm registry and the GitHub API.

| Package | Version | Published | License | Maintenance |
|---|---|---|---|---|
| `harfbuzzjs` | 1.6.3 | 2026-10-06 | MIT | 11 releases between 2026-05-13 and 2026-10-06. Repository pushed 2026-10-08, 0 open issues, in the HarfBuzz organization |
| `fontkit` | 2.0.4 | 2024-08-09 | MIT on npm. The GitHub API gives no SPDX id | Repository pushed 2026-10-10, 157 open issues, one npm release in two years |
| `@resvg/resvg-js` | 2.6.2 | 2024-03-26 | MPL-2.0 | Latest stable. The `next` tag has 2.7.0-alpha.2 (2026-01-28). Repository pushed 2026-06-30 |
| `subset-font` (dev) | 2.9.0 | 2026-09-20 | BSD-3-Clause | Active. Uses the hb-subset WASM |
| `pngjs` (dev) | 7.0.0 | | MIT | Decodes PNG for the determinism test |

`pnpm licenses list` shows every transitive dependency as MIT, BSD-3-Clause, ISC, Apache-2.0, 0BSD or (MIT AND Zlib), so all fit D21.

### Method

- **Labels:** 40, from `bench/briefs/catalog-sync.md` plus Chinese and mixed labels, including 商品同步服务, 读取接口（gRPC）, curly quotes, `……`, `→`, `≤` and a kerning label. Each is measured at 12 px and 14 px in Regular and SemiBold: 160 measurements per library.
- **Library side:** Inter wherever Inter has the glyph, Noto Sans SC otherwise. Each run is shaped with kerning, and the ink extent comes from the glyph outlines' bounding boxes.
- **resvg side:** each run is its own `<text>` with one font family, with only the four bundled files loaded and `loadSystemFonts: false`.
  - Advance: `getBBox()` with `text-anchor` start and with end. The ink shifts by exactly the advance, so side bearings cancel out.
  - Ink box: `getBBox()` at start, compared with the library's ink box. Both include side bearings.
  - Pixels: a render at 8x scale, scanning alpha, checks the bounding-box API.
- **Pass:** every difference is at most 1 px.

### Result

Differences are library minus resvg, the maximum over 160 measurements.

| Scenario | Library | Max advance | Max ink width | Max pixels | Verdict |
|---|---|---|---|---|---|
| One `<text>` per font run | harfbuzzjs | 0.00003 px | 0.00003 px | 0.21 px | pass |
| One `<text>` per font run | fontkit | 0.00003 px | 0.00003 px | 0.21 px | pass |
| One `<text>` with the stack `Inter, 'Noto Sans SC'`, library assumes Inter first | both | 15.67 px | 15.67 px | 15.76 px | fail |

### The font-stack trap

With the stack `Inter, 'Noto Sans SC'` in one `<text>`, resvg-js 2.6.2 does not choose a font per character. If Inter lacks any character of the label, resvg draws the whole label, Latin letters included, from Noto Sans SC Regular, and ignores `font-weight`.

- 43 of 160 measurements (12 labels) differ by more than 1 px, up to 15.67 px for `「商品」与“报价”：快照`.
- Evidence: `m报` is 192.6 units wide at 100 px whatever family is asked for. That is Noto's 92.6 for `m` plus 100, while Inter's `m` is 87.6. At weight 600 it is still 192.6, which is Noto Regular, since SemiBold `m` is 95.3.
- Wrapping runs in `<tspan font-family>` does not help, because it is still one text chunk.
- A model of the rule ("all Inter if Inter has every glyph, otherwise all Noto Regular") fits 159 of 160 measurements within 0.5 px. The exception is a label with `≤`, which Noto lacks.
- This rule is inferred from measurements, not from resvg's source.

**Consequence for D13:** the SVG writer must split each label into single-font runs and write one `<text>` per run, at x positions from its own measurements. `spikes/text/scene.ts` does this. The cost is that SVG text is split into pieces.

### Other differences

| | harfbuzzjs | fontkit |
|---|---|---|
| Shaping engine | HarfBuzz. resvg uses rustybuzz, a HarfBuzz port | Its own JavaScript implementation |
| Speed, over 40,000 measurements | 6.3 µs each | 62 to 68 µs each |
| Memory | No `destroy()` in 1.6.3. A new buffer per call leaked about 2.9 KB each (451 MiB after 160,000 calls, even with gc). One reused buffer with `reset()` grows 4.9 MiB | 8 to 60 MiB growth |
| Size | 441 KB WASM, no dependencies | 5.6 MB, 8 small dependencies |
| Browser (D19) | WASM, works | Works with a bundler |
| Shared with subsetting | `subset-font` uses the same hb-subset WASM | No |

### Recommendation

Use `harfbuzzjs`. Accuracy is a tie, so the choice rests on three grounds: its shaping engine is the one resvg ports, it is 10 times faster, and it is actively released. The memory leak has a known workaround: reuse one buffer. fontkit passed the same test and is a fair fallback.

## 3. Determinism (D15)

`spikes/text/scene.ts` writes a 560 × 260 SVG with four boxes (SemiBold titles, Regular subtitles), three arrows (one dashed), and mixed Chinese and Latin labels. Positions come from harfbuzzjs measurements, formatted with `toFixed(2)`. resvg loads only the four bundled fonts.

`determinism.test.ts` asserts three things:
- the SVG's SHA-256;
- the SHA-256 of the raw RGBA pixels decoded from the PNG with pngjs;
- that the decoded pixels equal `render().pixels`.

Hashes were recorded on macOS arm64 with Node 24.14.0 and resvg-js 2.6.2. The PNG was viewed, and it draws correctly.

| Platform | SVG hash | Pixel hash | PNG bytes hash |
|---|---|---|---|
| macOS arm64, local | `782ecaa2…d430` | `0a1b2ec9…f91b` | `cbe246fe…9396` |
| macos-latest, CI | same | same | same |
| ubuntu-latest, CI | same | same | same |

- Nothing needed explaining, because Linux did not differ. resvg-js ships the same Rust code for both, fonts load from files, system fonts are off, and the SVG's numbers have fixed precision.
- The PNG bytes also matched. D15 should still promise pixels, because that is the safer promise.
- **CI:** run 38114128418 passed the determinism tests on both runners. macos-latest failed only on a 5 s vitest timeout in the two measurement tests that render 160 labels at 8x scale. Run 38114286868, after a 120 s timeout fix, passed on both runners: ubuntu in 29 s and macOS in 1 min 7 s.

## What could not be verified

- The resvg fallback rule is inferred from probes, and resvg-js 2.7.0 may differ. A test asserts the trap, so an upgrade that fixes it will fail that test.
- Only darwin arm64 and linux x64 were compared. Linux arm64, Windows and other Node versions were not.
- The 8,105 list comes from Unicode `kTGH`, not the State Council's PDF. The count matches.
- Not measured: sizes other than 12 and 14 px, fractional sizes, letter-spacing, right-to-left text, and label wrapping.
- Inter is bundled in full. A Latin subset would save about 300 KB, which was not measured.
- The OFL reserved-name rules for the Noto subsets were not reviewed. The copyright line names the reserved font name "Source". Check this before a release.
- The fontkit repository has no SPDX id in the GitHub API. npm says MIT.

## Files

- `fonts/`: the bundled fonts and their OFL texts.
- `spikes/text/charsets.ts`, `extract-tgh.ts`, `make-subsets.ts`, `data/tgh-8105.txt`: subset generation.
- `spikes/text/runs.ts`, `measure.ts`, `resvg.ts`, `compare.ts`, `labels.ts`, `run-compare.ts`, `run-perf.ts`: measurement. Run `node spikes/text/run-compare.ts [--all]` and `node --expose-gc spikes/text/run-perf.ts 1000`.
- `spikes/text/scene.ts`, `run-render.ts`: the determinism scene.
- `spikes/text/measure.test.ts`, `determinism.test.ts`: the tests.
