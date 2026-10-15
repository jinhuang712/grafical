<!-- what-we-build: approved 2026-10-15 -->
# Features

What grafical does, from the side of the agent that draws and the person who asks. Why each one works the way it does is in [DESIGN.md](DESIGN.md). `grafical --help` and each command's `--help` hold the full syntax.

✅ built · 🚧 built, with a gap named · ⬜ planned

## Drawing in steps

### Operations ✅

Every change to a diagram is one named operation, run as a command. The diagram file is `<name>.grafical.yaml` by convention.

```sh
grafical new arch.grafical.yaml --title "Order flow"
grafical node add arch.grafical.yaml api --layer app --label "Order API" --kind service
```

- On the command line an operation is `grafical <noun> <verb> <file> …`, and every other value is a flag, such as `--label`.
- `grafical new` takes the title, and optionally `--subtitle`, `--note`, `--density`, `--sizing` and `--style`.
- Every write reports the IDs it changed and any defects. A refused write changes nothing.
- Every command takes `--json`, which prints the same report as JSON.
- Exit codes: 0 for success, 1 for a refused operation or a defect, 2 for a usage error. The parser's own refusals (an unknown option, a missing argument, an unknown command) print as `error code=<code> found=<word>` on standard error, such as `error code=unknown-option found=--bogus`.

### Batches ✅

Many operations at once, all or nothing.

```sh
grafical apply arch.grafical.yaml batch.yaml
```

A batch file is a YAML list. Each item has `op: <noun>.<verb>` and the same fields as the command's flags, in camelCase:

```yaml
- op: node.add
  id: cache
  layer: storage
  label: Redis
  kind: store
- op: edge.add
  from: api
  to: cache
  label: read
```

grafical checks each operation in order, and writes only when every one is valid and the picture has no defect the agent must fix. Otherwise nothing changes, and the reply names the first operation that failed.

### Trying a change ✅

See what a batch would do before making it.

```sh
grafical try arch.grafical.yaml batch.yaml
```

`try` applies the batch without writing it, and prints the drawing's counts before and after it, and a `delta` record of the change in each. The agent decides what to try, and grafical measures.

### IDs ✅

The caller names every row, group, lane, column, wall, box and line, and a name never changes while the element exists.

- A rename changes the label, never the ID.
- A line's ID defaults to `<from>-><to>`, with a suffix when the same pair is connected twice. A reversed line keeps its ID.
- A taken ID is refused, with a free one suggested.

### Refusals ✅

A wrong operation is refused at once, as one record of facts.

```text
error op=0 code=bad-value field=kind found=database likely=store allowed=service,store,...
```

- A refusal names its code, the operation, the field and what was found.
- Then come facts: `near` (the closest IDs), `likely` (the value it most likely meant), `allowed`, `free`, `count`, `lines`, `min`, `max`, the `row`, `group` or `node` it concerns, `line` and `column` in the YAML, and `fix`, operations that would fix it.
- A YAML syntax error gives the text of its line.

## Boxes

### Kinds and shapes ✅

A box's kind says what it is and decides how it is drawn.

| Kind | Drawn as |
|---|---|
| `service` | a box |
| `store` | a cylinder |
| `queue` | a box in its own tint |
| `external` | a box with a dashed border |
| `actor` | a pill |
| `state` | a box with rounder corners |
| `terminal` | a tinted pill, a flowchart's start or end |
| `decision` | a diamond, its text in the middle |
| `initial`, `final` | a filled dot and a ringed dot, a state machine's start and end. Their labels stay in the file and are not drawn |

```sh
grafical node kind <file> <id> <kind>
```

### Labels and sublabels ✅

A box has a label, and optionally a quieter sublabel, such as a port or a topic.

```sh
grafical node rename <file> <id> --label <text>
grafical node describe <file> <id> [--text <text>]
```

- Labels wrap at spaces, hyphens, underscores and slashes, and between characters in Chinese text.
- A label that still does not fit its box is refused as `overflow`, with the lines it takes and the most it may.
- A character the bundled fonts cannot draw is refused as `missing-glyph`.
- `describe` without `--text` clears the sublabel.

