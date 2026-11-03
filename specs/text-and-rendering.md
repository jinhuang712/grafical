# Text and rendering

This part turns text into sizes and a laid-out picture into files. The text measurer tells the layout how much room every label takes, from fonts that ship with grafical. The renderer writes the SVG from the laid-out picture and turns it into a PNG. The theme gives both the look. The same file and stylesheet give the same bytes and pixels on any machine because nothing here reads the system. The parts live in `src/text/`, `src/render/` and `src/theme/` ([the architecture](ARCHITECTURE.md)).

```text
label text ──> break points ──> greedy wrap ──> lines
                                     ▲
             fonts ──> harfbuzzjs ───┘ widths, one run per font
                                     │
laid-out picture ──> SVG writer ─────┴──> SVG ──> resvg, same fonts ──> PNG
          theme ──┘
```

## Fonts

grafical ships four font files: Inter for Latin text and Noto Sans SC for Chinese text, each in Regular (400) and SemiBold (600). The Noto files are a subset of the Chinese font, as decision [006: Bundled fonts](decisions/006-bundled-fonts.md) records. No part of grafical loads a system font: the renderer gives resvg only these four files and turns system fonts off.

Each character is drawn from Inter when Inter has a glyph for it, and from Noto Sans SC otherwise. A character neither font can draw is still drawn with Noto, and the checker reports it as `missing-glyph` with the characters. Characters that shape to nothing, such as zero-width ones, do not count.

## Measuring

`harfbuzzjs` shapes each run of one font and adds up the advances to give its width. A line's height is the larger ascent plus descent of the two fonts, rounded up to a multiple of 4 px. Measurements are cached, so the same text in the same face is shaped once.

## Wrapping

A label wraps greedily at the last break point that fits, and a piece with no break point stays whole even when it is too wide. A line break in the text always starts a new line.

- A break may follow a space or a tab, and the space is trimmed from the end of the line.
- A break may follow `-`, `_` or `/` when letters or digits stand on both sides, and the character stays at the end of the line.
- A break may come before or after any Han, kana, Hangul, CJK punctuation or fullwidth character.
- Closing punctuation never starts a line, and opening brackets never end one.
- Two of `…`, `—` or `‥` in a row are never split.

## Fitting text in a box

A box without a size step tries the medium size and then the large one. A box with a size, or in a diagram with `sizing: fixed`, keeps its size. Text fits when its box, with the fonts' full ascent and descent, stays 8 px from the box's sides and 4 px from its top and bottom. A label may take at most 2 lines and a sublabel 1.

Text that does not fit is the agent-owned defect `overflow`, which refuses the write. The same code covers a lane's label outside its head and a note over 4 lines.

## Writing the SVG

The renderer writes the SVG itself, with every element and attribute in a fixed order and numbers at no more than 2 decimals. It drops the control characters XML cannot hold.

Each label is split into runs of one font, and each run is its own `<text>` element at the x the measurer gave it. resvg does not choose a font per character: given a font stack, it would draw a whole label from Noto as soon as Inter lacked one of its characters. A text mark is the one exception: it is one centred `<text>` element, in Noto when any character is CJK and in Inter otherwise.

`@resvg/resvg-js` then draws the SVG into a PNG at the scale asked for, with the bundled fonts and `Inter` as the default family. No browser takes part.

## Themes and stylesheets

A theme holds every value of the look by role: the colors of each box kind, groups, bands, lines and text, line widths, corner radii, and type sizes and weights. The built-in themes are `default`, `dark` and `print`.

A stylesheet names a `base` theme, `default` when left out, and overrides any of its values ([the file formats](file-formats.md#the-stylesheet)). The override is a deep merge: maps merge key by key, and any other value replaces the theme's. A stylesheet is checked strictly before it merges:

- An unknown key is refused as `bad-stylesheet`.
- A type size must be from 6 to 48 and a weight 400 or 600.
- A dash may be set only on the line kinds that have one, `async` and `optional`.
- The file must end in `.grafical-style.yaml` and sit inside the diagram's folder.

The layout reads its type sizes from the theme, so a stylesheet with larger type changes the layout as well as the colors.

## Line weights

A line's weight is a level or a width from 0.5 to 8 px. `thin` is the theme's line width, `thick` is its main-path width, and any other level is a key of `paint.edge.weights`, which a stylesheet may add to. A stylesheet cannot name a level `thin` or `thick`. A level the stylesheet lacks is refused as `unknown-weight`, once the stylesheet is loaded.

The arrowhead grows with the width, from the thin line's size to the main path's. A line thinner than thin keeps the thin arrowhead.

`accent: true` on a line means `weight: thick`. When a line has both, `weight` wins. The operations keep only one: setting the accent clears the weight, and setting a weight clears the accent.

## Marks

A mark sits in a slot and never at a position. A corner mark is centred on its corner, takes no room and moves nothing; a wide badge grows inward from the corner. The `left` mark takes a column of its width plus 8 px out of the text's room. The box keeps its size, but the narrower room can move a box without a size from medium to large. A diamond and a dot have no `left` slot.

A mark is one of three things:

- An emoji: one grapheme that starts with a pictographic character, drawn from the bundled Twemoji images and never from a font.
  - One with no image is refused as `mark-not-drawn`.
- A file in SVG or PNG, embedded in the SVG as a data URI.
- Any other text of up to 6 graphemes, drawn on a badge.

A mark's size step `s`, `m` or `l` is 16, 20 or 28 px high, and a picture is square at that size. A text badge is as wide as its text plus padding and never narrower than it is high.

A badge's colors take a name (`red`, `amber`, `green`, `blue`, `purple`, `gray` or `dark`) or a hex, and the file stores a name as its hex in lowercase. Without `--fg`, the text color is the one that reads better on the badge. An emoji or a file takes only a size: a badge's colors or shape on one are refused as `mark-style-on-picture`.

A mark's file is read when the operation names it, and the diagram file stores its SHA-256. Every later load reads it again:

- A path that is absolute or leaves the folder is refused as `mark-file-outside`.
- A file that is gone is refused as `mark-file-not-found`, and one whose hash differs as `mark-file-changed`.
- An SVG with a script, a `foreignObject`, an event handler or an outside reference is refused as `mark-file-unsafe`.
- So is a file with no `<svg>` at all.
- A PNG whose signature is wrong is refused as `mark-file-unreadable`.
