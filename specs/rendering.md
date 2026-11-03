# The renderer

The renderer turns a laid-out picture into an SVG and the SVG into a PNG. It places nothing: every box, route and label already has its place, and the renderer only draws them in the theme's paint. It reads no system font and no file of its own, so the same picture gives the same SVG bytes and the same PNG pixels on any machine. It lives in `src/render/`.

```text
laid-out picture ──┐
theme's paint ─────┼──> SVG writer ──> SVG ──> resvg, with the bundled fonts ──> PNG
marks' bytes ──────┘
```

## Writing the SVG

The renderer writes the SVG itself, with every element and attribute in a fixed order and numbers at no more than 2 decimals. It drops the control characters XML cannot hold.

Each label is split into runs of one font, and each run is its own `<text>` element at the x the text measurer gave it. resvg does not choose a font per character: given a font stack, it would draw a whole label from Noto as soon as Inter lacked one of its characters. A text mark is the one exception: it is one centred `<text>` element, in Noto when any character is CJK and in Inter otherwise.

Behind every line label the writer puts a patch that reaches 3 px past the text on each side and 1 px above and below it. Its fill is that of the innermost group, band or lane under the label's centre, or the theme's label background, so a line that runs under the label is broken there.

## Drawing the PNG

`@resvg/resvg-js` draws the SVG into a PNG at the scale asked for. It is given only the four bundled font files, with `Inter` as the default family, and system fonts turned off. No browser takes part.

## How lines are drawn

The writer adds the marks of a route as it draws it, so the routes, the checks and the counts never see them:

- **Hops.** Where two lines cross, the horizontal run hops over the vertical one in an arc 4 px high and 8 px wide.
  - Crossings under 10 px apart share one wider arc, and a crossing within 5 px of a run's end is drawn plain.
- **Dots.** A dot marks every point where one line starts or stops running along another.
  - Its radius is the line's width plus 1.5 px.
- **Curves.** With `paint.edge.shape: curved`, each corner is as round as half of each of its two runs.
  - The curve is checked at three points against boxes, labels, step badges and other lines.
  - It is halved while it comes within 4 px of one.
  - It is never less round than the theme's corner radius, or half of each run when that is smaller.
  - The corner radius is 6 px in `default` and `dark`, and 4 px in `print`.

## Marks

A mark sits in a slot of its box and never at a position. A corner mark is centred on its corner, takes no room and moves nothing; a wide badge grows inward from the corner. The `left` mark sits left of the text, in room the text gives up. A diamond and a dot have no `left` slot.

A mark is one of three things:

- An emoji: one grapheme that starts with a pictographic character, drawn from the bundled Twemoji images and never from a font.
  - One with no image is refused as `mark-not-drawn`.
- A file in SVG or PNG, embedded in the SVG as a data URI.
  - So the output never links to a file.
- Any other text of up to 6 graphemes, drawn on a badge.

A mark's size step `s`, `m` or `l` is 16, 20 or 28 px high, and a picture is square at that size. A text badge is as wide as its text plus padding and never narrower than it is high.

A badge's colors take a name (`red`, `amber`, `green`, `blue`, `purple`, `gray` or `dark`) or a hex, and the file stores a name as its hex in lowercase. Without `--fg`, the text color is the one that reads better on the badge. An emoji or a file takes only a size: a badge's colors or shape on one are refused as `mark-style-on-picture`.

The command line reads a mark's file and gives its bytes to the renderer. It reads the file when the operation names it, and the diagram file stores its SHA-256. Every later load reads it again:

- A path that is absolute or leaves the folder is refused as `mark-file-outside`.
- A file that is gone is refused as `mark-file-not-found`, and one whose hash differs as `mark-file-changed`.
- An SVG with a script, a `foreignObject`, an event handler or an outside reference is refused as `mark-file-unsafe`.
- So is a file with no `<svg>` at all.
- A PNG whose signature is wrong is refused as `mark-file-unreadable`.
