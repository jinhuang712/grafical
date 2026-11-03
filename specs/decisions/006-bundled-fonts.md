# 006. Bundled fonts

Decided: 2026-10-11

## The problem

Text measured from the fonts of the machine it runs on differs from one machine to the next, so the same file would not give the same picture everywhere.

## The choice

grafical ships its own fonts, both under the SIL Open Font License, in Regular (400) and SemiBold (600):
- Inter 4.1 for Latin text;
- Noto Sans SC 2.004 for Chinese text.
  - It is subset to the Table of General Standard Chinese Characters (8,105 characters) plus ASCII and common punctuation.
  - It is pinned to static weights from the variable font.

`harfbuzzjs` measures the text from these files, never from the system. How characters choose a font, how labels wrap and when text fits is in [text and rendering](../text-and-rendering.md).

The phase 0 text spike measured 160 labels at 12 and 14 px. Widths from `harfbuzzjs` matched the widths resvg draws within 0.0001 px. The spike code and its report were not kept; the numbers here are what remains.

Before the first release, the font build must rewrite the subsets' name tables, which still say "Thin", and check the OFL reserved font name "Source".

## Not chosen

- System fonts, because they differ between machines.
  - The same file would give a different picture.
- Measuring in a browser, because grafical runs without one.
- `fontkit`.
  - It was just as accurate, but it is about 10 times slower and has had one npm release in two years.
  - `harfbuzzjs` uses the same shaping engine that resvg ports.
- The GB 2312 subset (6,763 characters).
  - It is the older standard.
  - The 8,105-character subset costs about 516 KB more per weight.

## Consequences

The 8,105-character subset costs about 516 KB more per weight, and a character outside it is a defect the agent must fix.
