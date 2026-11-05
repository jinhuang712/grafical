# The text measurer

The text measurer tells the layout how much room each piece of text takes and whether a box's text fits. It measures from four font files that ship with grafical and never from the system, so the same text has the same size on any machine. It lives in `src/text/`.

```text
label text ──> break points ──> greedy wrap ──> lines, each with its width and height
                                     ▲
               fonts ──> harfbuzzjs ─┘ one run per font
```

## Fonts

grafical ships four font files: Inter for Latin text and Noto Sans SC for Chinese text, each in Regular (400) and SemiBold (600). The Noto files are a subset of the Chinese font, as decision [006: Bundled fonts](decisions/006-bundled-fonts.md) records.

Each character is measured in Inter when Inter has a glyph for it, and in Noto Sans SC otherwise. A character neither font can draw is still measured and drawn in Noto, and the checker reports it as `missing-glyph` with the characters. Characters that shape to nothing, such as zero-width ones, do not count.

## Measuring

`harfbuzzjs` shapes each run of one font and adds up the advances to give its width. A line's height is the larger ascent plus descent of the two fonts, rounded up to a multiple of 4 px. Measurements are cached, so the same text in the same face is shaped once. A process keeps one measurer, because `harfbuzzjs` frees no font it loaded.

## Wrapping

A label wraps greedily at the last break point that fits, and a piece with no break point stays whole even when it is too wide. A line break in the text always starts a new line.

- A break may follow a space or a tab, and the space is trimmed from the end of the line.
- A break may follow `-` or `_` or `/` when letters or digits stand on both sides, and the character stays at the end of the line.
- A break may come before or after any Han or kana or Hangul or CJK punctuation or fullwidth character.
- Closing punctuation never starts a line, and opening brackets never end one.
- Two of `…`, `—` or `‥` in a row are never split.

## Fitting text in a box

Text fits its box when its line box stays 8 px from the box's sides and 4 px from its top and bottom. The line box runs from the fonts' full ascent to their full descent, not round the ink of the glyphs. A diamond is tested against its diamond with the same margins. A label may take at most 2 lines and a sublabel 1.

A mark in a box's `left` slot takes a column of its width plus 8 px out of the text's room. The box keeps its size, but the narrower room can move a box with no size step from medium to large.

The layout uses this test to choose the size of a box that has none. The checker uses it to find `overflow`, text that does not fit the box it has.