### Sizes ✅

A box is sized to its text, unless the agent gives it a size step.

```sh
grafical node resize <file> <id> [--size s|m|l]
grafical diagram sizing <file> auto|fixed
```

- A box without a size is medium, or large when its text does not fit the medium box. A rename that shortens the label shrinks it again.
- `resize` without `--size` returns the box to that.
- Every box in a row is drawn as tall as the row's tallest, so their tops line up. Dots and diamonds keep their shapes.
- `sizing: fixed` turns this off: a box without a size is always medium, and text that does not fit is refused.

### Marks 🚧

A box can carry up to five marks, such as `⚠️` on a box that matters, or `P0` on a badge.

```sh
grafical node icon <file> <id> --slot <slot> [--icon <mark>] [--bg <color>] [--fg <color>] [--border <color>] [--shape <shape>] [--size s|m|l]
```

- The slots are `top-left`, `top-right`, `bottom-left`, `bottom-right` and `left`, one mark each. A diamond and a dot have corner slots only. Without `--icon`, the slot is cleared.
- A mark is an emoji, a text of up to 6 characters, or an SVG or PNG file inside the diagram's folder.
- A text mark sits on a badge. `--bg`, `--fg` and `--border` take a color by name (`red`, `amber`, `green`, `blue`, `purple`, `gray`, `dark`) or as `#rrggbb`. `--shape` is `square`, `rounded` (the default) or `pill`. Without `--fg`, grafical picks light or dark text, whichever reads better.
- `--size` is `s`, `m` (the default) or `l`, 16, 20 or 28 px high, for any mark.
- A corner mark sits centred on its corner and moves nothing else. The `left` mark takes a column inside the box, and the text gives up that width.
- A mark file that changes or goes missing fails the load (`mark-file-changed`, `mark-file-not-found`). Setting the slot again accepts the file as it is. An SVG with a script, an event handler or an outside reference is refused as `mark-file-unsafe`, and so is a path outside the diagram's folder.
- An emoji with no image is refused as `mark-not-drawn`. A mark that covers text or another box is a defect, `mark-covers`.

Gap: a corner mark is not checked against the lines that leave the box near its corner.

### Marks by name ⬜

A mark taken by name from one icon set that grafical bundles, so that an agent need not find a file for every box.

```sh
grafical node icon <file> <id> --slot <slot> --icon <set>:<name>
```

- The set is a permissively licensed one, such as Lucide (ISC) or Tabler (MIT). A cloud vendor's own icons stay files the agent brings.
- An unknown name is refused, with `near` and `likely`.

### Emphasis ✅

At most two boxes stand out, as what a reader should see first.

```sh
grafical node emphasize <file> <id> [--off]
```

### Merging and swapping ✅

```sh
grafical node merge <file> <new-id> --nodes a,b,c --label <text> [--sublabel <text>] [--kind <kind>]
grafical node swap <file> <a> <b>
grafical node remove <file> <id>
```

- `merge` replaces boxes with one new box where the first one was. It keeps each of their lines once and drops the lines between them. It may reuse a merged box's ID. Boxes aligned to a merged box lose the alignment.
- `swap` trades the places of two boxes: their row and slot.
- `remove` takes the box's lines with it and reports their IDs. A box that others are placed by steps from stays while they are (`step-anchor`).

## Lines

### Kinds ✅

A line's kind says what it means and decides its style.

| Kind | Drawn as | Means |
|---|---|---|
| `call` | solid, with an arrowhead | a call |
| `data` | solid, with an arrowhead | a data read |
| `async` | dashed, with an arrowhead | a message through a queue |
| `optional` | dotted, with an arrowhead | a call that happens only sometimes |
| `link` | plain, with no arrowhead | related, with no direction |

