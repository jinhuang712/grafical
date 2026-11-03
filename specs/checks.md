# The checker

The checker looks at a laid-out picture and says what is wrong with it. It finds three things: defects, which draw wrong; warnings, which draw poorly; and counts, which say how the picture is drawn. It never changes the picture, and it gives no advice. It lives in `src/check/`, and the write path that acts on it in `src/cli/pipeline.ts` ([the architecture](ARCHITECTURE.md#the-checker)).

```text
laid-out picture
  ├── defects ──┬── owned by the agent ──> the write is refused
  │             └── owned by the engine ──> written, shown only by check --all
  ├── warnings ──> printed after every write, check and render, never refused
  └── counts ────> the counts record, and the gutter records of show --drawn
```

## Defects and who owns them

Every defect has an owner: whoever can fix it. The agent owns a defect that a fact it stated caused, such as a label too long for its box. The engine owns one that the engine drew wrong where a plain form was there, such as a line through a box.

A write with a defect the agent owns is refused and changes nothing. A defect the engine owns is an engine bug: the write goes ahead, the agent is not told, and only `grafical check --all` reports it, so that the tests and the benchmarks count it. Its `next` is always empty, since no command of the agent's can change it.

The defects the agent owns:

- `overflow`: text that does not fit its box by the text measurer's test, a lane's label outside its head, or a note over 4 lines.
- `missing-glyph`: a character neither bundled font can draw.
- `mark-covers`: a mark that covers text or another box.
- `wall-crossed`: a line through a wall that does not allow it.
- `box-aside`: a box placed by steps wholly beside every box it connects to.
- `title-blocked`: a group's label that a line comes near.
- `label-blocked`: a line's label, a step's badge, a wall's label or a note's card with no clear place.

The defects the engine owns:

- `node-overlap`, `edge-through-node` and `group-intruder`: boxes that overlap, a line through a box, and a box inside a group it is not in.
- `label-collision`, `step-collision` and `text-crossing`: text that touches other text, a badge that touches anything, and a line across text.
- `edge-overlap`: two lines that share a stretch of 8 px or more, so a reader cannot tell them apart.
- `lane-stray`: a box outside its lane.
- `needless-bend`: a line between neighbouring rows that bends although one straight run would join it.

Two lines that leave one box in one style with no label are a bus and never an `edge-overlap`. Nor is an overlap whose ends lie within 4 px of a box they share.

## When there is no plain form

The engine draws each thing in a few plain forms: a line straight or with one or two bends, a label on or beside a run of its own line, a title at its place, a note as the agent said. When the facts leave no plain form, what happens depends on what it would cost a reader.

Where drawing would hide something a reader needs, the write is refused as a defect the agent owns:

- A line's label or a step's badge that no gutter on its way holds clear of the other lines is `label-blocked`.
  - The refusal names the line, and the lines across the label as `across`.
  - It also names the borders the label crosses and the gutters it tried, each `<row above>/<row below>`.
  - Its `next` is `layer move`, `node resize`, `node move`, `edge relabel` and `edge step`.
- A wall's label with no clear place along its wall is `label-blocked` with `is: wall`, naming the wall and the lines and boxes in the way.
  - Its `next` is `wall relabel` and `node move`.
- A note's card with no clear place beside its target is `label-blocked` with `is: note`, naming the target and the lines and boxes in the way.
  - Its `next` is `note add`, `note remove` and `node move`.
- A group's label that a line comes near is `title-blocked`, naming the group and the lines.
  - On `check` it also lists as `clear` the other places where no line would come near, each found by laying the diagram out again.
  - A write leaves `clear` out.
  - Its `next` is `group title`, `node move` and `edge remove`.

Where drawing only costs, the picture is drawn and every write reports it. A line with more than two bends is the one such case today: it is a `bent-line` warning and counts in `bent`.

No refusal writes the change for the agent. A block names the commands that can act, never a command line with values.

## Warnings

Every write prints every warning the diagram has, not only those the command caused, and so do `check` and `render`. A warning never refuses anything and has no source, because the outcome line already names what the write changed. Each prints as its own block, in this order:

| Code | What it names | Detail | `next` |
|---|---|---|---|
| `bent-line` | a line with more than two bends | `edge`, `bends`, `skip` | `layer move`, `node move`, `node swap` |
| `passing-row` | a line through rows between its ends, among their boxes, meeting none | `edge`, `rows` | `layer move`, `node move`, `node swap` |
| `line-across-group` | a line through a group that holds neither end | `edge`, `groups` | `group order`, `node move`, `node swap` |
| `tight-lines` | two runs closer than 12 px for over 100 px | `edges`, `over` | `layer move`, `node move`, `node swap` |
| `crowded-label` | a label with under 8 px of room on two sides | `edge` | `node move`, `node swap`, `edge relabel` |
| `lonely-box` | a box no line reaches | `node` | `node remove`, `edge add` |
| `line-per-member` | a group each of whose boxes has a line alike to one end | `group`, `edges` | `edge add`, `edge remove` |
| `crossing` | a pair of lines that cross | `edges` | `group order`, `layer move`, `node move`, `node swap` |

A line that ends at a group, a row or a lane reaches every box in it, so none of those boxes is a `lonely-box`.

`line-per-member` names a group of two or more boxes, the boxes of its inner groups included, in which every box has a line to one end outside the group, or from it. The lines must agree in direction, outer end, kind, label, weight and arrowheads. `edges` holds the first such line of each box, in the group's order. A group inside one that has the same lines is left out, so only the outer group is named.

## Counts

The counts record is one line of facts, with no threshold. Its keys, in order: `nodes`, `lines`, `crossings`, `bends`, `bent`, `length`, `width`, `height`, `fullest`, `busiest`, `longest`, `passing`, `across`, `tight` and `crowded`. The last five count the places the first five warnings name:

- `bent`: the lines with more than two bends.
- `passing`: the lines with a vertical run in a row strictly between their ends' rows, within that row's height and between its outermost boxes.
  - A row with no box counts as a row here.
- `across`: the lines with a run through the box of a group that holds neither end.
  - A group holds an end that is the group or a member or lies inside its box.
  - A line counts once, however many groups it crosses.
- `tight`: the pairs of runs of two different lines under 12 px apart that share more than 100 px.
  - Lines that share a port are one bundle and never a pair.
  - A pair is a place: two lines tight in two places count twice.
- `crowded`: the labels with under 8 px of room on two or more of their four sides.
  - Room is measured to the sides of boxes, groups and bands, and to other lines and labels.
  - Lanes and walls do not count.

`crossings` counts points, so a pair that crosses twice counts twice there and is one `crossing` warning.

## Gutters

`show --drawn` prints a `gutter` record for each pair of neighbouring rows, `gutter above=<row> below=<row> lines= crossings= tight= crowded=`. A row with no box, drawn as a bar, has a gutter too. The gutter is the band from the lowest bottom of the upper row's boxes to the highest top of the lower row's, across the whole picture.

- `lines` counts the lines with any run in the band, including those that only pass through.
- `crossings` counts the crossing points inside the band.
- `tight` counts a vertical pair in every gutter it overlaps, and a horizontal pair in the gutter at its height.
- `crowded` counts a label whose centre lies inside the band.

The agent compares gutters to see which order of rows costs. The record gives no advice and no sum.

## Rules that are no longer reported

`src/check/taste.ts` still measures the rules of decision [012: A target picture with measured rules](decisions/012-a-target-picture-with-measured-rules.md): a canvas at most 1024 px wide, at most one crossing per ten lines, at least half the lines straight, no line over two bends, at most 40% of lines labelled, at most three line styles, at most 16 boxes, and no corridor through a box. No command calls it. Only its limit of two bends is used, for `bent` and `bent-line`.
