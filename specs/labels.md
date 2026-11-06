# Text placement

Text placement seats every piece of text that is not inside a node: the labels of edges, the badges of numbered steps, group titles, notes, the labels of walls, bands, bars and lanes, and the legend. It never moves a node, and apart from a band's label it never moves an edge. Where a text has no clear place, the write is refused, so that the agent changes the facts instead of the picture hiding something. It lives in `src/layout/`.

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

Texts are seated in the order the layout reaches them, so each keeps clear of what came before it:

```text
with the column grid    the labels of lines between neighbours, in the gaps made for them
before the lines        each band's label, which the lines keep clear of
while routing           the labels of lines in gutters, as each gutter is filled
after routing           bar labels and the legend
once rows have their y  lane labels, group titles, labels of routes cut at a container,
                        wall labels, step badges, then notes
```

The size of each text comes from the text measurer.

## Line labels

An edge's label sits on its line, inside the gutter of its longest run, and the line passes through it. An agent may take one edge's label off its line, and the label then sits beside the line. It keeps clear of everything else in that gutter:

- 4 px from other edges, and from its own edge when it sits beside it.
- 24 px across and 4 px up or down from another label.
- 4 px from the sides of group nodes and of column lanes.

A label's patch takes the color behind it unless the label marks a style, whose `fill`, `border` and `color` it then takes. A wrapped label's lines are centred on each other unless the agent aligns them. A break the agent states holds on every form, and the engine may still wrap each stated line.

Once the lines are drawn, a label on a vertical run moves to the run's middle, keeping 12 px from each end. Where that is not clear, it takes the nearest clear place on the way back to its seat, in 4 px steps. It moves no line. Clear means 4 px from other lines and labels, wholly inside or outside each group, band and lane, and out of a wall.

### Seats

Each label gets a list of candidate seats, each with a score, lower being better:

```text
straight vertical line   on the line (−1), beside it on the right (0), on the left (1)
run past the label       on the run, centred (−1), then slid along in 4 px steps (+ the slide)
                         above, centred (0), then slid along in 4 px steps (+ the slide)
                         below, the same, each + 24
                         beside the run's ends (1000, 1001)
run shorter than label   on the line into or out of the run (−4, −3), 8 px past the run's corner
                         beside its right end (−2), its left end (−1), then as above
```

A seat on a run keeps 8 px from the run's corners. A seat on the edge never exists for an edge with a step badge, whose label stays beside the edge, or for a label the agent took off its line. A seat's cost is its score, plus 8 for each edge inside the seat, plus 64 for each crossing that the order of runs it fixes would force. Labels compete for the same room, so the label with the fewest open seats chooses first, each taking its cheapest open seat.

### When no seat is clear

A label with no clear seat tries, in turn:

1. Its text on 2 lines and then on 3, at the narrowest width that wraps it.
2. The other gutters its edge passes through, for up to 12 rounds.
3. Its longest run once more.

When all of these fail, it goes back to one line, takes the seat with the fewest conflicts, and the write is refused as `label-blocked`. A label whose route is later cut at a container is seated again beside what is left of the edge, longest run first, and is refused the same way when that fails.

### Between neighbours

An edge that runs straight across the gap between two neighbours carries its label on it. With two labelled lines in one gap, the upper label sits above its line and the lower label below its line, since neither has room on its line. These labels are seated with the column grid, which makes the gap wide enough for them.

## Step badges

A numbered line's badge is a ring 18 px across, centred on the run under the start of the label's text, or under its end when the start is off the run. The badge widens the label's seat by 9 px and deepens it by 7 px, so the text stands 7 px further off the edge. Beside a vertical line, the badge sits on the edge level with the text, which stands 13 px away. A numbered line with no label gets a seat 18 by 5 px.

Once every label has its seat, a badge that still touches something slides along its own edge, in 2 px steps, to the nearest place with 2 px of room. It keeps clear of nodes, text, walls, labels, other badges, other edges, its own arrowheads, and every border except those of its own ends. Two badges that leave each other no place try their first 40 places together. A badge that still touches something is the engine's defect `step-collision`.

## Group titles

A group's title sits where the agent states, in room placement has already made for it. No node or line moves for it.

| Side and place | Where the label sits |
|---|---|
| `top`, `inside` | in the head, 12 px down, from 16 px in at one end to 16 px in at the other |
| `bottom`, `inside` | in a foot below the last layer, across the same span |
| `top` or `bottom`, `outside` | just outside the node, across its full width |
| `left` or `right`, `inside` | in a strip inside, 16 px in, from the top of the side to its bottom |
| `left` or `right`, `outside` | 12 px past the side, from the top of the side to its bottom |

The fraction runs from 0 to 1 along the side, and the label's own point at that fraction meets the side's, so the label never runs past the side.

A title never wraps, and its sublabel follows it 10 px apart, within the same clear span.