```sh
grafical edge add <file> <from> <to> [--id <id>] [--label <text>] [--kind <kind>] [--both]
grafical edge kind <file> <id> <kind>
grafical edge relabel <file> <id> [--label <text>]
grafical edge reverse <file> <id>
grafical edge retarget <file> <id> [--from <end>] [--to <end>]
grafical edge remove <file> <id>
```

- `relabel` without `--label` clears the label. `retarget` moves one or both ends, and keeps the ID, kind and label.

### Arrowheads at both ends ✅

```sh
grafical edge both <file> <id> [--off]
```

A `link` takes no arrowheads, so `both` on a link is refused as `both-on-link`.

### Weight ✅

Some lines are thicker than others, to say they matter more.

```sh
grafical edge weight <file> <id...> [--weight <level|pixels>]
grafical edge emphasize <file> <id...> [--off]
```

- A weight is a level, `thin`, `thick` or `heavy`, or a width from 0.5 to 8 px. The built-in themes draw the levels 1.25, 2.5 and 4 px wide.
- Without `--weight`, the line is thin again.
- `emphasize` makes a line `thick`, the main path.
- A stylesheet may retune the levels and add more, such as `critical`. A level the stylesheet lacks is refused as `unknown-weight`, with the allowed names.
- The arrowhead grows with the width.

### Numbered steps ⬜

A number on a line, so that a reader can follow a request or a process in order.

```sh
grafical edge step <file> <id> [--n <number>]
```

- The agent states each number, and grafical draws it as a small badge on the line. `show --drawn` adds `step=<n>` to the line's record.
- Without `--n`, the step is cleared.

### Ends at a group, a row or a lane ✅

One arrow can point at a whole system instead of each of its parts.

- Either end of a line may be a box, a group, a row or a lane. A row a line ends at is drawn as a band, with its label above it, and a line meets the band straight past its other end where nothing is in the way.
- An end may not lie inside the other (`edge-inside`), a container end must hold a box (`empty-container`), and an end that shares a row with a group must sit right beside it there (`edge-blocked`).
- Two lanes are never the two ends of one line (`lane-to-lane`).
- Removing a group or a lane removes the lines that end at it.

### How lines are drawn ✅

The agent says what connects. grafical draws every line.

- Lines run in horizontal and vertical stretches through the gaps between rows and boxes, never through a box or across text.
- A line may leave or enter a box on any side. Each line has its own place on a side, spread evenly.
- Three or more unlabelled lines of one style that leave one side of a box leave as one line and split near their targets, with a dot at each split. Labelled lines and two-way lines keep their own place.
- Where two lines cross, one hops over the other. Where lines join on purpose, a dot marks the join.
- A label sits beside its line. When there is no room, it wraps, moves to another gap on its way, or its line steps out to make room.
- A stylesheet may draw the corners curved, with `paint.edge.shape: curved`. The routes stay the same.

## Placing

### Rows and order ✅

A box sits in a row, in an order. Rows are not drawn: they only place.

```sh
grafical layer add <file> <id> --label <text> [--before <row> | --after <row>]
grafical layer rename <file> <id> --label <text>
grafical layer move <file> <id> --first | --last | --before <row> | --after <row>
grafical layer remove <file> <id>
grafical layer split <file> <id> <new-id> --label <text> [--from <node>]
grafical node add <file> <id> --layer <row> --label <text> [--kind <kind>] [--sublabel <text>] [--size s|m|l] [--first | --last | --before <node> | --after <node>] [--align <node>] [--accent]
grafical node move <file> <id> [--layer <row>] [--first | --last | --before <node> | --after <node>]
```

- A new row goes to the bottom unless `--before` or `--after` places it.
- A box added to a row, or moved into another row, says where it goes: `--first`, `--last`, `--before` or `--after`. Without one it is refused as `missing-field`, with the row and the boxes in it. Only the first box of an empty row needs none (DESIGN.md, "The agent states every order").
- `layer split` moves the second half of a row, or its boxes from one box on, into a new row below it.
- A row can be removed only when it is empty, and the lines that end at it go with it.

### Alignment ✅

