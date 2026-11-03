# Text placement

Text placement seats every piece of text that is not inside a box: the labels of lines, the badges of numbered steps, group titles, notes, the labels of walls, bands, bars and lanes, and the legend. It never moves a box, and apart from a band's label it never moves a line. Where a text has no clear place, the write is refused, so that the agent changes the facts instead of the picture hiding something. It lives in `src/layout/` ([the architecture](ARCHITECTURE.md#text-placement)).

## How a text finds its place

Every kind of text is seated the same way. It has a fixed list of candidate places, each kept clear of what is already drawn by a few pixels. It takes the first clear one, or the cheapest where the places have costs. When none is clear, it tries the fallbacks of its kind. When those fail too, it takes its least bad place, and the write is refused.

```text
candidate places, in a fixed order or by cost
  │ the first clear one ─────────────────────────────> seated
  ▼ none clear
fallbacks of its kind: wrap, another gutter, a farther place
  │ one is clear ────────────────────────────────────> seated
  ▼ none clear
the least bad place, and the write is refused ───────> label-blocked or title-blocked
```

Texts are seated in the order the layout reaches them, so each keeps clear of what came before it. A band's label is seated before the lines, which keep clear of it. The router seats the lines' labels as it fills each gutter. Bar labels, lane labels and the legend follow once the lines are routed. Group titles, wall labels, step badges and notes come last, once every row has its y. The size of each text comes from the text measurer.

## Line labels

A line's label sits on its longest run, inside the gutter that run lies in, and keeps clear of everything else in that gutter:

- 4 px from its own line and 4 px from other lines.
- 24 px across and 4 px up or down from another label.
- 4 px from the sides of group boxes and of column lanes.

A wrapped label's lines are centred on each other.

### Slots

Each label gets a list of candidate slots, each with a score, lower being better:

```text
straight vertical line   on the line (−1), beside it on the right (0), on the left (1)
run as long as the label above, centred (0), then slid along in 4 px steps (+ the slide)
                         below, the same, each + 24
                         beside the run's ends (1000, 1001)
run shorter than label   beside its right end (−2), its left end (−1), then as above
```

A slot on the line exists only where the line passes straight through the gutter, and never for a line with a step badge, which keeps its label beside the line. A slot's cost is its score, plus 8 for each line inside the slot, plus 64 for each crossing that the order of runs it fixes would force. Labels compete for the same room, so the label with the fewest open slots chooses first, each taking its cheapest open slot.

### When no slot is clear

A label with no clear slot tries, in turn:

1. Its text on 2 lines and then on 3, at the narrowest width that wraps it.
2. The other gutters its line passes through, for up to 12 rounds.
3. Its longest run once more.

When all of these fail, it goes back to one line, takes the slot with the fewest conflicts, and the write is refused as `label-blocked`. A label whose route is later cut at a container is seated again beside what is left of the line, longest part first, and is refused the same way when that fails.

### Between neighbours

A line that runs straight across the gap between two neighbours carries its label above it. A second labelled line in the same gap takes its label below. Placement has already made the gap wide enough for the label.

## Step badges

A numbered line's badge is a ring 18 px across, centred on the run under the start of the label's text, or under its end when the start is off the run. The badge widens the label's slot by 9 px and deepens it by 7 px, so the text stands 7 px further off the line. Beside a vertical line, the badge sits on the line level with the text, which stands 13 px away. A numbered line with no label gets a slot 18 by 5 px.

Once every label is seated, a badge that still touches something slides along its own line, in 2 px steps, to the nearest place with 2 px of room. It keeps clear of boxes, text, walls, labels, other badges, other lines, its own arrowheads, and every border except those of its own ends. Two badges that leave each other no place try their first 40 places together. A badge that still touches something is the engine's defect `step-collision`.

## Group titles

A group's title sits where the agent states, in room placement has already made for it. No box or line moves for it.

