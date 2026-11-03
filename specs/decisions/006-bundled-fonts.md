# 006. Bundled fonts

Decided: 2026-10-11

grafical ships its own fonts, both under the SIL Open Font License, in Regular (400) and SemiBold (600):
- Inter 4.1 for Latin text;
- Noto Sans SC 2.004 for Chinese text, subset to the Table of General Standard Chinese Characters (8,105 characters) plus ASCII and common punctuation, and pinned to static weights from the variable font.

Each character is drawn from Inter if Inter has it, and from Noto Sans SC otherwise. `harfbuzzjs` shapes and measures the text from these files, never from the system. Labels wrap at spaces, hyphens, underscores and slashes in Latin text, and between characters in Chinese text. A label that still does not fit its box is a defect. Its fix is a larger size step or a shorter label.

The phase 0 text spike measured 160 labels at 12 and 14 px. Widths from `harfbuzzjs` matched the widths resvg draws within 0.0001 px. The spike code and its report were not kept; the numbers here are what remains.

Before the first release, the font build must rewrite the subsets' name tables, which still say "Thin", and check the OFL reserved font name "Source".

Rejected:
- System fonts, because they differ between machines, and the same file would give a different picture.
- Measuring in a browser, because grafical runs without one.
- `fontkit`. It was just as accurate, but it is about 10 times slower and has had one npm release in two years. `harfbuzzjs` uses the same shaping engine that resvg ports.
- The GB 2312 subset (6,763 characters). It is the older standard. The 8,105-character subset costs about 516 KB more per weight.