```sh
grafical node align <file> <id> [--to <node>]
```

A box sits directly above or below a box in another row, and its row slides sideways as one block to put it there. An alignment that cannot hold with the order of either row is refused, as `alignment-conflict` or `alignment-cycle`. Without `--to`, the alignment is cleared.

### Columns ✅

A second placement fact beside rows. Nothing is drawn: a column is a guide.

```sh
grafical column add <file> <id> [--nodes a,b] [--before <column> | --after <column>]
grafical column join <file> <column> <member...>
grafical column leave <file> <member...>
grafical column remove <file> <id>
```

- Every box of a column sits left of every box of the next, across all rows, with at least a row's gap between them. Columns go left to right in the order they were added, unless placed `--before` or `--after` another.
- A group as a member brings its boxes. A box in no column keeps its place beside the box left of it.
- An order that another fact contradicts is refused as `column-order`, naming two boxes whose order cannot hold.
- A diagram has columns or lanes that run as columns, not both (`column-lanes`).
- Removing a column leaves its boxes where they are.

### Steps from another box ✅

A box in no row, placed some cells of the grid from another box.

```sh
grafical node add <file> <id> --from <node> [--down <n> | --up <n>] [--left <n> | --right <n>] --label <text> [--kind <kind>]
grafical node move <file> <id> [--from <node>] [--down <n> | --up <n>] [--left <n> | --right <n>]
```

- Each step is a whole number from 1 to 10, and at least one is given. A step is one cell of the grid: a row down or up, a column left or right.
- The box moves with the box it steps from, which may itself be placed by steps.
- Past the first or last row, the box lands in a row grafical adds, which `show --drawn` names `-`. The boxes of a row it lands in stand aside.
- A cell another fact keeps is refused as `step-blocked`, a box that steps from itself as `step-cycle`. Steps are not combined with a row, a position, an alignment, a column or a lane (`conflicting-position`).
- `node move --layer` puts the box back in a row. `node move` with steps and no `--from` keeps the box it steps from, and with `--from` alone keeps the steps.
- A box placed by steps beside every box it connects to, wholly left or right of them, is refused as `box-aside`, naming those boxes.

## Grouping

### Groups ✅

A group is a system, drawn as one box around its members, which may sit in several rows.

```sh
grafical group add <file> <id> --label <text> [--sublabel <text>] [--nodes a,b,c] [--in <group>]
grafical group join <file> <group> <node or group...>
grafical group leave <file> <node or group...> [--up]
grafical group rename <file> <id> --label <text>
grafical group describe <file> <id> [--text <text>]
grafical group order <file> <id> --before <group> | --after <group>
grafical group remove <file> <id> [--out]
```

- A group's box spans every row from its top member to its bottom one. The other boxes of those rows sit beside it, and nothing else lies inside it.
- Groups nest, up to three levels (`group-too-deep`). A group inside itself is refused as `group-cycle`.
- `join` moves a box out of its previous group, and also moves a whole group into another. `leave` takes members out of every group, or with `--up` one level out.
- `group order` puts a group's members before or after another group's, in every row the two share.
- `remove` keeps the members: they move into the group around it, or with `--out` out of every group. Lines that end at the group go with it.
- A box inside a box takes the canvas's fill, so the fills alternate by depth. A stylesheet may set `paint.nesting: shade` instead.

### Copying a group ⬜

A second zone, region or shard in one operation.

```sh
grafical group copy <file> <group> <new-id> --suffix <suffix> --before <group> | --after <group>
```

- The copy holds the group's boxes, its inner groups and the lines between them. Every copied ID ends in the suffix.
- Each copied box sits in its original's row. The agent states where the copy goes, before or after a group in every row the two share, as `group order` does (DESIGN.md, "The agent states every order").
- Not decided: whether lines to boxes outside the group are copied too.

### Deeper nesting ⬜

Groups nest up to five levels instead of three, as a cloud's account, region, network, zone and subnet do. The fuzz test must hold at five levels first.