| Place | Where the label sits |
|---|---|
| `top-left`, `top`, `top-right` | in the head, 12 px down and 16 px in |
| `bottom-left`, `bottom`, `bottom-right` | in a foot below the last row |
| `outside-top`, `outside-bottom` | centred just outside the box |
| `left`, `right` | in a strip inside, at the middle height |
| `outside-left`, `outside-right` | 12 px past the side, at the middle height |

A title never wraps, and its sublabel follows it 10 px apart, within the same clear span.

Without a stated place, the title is seated in the head once the lines are drawn. It tries every seat from 16 px in on the left to 16 px in on the right, in 4 px steps, and takes the leftmost one that no line comes within 6 px of and no line label overlaps. When none is clear, it sits at the leftmost seat.

Wherever the title sits, a line within 6 px of it is the agent's defect `title-blocked`.

## Notes

A note is a card beside its target, joined by a dotted line. With `footnote`, it is a number on the target and its text in a list at the bottom. Notes are seated last, after the badges settle, so they keep clear of everything else.

A card wraps at 160 px and tries its places in a fixed order, 16 px from its target and then 32 px:

- **Beside a box or a group:** first on the right and then on the left, each centred, top-aligned and bottom-aligned.
  - Then below and then above, each centred, left-aligned and right-aligned.
- **Beside a line:** at the middle, a quarter and three quarters of its longest part.
  - Below or above a horizontal part, and right or left of a vertical one.

A card keeps 8 px from boxes, text, other cards, walls, lane heads, the legend, the title and the subtitle, and 10 px from a badge. No line may touch it. It lies wholly inside or wholly outside each group, lane and band, and within the margins, from 14 px below the title down to the bottom of the content. Its dotted line must not meet another box, text, card or line. A card with no place takes its first place anyway, and the write is refused as `label-blocked` with `is: note`. A note on a band or a lane always has no place.

A footnote's number is a filled circle 16 px across. On a box it sits 6 px out from a corner, trying top right, top left, bottom right and bottom left. On a group it follows the title, and on a line it sits beside the line's parts. Footnotes are numbered from the top of the picture down, then from left to right. A footnote with no free place for its number has none, and its line in the list starts with its target's name.

## Wall labels

A wall's label is the only text on its dashed divider, and the divider breaks 4 px around it.

- **A wall across:** the label sits 4 px above the divider, anywhere from 16 px in at the start to 16 px in at the end.
  - It takes the first place that no vertical line comes within 8 px of.
- **A wall up and down:** the label wraps at 96 px and is centred on the divider.
  - It tries places from the top down in 4 px steps and needs 8 px of room from boxes, text and every line.

A label with no such place stays at the wall's start or its top, and the write is refused as `label-blocked` with `is: wall`.

## Bands, bars and lanes

- **A band's label** sits in its head, 10 px from the top.
  - It takes the first stretch of the row with no box below it that is the label's width plus 32 px.
  - With no such stretch it sits left of the content, 16 px from the band's side.
  - It is the one label that moves lines: vertical lines keep 6 px from it.
- **A bar's label** sits in the bar at its left, once the lines are routed.
  - It takes the first stretch 16 px clear of the lines that end at the bar and of the lines that pass it.
  - With no such stretch it sits left of the content and of every line through the bar.
  - The bar then reaches it.
- **A lane's label** sits in the lane's header.
  - For lanes as rows it sits in the header column on the left, 12 px in and 10 px down.
  - For lanes as columns, it is centred in the header on top and wraps at the lane's width less 24 px.

## The legend

The legend is a key in the top right, its first line level with the middle of the title and its right edge at the margin. It holds an entry only for what the agent named: a line style, a weight other than `thin`, or a mark, with marks of the same name sharing one entry. Each entry is a 28 px sample, 8 px of space and its words, with 24 px between entries.

The legend wraps onto more lines when it is wider than its room: the larger of its widest entry and the picture's width, at least 480 px, less the title and 48 px. The picture widens to hold the title, 48 px and the legend. A subtitle drops below a wrapped legend.