Without a stated place, the title is seated in the head once the edges are drawn. It tries every seat from 16 px in on the left to 16 px in on the right, in 4 px steps, and takes the leftmost one that no edge comes within 6 px of and no edge label overlaps. When none is clear, it sits at the leftmost seat.

Wherever the title sits, an edge within 6 px of it is the agent's defect `title-blocked`.

## Notes

A note is a card beside its target, joined by a dotted line. With `footnote`, it is a number on the target and its text in a list at the bottom. Notes are seated last, after the badges settle, so they keep clear of everything else.

A card's lines start left unless the agent aligns them, and a card wraps at 160 px and tries its places in a fixed order, 16 px from its target and then 32 px:

- **Beside a node or a group:** first on the right and then on the left, each centred or top-aligned or bottom-aligned.
  - Then below and then above, each centred or left-aligned or right-aligned.
- **Beside an edge:** at the middle, a quarter and three quarters of its longest run.
  - Below or above a horizontal run, and right or left of a vertical one.

A card keeps 8 px from nodes, text, other cards, walls, lane heads, the legend, the title and the subtitle, and 10 px from a badge. No edge may touch it. It lies wholly inside or wholly outside each group, lane and band, and within the margins, from 14 px below the title down to the bottom of the content. Its dotted line must not meet another node, text, card or line. A card with no place takes its first place anyway, and the write is refused as `label-blocked` with `is: note`. A note on a band or a lane always has no place.

A footnote's number is a filled circle 16 px across. On a node it sits 6 px out from a corner, trying top right, top left, bottom right and bottom left. On a group it follows the title, and on an edge it sits beside the edge's runs. Footnotes are numbered from the top of the picture down, then from left to right. A footnote with no free place for its number has none, and its edge in the list starts with its target's name.

## Wall labels

A wall's label is the only text on its dashed divider, and the divider breaks 4 px around it.

- **A wall across:** the label sits 4 px above the divider, anywhere from 16 px in at the start to 16 px in at the end.
  - It takes the first place that no vertical line comes within 8 px of.
- **A wall up and down:** the label wraps at 96 px and is centred on the divider.
  - It tries places from the top down in 4 px steps and needs 8 px of room from nodes, text and every edge.

A label with no such place stays at the wall's start or its top, and the write is refused as `label-blocked` with `is: wall`.

## Bands, bars and lanes

- **A band's label** sits in its head, 10 px from the top, at the agent's fraction of it when stated.
  - A band in a lane whose label reads the same draws none.
  - It takes the first stretch of the layer with no node below it that is the label's width plus 32 px.
  - With no such stretch it sits left of the content, 16 px from the band's side.
  - It is the one label that moves lines: vertical lines keep 6 px from it.
- **A bar's label** sits in the bar at its left, once the edges are routed, or at the agent's fraction, where a line through it is refused as `label-blocked`.
  - It takes the first stretch 16 px clear of the edges that end at the bar and of the edges that pass it.
  - With no such stretch it sits left of the content and of every edge through the bar.
  - The bar then reaches it.
- **A lane's label** sits in the lane's header, at the agent's fraction along it when stated.
  - For lanes as layers it sits in the header column on the left, 12 px in and 10 px down.
  - For lanes as columns, it is centred in the header on top and wraps at the lane's width less 24 px.

## The legend

The legend is a key in the top right, its first line level with the middle of the title and its right edge at the margin. It holds an entry only for what the agent named: an edge style, a weight other than `thin`, or a mark, with marks of the same name sharing one entry. Each entry is a 28 px sample, 8 px of space and its words, with 24 px between entries.

The legend wraps onto more lines when it is wider than its room: the larger of its widest entry and the picture's width, at least 480 px, less the title and 48 px. The picture widens to hold the title, 48 px and the legend. A subtitle drops below a wrapped legend.

## Decisions

- [030. Notes as callouts or footnotes](decisions/030-notes-as-callouts-or-footnotes.md)
- [039. Step badges ride the line](decisions/039-step-badges-ride-the-line.md)
- [040. The agent states where a group's label sits](decisions/040-the-agent-states-where-a-group-s-label-sits.md)
- [061. A line never moves for its label](decisions/061-a-line-never-moves-for-its-label.md)
- [062. A group's label moves no box and no line](decisions/062-a-group-s-label-moves-no-box-and-no-line.md)
- [063. A wall's label stays along its wall](decisions/063-a-wall-s-label-stays-along-its-wall.md)
- [064. A note is what the agent states](decisions/064-a-note-is-what-the-agent-states.md)
- [065. Unreadable is refused and costly is reported](decisions/065-unreadable-is-refused-and-costly-is-reported.md)
- [051. A label sits on its straight vertical line](decisions/051-a-label-sits-on-its-straight-vertical-line.md)
- [076. A band in a lane of its name draws no label](decisions/076-a-band-in-a-lane-of-its-name-draws-no-label.md)