### Swimlanes ✅

A swimlane is a labelled band that says who owns what. A diagram's lanes all run one way, as rows or as columns.

```sh
grafical lane add <file> <id> --label <text> [--members a,b]
grafical lane join <file> <lane> <member...>
grafical lane leave <file> <member...>
grafical lane rename <file> <id> --label <text>
grafical lane remove <file> <id>
```

- Rows as members make lanes that run as rows, with the label on the left. Boxes as members make lanes that run as columns, with the label on top. A group stands for its rows or boxes. Both in one diagram is refused as `lane-mixed`.
- A row lane's rows must be neighbours (`lane-gap`), and a row added between two rows of a lane joins it.
- Column lanes go left to right in creation order, and every row keeps that order. A box outside every lane sits right of the lanes, or left of them when it comes first in its row.
- A group lies inside one lane (`group-across-lanes`).
- `lane remove` keeps the members and removes the lines that end at the lane.

### Walls ✅

Empty space between two parts of a picture, which lines cross only where the wall allows.

```sh
grafical wall add <file> <id> --between a,b --and c,d [--allow e,f] [--label <text>]
grafical wall allow <file> <id> <pass...> [--off]
grafical wall remove <file> <id>
```

- Each side is a list of boxes and groups. When one side lies above the other, the wall runs across. When they sit side by side in their rows, it runs up and down. Otherwise it is refused as `wall-sides`, and so is a box on both sides.
- A wall is only as long as its two sides need.
- A line from one side to the other is refused as `wall-crossed`, unless `allow` names the line or a box or group at one of its ends, such as a gateway. Any other line drawn through the wall is a defect with the same code.
- Without a label, a wall is invisible: only its space shows. With a label, it draws a dashed divider through its middle.
- A box or group that is removed leaves the wall's sides, and a wall left with an empty side goes.

### Notes ✅

A short text attached to a box, a line or a group, to keep detail out of extra boxes.

```sh
grafical note add <file> --on <id> --text <text>
grafical note remove <file> --on <id>
```

- grafical picks how to draw it: a card beside its target, joined by a dotted line, where there is room, or a small number on the target and the text in a numbered list at the bottom, where there is not.
- A target has one note, and adding another replaces it. A note goes with its target.
- A note that takes more than four lines is an `overflow`.

## The whole picture

### Title, subtitle and footnote ✅

```sh
grafical diagram title <file> --text <text>
grafical diagram subtitle <file> [--text <text>]
grafical diagram note <file> [--text <text>]
```

The subtitle is one sentence under the title. The footnote says what the diagram leaves out, such as "Not shown: Redis name cache". Without `--text`, either one is cleared.

### Legend ✅

A key in the top right that says, in the agent's words, what the picture's styles, widths and marks mean.

```sh
grafical diagram legend <file> solid|dashed|dotted|plain|--weight <weight>|--mark <mark> [--text <text>]
```

- A line style, a line width other than `thin`, or a mark has an entry only when the diagram names it. A diagram that names nothing draws no legend.
- Without `--text`, the words are taken away, and the entry with them.
- `show --drawn` prints a `legend` record for each line style and width the picture draws, and for each named mark. `weight` is what `--weight` takes, and `text=-` marks a style or width with no entry.
- Marks with the same name share one entry.
- When the legend is wider than its room, it wraps onto more lines.

### Spacing ✅

```sh
grafical diagram density <file> compact|normal|airy
```

### Themes and stylesheets ✅

A diagram takes its whole look from a built-in theme or from a stylesheet file it names.

```sh
grafical diagram style <file> [<style>]
```

- The built-in themes are `default`, `dark` (light lines on a dark ground) and `print` (greys with stronger lines).
- A stylesheet, `<name>.grafical-style.yaml`, starts from a theme and overrides any of its values. Changing it changes every diagram that names it.
- Without a style, the default theme applies.

## Seeing the result

### Show ✅

The agent's view of a diagram, in place of reading the YAML.

```sh
grafical show <file> [--drawn]
```

- `show` prints the rows, the boxes in order, the groups, the lanes, the lines, the walls, the notes and the marks, in the same words as the operations.
- `show --drawn` prints how the picture is drawn, as records: each box's row, place, size and lines by side; each line's sides, bends, length, the shortest it could be, the rows it skips, the lines it crosses and the rows it passes; each wall's length and the lines through it; how each note is drawn; the lines bundled together; and the totals.

### Counts ✅

After `apply`, `check` and `render`, grafical prints the drawing's counts as one record:

```text
counts nodes=3 lines=2 crossings=0 bends=1 length=224 width=368 height=280 fullest=data:2 busiest=api:2 longest=api->cache:176 passing=0
```

They are facts, with no threshold and no advice: what they mean is the agent's to judge.

### Check ✅

```sh
grafical check <file> [--all]
```

`check` reports the defects the agent can fix. `--all` adds those only the engine can avoid, which are engine bugs.

### Render ✅

```sh
grafical render <file> [--svg [<out>]] [--png [<out>]] [--scale 1-4]
```

- With neither flag, `render` writes `<name>.svg` and `<name>.png` beside the file. One flag writes only that one.
- The SVG carries the title and a description for screen readers.
- The PNG is drawn with no browser, at a scale from 1 to 4.
- The same file gives the same SVG and the same PNG pixels on macOS and Linux.

### Live viewer ✅

A window that shows the diagram as it is now, while an agent draws it.

```sh
grafical view <file> [--port <n>] [--no-open]
```

- The window redraws within a moment of every change to the file, from any process, and briefly marks what changed.
- Beside the picture, a list says what each change did, as operations, newest first.
- The window opens at the picture's size and follows it. It serves on 127.0.0.1 only, and only shows: nobody edits on it.
- While the file cannot be read, it keeps the last good picture and shows the errors.
- Ctrl-C stops it.

### Diff ✅

```sh
grafical diff <file> [<git-rev>]
```

`diff` reports how the file differs from a git revision, `HEAD` by default, as a batch of operations that `apply` replays on the revision's file. Outside git it fails with `not-in-git`.

### Help ✅

The agent's whole reference.

```sh
grafical --help
grafical <command> --help
```

`--help` says what grafical is, how to work, what makes a diagram good, and how to draw each diagram type: C4, cloud, deployment, event flow, data flow, dependency graphs, flowcharts, state machines and swimlane processes. Each command's help adds its options, when to use it, common mistakes, limits and an example.

## Files

### The diagram file ✅

One YAML file holds the whole diagram.

```yaml
grafical: 1
title: Catalog sync
subtitle: The write side fills MongoDB; the read side serves it.
note: "Not shown: Redis name cache, auth-svc."
density: normal
layers:
  - id: ingest
    label: Ingest
    nodes:
      - id: relay
        label: catalog-relay
        kind: service
        sublabel: tier 1, :7101
        group: sync
      - id: kafka
        label: Kafka
        kind: queue
        group: sync
groups:
  - id: sync
    label: catalog-sync
edges:
  - id: relay->kafka
    from: relay
    to: kafka
    kind: async
    label: produce
```

- Keys appear in the order shown. `sizing` and `style`, when set, come right after `density`.
- A row's keys are `id`, `label`, `lane` and `nodes`. A box's keys are `id`, `label`, `kind`, `sublabel`, `size`, `accent`, `align`, `group`, `lane` and `column`.
- After `layers`, a `nodes` list holds the boxes in no row, each with `from` and its steps.
- After `groups` come `lanes`, `columns`, `walls` and `notes`, in that order. A group's keys are `id`, `label`, `sublabel` and `in`.
- A line's keys are `id`, `from`, `to`, `kind`, `label`, `both`, `accent` and `weight`. `both` and `accent` appear only when true, and `weight` only when it is not thin.
- A field that holds its default is left out.
- Rows, the boxes in a row and lines are ordered lists. The order of rows and boxes is their place in the picture. The order of lines is creation order and changes nothing visible.

### The stylesheet file ✅

```yaml
grafical-style: 1
base: default          # default, dark or print: every value not given comes from it
paint:
  background: "#ffffff"
  group: { fill: "#eef6f0", stroke: "#9cc7a8" }
  node:
    kinds:
      store: { fill: "#f0f2f5", stroke: "#b4bac3" }
    accent: { fill: "#fff4e5", stroke: "#d9822b" }
  edge:
    kinds:
      call: { stroke: "#2f6f4f" }
      async: { stroke: "#2f6f4f", dash: "4 3" }
    weights: { heavy: 5, critical: 6.5 }
type:
  title: { size: 22 }
  node-label: { size: 14, weight: 600 }
```

- `paint` holds every colour, line width and corner radius, by role. Any box kind may take a dashed border. Only `async` and `optional` lines have a dash pattern, because a line's kind decides its style.
- `type` holds a size, from 6 to 48, and a weight, 400 or 600, per text role. Larger type changes the layout, and text that no longer fits is refused as `overflow`.
- An unknown key, a malformed colour or a weight the fonts lack is refused with the path of the value.
- A missing stylesheet fails every command that reads the diagram with `style-not-found`, and a wrong one with `bad-stylesheet`.

## Later

These are wanted, but not scheduled. Each becomes a planned feature once ROADMAP.md gives it a milestone.

- **More combinations of operations.** The owner said on 2026-10-14 that what grafical lacks is more ways to combine its operations. What form that takes is not decided, such as one operation for a common edit ("put a cache between the API and the database") or for a common shape.
- **Flow direction:** rows become columns, so that a diagram reads left to right. Held by the owner on 2026-10-14, because most of the layout assumes rows run across, and nothing yet shows it helps.
- **Lanes both ways in one diagram,** as a grid of lanes and phases.
- **Diagram types with a layout of their own:** sequence, entity-relationship and class diagrams, mind maps and timelines.
- **Importing** Mermaid, draw.io and Excalidraw files.
- **An MCP server** over the same operations.
- **Views:** one file, several pictures of parts of it, and a group drawn folded into one box.
- **One catalog of systems** shared by many diagrams.
- **Brand fonts.**

## Not planned

- **A board where people edit the diagram,** with drags that become operations. Agents draw good enough diagrams with grafical, and a person asks for a change in words (PHILOSOPHY.md, "Who draws?"). Dropped by the owner on 2026-10-14.
- **Placement by coordinates, for anyone.** Coordinates are the dirty work models fail at, and a free position would break the promise that a change moves only what it names (PHILOSOPHY.md, "What may the agent set?").
- **A score of how readable a picture is.** Readers differ (PHILOSOPHY.md, "What makes grafical good?").
- **A declared diagram type that checks its conventions.** grafical would be judging content (DESIGN.md, "Records over prose").
- **Real-time collaboration, accounts or a hosted service.** The diagram is a file in git, and git already shares it and keeps its history (DESIGN.md, "Git as the history").
- **The same facts always giving the same picture,** whatever order they arrived in. The file fixes the picture, and the same facts give mostly the same picture (DESIGN.md, "Same file exact, same facts mostly").
- **Tidying, a row reordered by the engine.** The engine does not choose an order for the agent. The agent compares orders with `grafical try` (DESIGN.md, "The agent states every order"). Dropped by the owner on 2026-10-15.
- **`grafical guide`.** The help replaced it (DESIGN.md, "The help as the reference").
- **Docking to an edge, and placement such as "beside" or "between".** Columns and steps cover them, and a second way to say one thing is one more choice.
- **Gaps between sections.** Spacing is the engine's.
- **Zones and section titles.** Walls and groups cover them.
- **Ports, end labels and tags.** They are choices with little gain for architecture diagrams, and a sublabel holds a port.
- **Patterns, one operation for a common structure.** Shorthand for content: the help's examples teach the structures. Dropped on 2026-10-13, and open again under "More combinations of operations" in *Later*.
