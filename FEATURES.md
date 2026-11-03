# Features

What grafical does, from the side of the agent that draws and the person who asks. Why each one works the way it does is in [DESIGNS.md](DESIGNS.md) and in the decisions in [specs/decisions](specs/decisions/README.md). `grafical --help` and each command's `--help` hold the full syntax.

✅ built · 🚧 built, with a gap named · ⬜ planned

## Summary

```
Features
├── ✅ F1: Drawing in steps — every change is one named, checked operation
│   ├── ✅ F1.1: Operations — one named command per change
│   ├── ✅ F1.2: Batches — many operations, all or nothing
│   ├── ✅ F1.3: Trying a change — see counts before writing
│   ├── ✅ F1.4: IDs — the caller names every element
│   └── ✅ F1.5: Refusals — a wrong operation is refused with facts
├── 🚧 F2: Boxes — what a box is, says and carries
│   ├── ✅ F2.1: Kinds and shapes — a box's kind sets its shape
│   ├── ✅ F2.2: Labels and sublabels — a label and a quieter sublabel
│   ├── ✅ F2.3: Sizes — sized to the text, or by a step
│   ├── 🚧 F2.4: Marks — up to five small marks on a box
│   ├── ⬜ F2.5: Marks by name — a mark from one bundled icon set
│   ├── ✅ F2.6: Emphasis — at most two boxes stand out
│   └── ✅ F2.7: Merging and swapping — merge, swap and remove boxes
├── ✅ F3: Lines — what a line means and how it is drawn
│   ├── ✅ F3.1: Kinds — a line's kind sets its style
│   ├── ✅ F3.2: Arrowheads at both ends — two-way lines
│   ├── ✅ F3.3: Weight — thicker lines for what matters more
│   ├── ✅ F3.4: Numbered steps — a number on a line
│   ├── ✅ F3.5: Ends at a group, a row or a lane — one arrow to a whole system
│   └── ✅ F3.6: How lines are drawn — grafical routes every line
├── ✅ F4: Placing — where a box sits, stated as a fact
│   ├── ✅ F4.1: Rows and order — a box's row and its place in it
│   ├── ✅ F4.2: Alignment — one box above or below another
│   ├── ✅ F4.3: Columns — a second placement fact beside rows
│   └── ✅ F4.4: Steps from another box — a box some cells from another
├── 🚧 F5: Grouping — systems, lanes, walls and notes around boxes
│   ├── ✅ F5.1: Groups — a system drawn as one frame
│   ├── ✅ F5.2: Copying a group — a second zone in one operation
│   ├── ⬜ F5.3: Deeper nesting — up to five levels
│   ├── ✅ F5.4: Swimlanes — bands that say who owns what
│   ├── ✅ F5.5: Walls — space that lines cross only where allowed
│   └── ✅ F5.6: Notes — a short text on a box, a line or a group
├── ✅ F6: The whole picture — title, legend, spacing and look
│   ├── ✅ F6.1: Title, subtitle and footnote — the words around the picture
│   ├── ✅ F6.2: Legend — a key for styles, widths and marks
│   ├── ✅ F6.3: Spacing — compact, normal or airy
│   └── ✅ F6.4: Themes and stylesheets — the whole look from one name
├── ✅ F7: Seeing the result — what the agent and the owner see
│   ├── ✅ F7.1: Show — the diagram as facts
│   ├── ✅ F7.2: Counts — facts about how the picture is drawn
│   ├── ✅ F7.3: Warnings — what the picture draws poorly
│   ├── ✅ F7.4: Check — defects, warnings and counts on demand
│   ├── ✅ F7.5: Render — SVG and PNG, the same everywhere
│   ├── ✅ F7.6: Live viewer — a window that redraws as the agent draws
│   ├── ✅ F7.7: Diff — a change as operations
│   ├── ✅ F7.8: Help — the agent's whole reference
│   └── ✅ F7.9: Guides — how common diagrams are usually drawn
└── ✅ F8: Files — the diagram and stylesheet files
    ├── ✅ F8.1: The diagram file — one YAML file of facts
    └── ✅ F8.2: The stylesheet file — colors, widths and type sizes
```

## F1: Drawing in steps

**Status:** ✅

### F1.1: Operations

**Status:** ✅

Every change to a diagram is one named operation, run as a command. The diagram file is `<name>.grafical.yaml` by convention.

```sh
grafical new arch.grafical.yaml --title "Order flow"
grafical node add arch.grafical.yaml api --layer app --label "Order API" --kind service
```

- On the command line an operation is `grafical <noun> <verb> <file> …`.
  - Every other value is a flag, such as `--label`.
- `grafical new` takes the title, and optionally `--subtitle`, `--note`, `--density`, `--sizing` and `--style`.
- Every write reports the IDs it changed, then one block for each problem.
  - A block says what the write is refused for, or what the picture draws poorly (see "Refusals" and "Warnings").
  - A refused write changes nothing.
- Every command takes `--json`, which prints the same report as JSON.
- Exit codes:
  - 0 for success.
  - 1 for a refused operation or a defect.
  - 2 for a usage error.
- The parser refuses an unknown option, a missing argument and an unknown command.
  - Its refusals print `failed changed=-` and a block on standard error, such as `error: unknown-option` with `found: --bogus`.

- **Stance:** [What does a change do?](PHILOSOPHY.md#what-does-a-change-do)
- **Design:** [1. Operations are the only way a diagram changes](DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **How it works:** [The command line](specs/ARCHITECTURE.md#the-command-line), [The model](specs/model.md)
- **Why:** [001. Operations over whole-file rewrites](specs/decisions/001-operations-over-whole-file-rewrites.md)

**Stories:**

- An agent changes a diagram with one named command, to move only what it named.

### F1.2: Batches

**Status:** ✅

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

grafical checks each operation in order, and writes only when every one is valid and the picture has no defect the agent must fix. Otherwise nothing changes, and each problem's source names the batch line that caused it.

- **Design:** [1. Operations are the only way a diagram changes](DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **How it works:** [How grafical answers](specs/answers.md)
- **Why:** [001. Operations over whole-file rewrites](specs/decisions/001-operations-over-whole-file-rewrites.md)

**Stories:**

- An agent sends many operations in one call, to save round trips and never leave a half-made change.

### F1.3: Trying a change

**Status:** ✅

See what a batch would do before making it.

```sh
grafical try arch.grafical.yaml batch.yaml
```

`try` applies the batch without writing it, and prints the drawing's counts before and after it, and a `delta` record of the change in each. The agent decides what to try, and grafical measures.

`try` takes several batches, to compare arrangements in one call. It prints one `before` record, then for each batch `ok`, `after` and `delta` records that carry `batch=<file>`; a batch that would be refused prints `failed batch=<file> changed=-` and its blocks, the others are still tried, and the exit code is 1. With `--json`: `{ok, before, batches: [{batch, ok, changed, after, delta}]}`. A single batch prints as before, without the key.

- **Design:** [3. The engine never chooses for the agent](DESIGNS.md#3-the-engine-never-chooses-for-the-agent), [8. Answers are data a script can read](DESIGNS.md#8-answers-are-data-a-script-can-read)
- **How it works:** [How grafical answers](specs/answers.md)
- **Why:** [033. The agent states every order](specs/decisions/033-the-agent-states-every-order.md), [022. Records over prose](specs/decisions/022-records-over-prose.md)

**Stories:**

- An agent compares arrangements with `try`, to pick the one with fewer crossings without writing any.

### F1.4: IDs

**Status:** ✅

The caller names every row, group, lane, column, wall, box and line, and a name never changes while the element exists.

- A rename changes the label, never the ID.
- A line's ID defaults to `<from>-><to>`, with a suffix when the same pair is connected twice.
  - A reversed line keeps its ID.
- A taken ID is refused, with a free one suggested.

- **Design:** [1. Operations are the only way a diagram changes](DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **How it works:** [The model](specs/model.md)
- **Why:** [001. Operations over whole-file rewrites](specs/decisions/001-operations-over-whole-file-rewrites.md)

**Stories:**

- An agent names every element, to refer to it later without it ever changing.

### F1.5: Refusals

**Status:** ✅

A wrong operation is refused at once, and nothing is written. Each problem is a block: what happened, what caused it, the facts, and the commands that can change it, by name (specs/decisions, "Refusals say what happened and which commands can change it").

```text
failed changed=-

error: bad-value
description: A field holds a value that it does not take.
source: batch.yaml line 4: {op: node.add, id: db, layer: row-store, label: DB, kind: database}
detail:
  field: kind
  found: database
  likely: store
  allowed: service, store, queue, external, actor, state, terminal, decision, initial, final
next: -
```

- The kind is one of three:
  - `error`: the operation could not be read or applied.
  - `defect`: the picture would draw wrong.
  - `warning`: the picture is written but drawn poorly.
- The description is one fixed sentence per code, which says what happened and never what to do.
- The source is one of three:
  - The command line as typed.
  - The batch line and the operation as written.
  - `already in the file`, for a problem the file had before the command.
- A warning has no source.
- A defect found after layout names the batch line that caused it, and so does an error of the whole diagram.
  - grafical finds that line by trying ever shorter prefixes of the batch, back towards the file.
  - The line it names is the one after the last prefix without the problem.
- Where that cannot be known, the source is the batch file alone.
  - A prefix refused for another problem cannot tell.
  - A refused write lays out at most 400 boxes and lines across all the prefixes it tries: 3 prefixes of a diagram of 113.
  - So a problem caused early in a long batch has the batch file as its source, as in a draft.
- The detail gives the facts, one per line:
  - `near`: the closest IDs.
  - `likely`: the value it most likely meant.
  - `allowed`, `free`, `count`, `lines`, `min` and `max`.
  - The `node`, `row`, `group`, `edge` or `lane` it concerns.
  - `line` and `column` in the YAML.
- The detail carries what the agent needs to find the change itself, such as the first and last rows a group's box covers.
  - No refusal writes the change for it.
- `next` names the commands that can change it in the order the help lists them, or `-` when none can.
- A YAML syntax error gives the text of its line.

- **Design:** [7. A refusal gives the facts, and the agent writes the fix](DESIGNS.md#7-a-refusal-gives-the-facts-and-the-agent-writes-the-fix)
- **How it works:** [How grafical answers](specs/answers.md)
- **Why:** [047. Refusals say what happened and which commands can change it](specs/decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md), [044. One way to a page, and a wrong command names the right one](specs/decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)

**Stories:**

- An agent that asks for something wrong gets what happened and which commands can change it, to fix it alone.

## F2: Boxes

**Status:** 🚧

### F2.1: Kinds and shapes

**Status:** ✅

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
| `choice` | a small diamond where a line splits into several, with no text. Its label stays in the file and is not drawn; the question goes on the line into it |

```sh
grafical node kind <file> <id> <kind>
```

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [Text and rendering](specs/text-and-rendering.md), [Placement: sizes](specs/placement.md#sizes)
- **Why:** [020. Every layered diagram type](specs/decisions/020-every-layered-diagram-type.md), [052. A choice is a small diamond](specs/decisions/052-a-choice-is-a-small-diamond.md)

**Stories:**

- An agent says what a box is, to get the shape a reader expects.

### F2.2: Labels and sublabels

**Status:** ✅

A box has a label, and optionally a quieter sublabel, such as a port or a topic.

```sh
grafical node rename <file> <id> --label <text>
grafical node describe <file> <id> [--text <text>]
```

- Labels wrap at spaces, hyphens, underscores and slashes.
  - Chinese text also wraps between characters.
- A label that still does not fit its box is refused as `overflow`, with the lines it takes and the most it may.
- A character the bundled fonts cannot draw is refused as `missing-glyph`.
- `describe` without `--text` clears the sublabel.

- **Design:** [9. The same file gives the same picture on any machine](DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)
- **How it works:** [Text and rendering](specs/text-and-rendering.md)
- **Why:** [006. Bundled fonts](specs/decisions/006-bundled-fonts.md), [014. Boxes sized to their text](specs/decisions/014-boxes-sized-to-their-text.md)

**Stories:**

- An agent names a box and adds a port or a topic, to say more without another box.

### F2.3: Sizes

**Status:** ✅

A box is sized to its text, unless the agent gives it a size step.

```sh
grafical node resize <file> <id> [--size s|m|l]
grafical diagram sizing <file> auto|fixed
```

- A box without a size is medium, or large when its text does not fit the medium box.
  - A rename that shortens the label shrinks it again.
- `resize` without `--size` returns the box to that.
- Every box in a row is drawn as tall as the row's tallest, so their tops line up.
  - Dots and diamonds keep their shapes.
- `sizing: fixed` turns this off: a box without a size is always medium, and text that does not fit is refused.

- **Design:** [2. Places are facts, never coordinates](DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: sizes](specs/placement.md#sizes)
- **Why:** [014. Boxes sized to their text](specs/decisions/014-boxes-sized-to-their-text.md)

**Stories:**

- An agent leaves sizes to grafical or picks a step, to keep text inside its box.

### F2.4: Marks

**Status:** 🚧

A box can carry up to five marks, such as `⚠️` on a box that matters, or `P0` on a badge.

```sh
grafical node icon <file> <id> --slot <slot> [--icon <mark>] [--bg <color>] [--fg <color>] [--border <color>] [--shape <shape>] [--size s|m|l]
```

- The slots are `top-left`, `top-right`, `bottom-left`, `bottom-right` and `left`, one mark each.
  - A diamond and a dot have corner slots only.
  - Without `--icon`, the slot is cleared.
- A mark is an emoji, a text of up to 6 characters, or an SVG or PNG file inside the diagram's folder.
- A text mark sits on a badge.
  - `--bg`, `--fg` and `--border` take a color by name (`red`, `amber`, `green`, `blue`, `purple`, `gray`, `dark`) or as `#rrggbb`.
  - `--shape` is `square`, `rounded` (the default) or `pill`.
  - Without `--fg`, grafical picks the light or dark text that reads better.
- `--size` is `s`, `m` or `l` for any mark: 16, 20 or 28 px high.
  - `m` is the default.
- A corner mark sits centred on its corner and moves nothing else.
  - The `left` mark takes a column inside the box, and the text gives up that width.
- A mark file that changes or goes missing fails the load (`mark-file-changed`, `mark-file-not-found`).
  - Setting the slot again accepts the file as it is.
  - An SVG with a script, an event handler or an outside reference is refused as `mark-file-unsafe`.
  - So is a path outside the diagram's folder.
- An emoji with no image is refused as `mark-not-drawn`.
  - A mark that covers text or another box is a defect, `mark-covers`.

Gap: a corner mark is not checked against the lines that leave the box near its corner.

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind), [14. A diagram reads no file outside its folder, and its pictures run nothing](DESIGNS.md#14-a-diagram-reads-no-file-outside-its-folder-and-its-pictures-run-nothing)
- **How it works:** [Text and rendering](specs/text-and-rendering.md)
- **Why:** [025. Marks of any kind](specs/decisions/025-marks-of-any-kind.md)

**Stories:**

- An agent marks a box that matters, to draw the reader's eye to it.

### F2.5: Marks by name

**Status:** ⬜

A mark taken by name from one icon set that grafical bundles, so that an agent need not find a file for every box.

```sh
grafical node icon <file> <id> --slot <slot> --icon <set>:<name>
```

- The set is a permissively licensed one, such as Lucide (ISC) or Tabler (MIT).
  - A cloud vendor's own icons stay files the agent brings.
- An unknown name is refused, with `near` and `likely`.

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind), [15. Every dependency allows use in an MIT project](DESIGNS.md#15-every-dependency-allows-use-in-an-mit-project)
- **How it works:** [Text and rendering](specs/text-and-rendering.md)
- **Why:** [025. Marks of any kind](specs/decisions/025-marks-of-any-kind.md)

**Stories:**

- An agent names an icon, to avoid finding a file for every box.

### F2.6: Emphasis

**Status:** ✅

At most two boxes stand out, as what a reader should see first.

```sh
grafical node emphasize <file> <id> [--off]
```

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [Text and rendering](specs/text-and-rendering.md)

**Stories:**

- An agent picks the one or two boxes to read first, to give the picture a start.

### F2.7: Merging and swapping

**Status:** ✅

```sh
grafical node merge <file> <new-id> --nodes a,b,c --label <text> [--sublabel <text>] [--kind <kind>]
grafical node swap <file> <a> <b>
grafical node remove <file> <id>
```

- `merge` replaces boxes with one new box where the first one was.
  - It keeps each of their lines once and drops the lines between them.
  - It may reuse a merged box's ID.
  - Boxes aligned to a merged box lose the alignment.
- `swap` trades the places of two boxes: their row and slot.
- `remove` takes the box's lines with it and reports their IDs.
  - A box that others are placed by steps from stays while they are (`step-anchor`).

- **Design:** [1. Operations are the only way a diagram changes](DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes), [3. The engine never chooses for the agent](DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
- **How it works:** [The model](specs/model.md)
- **Why:** [013. Curation stays with the agent](specs/decisions/013-curation-stays-with-the-agent.md)

**Stories:**

- An agent merges boxes or swaps two, to change the picture without redrawing it.

## F3: Lines

**Status:** ✅

### F3.1: Kinds

**Status:** ✅

A line's kind says what it means and decides its style.

| Kind | Drawn as | Means |
|---|---|---|
| `call` | solid, with an arrowhead | a call |
| `data` | solid, with an arrowhead | a data read |
| `async` | dashed, with an arrowhead | a message through a queue |
| `optional` | dotted, with an arrowhead | a call that happens only sometimes |
| `link` | plain, with no arrowhead | related, with no direction |

```sh
grafical edge add <file> <from> <to> [--id <id>] [--label <text>] [--kind <kind>] [--both] [--pass]
grafical edge kind <file> <id> <kind>
grafical edge relabel <file> <id> [--label <text>]
grafical edge reverse <file> <id>
grafical edge retarget <file> <id> [--from <end>] [--to <end>]
grafical edge remove <file> <id>
```

- `relabel` without `--label` clears the label.
  - `retarget` moves one or both ends and keeps the line's ID, kind and label.

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [Routing: how lines are drawn](specs/routing.md#how-lines-are-drawn)
- **Why:** [019. Lines meet any side](specs/decisions/019-lines-meet-any-side.md)

**Stories:**

- An agent says what a line means, to get the style a reader expects.

### F3.2: Arrowheads at both ends

**Status:** ✅

```sh
grafical edge both <file> <id> [--off]
```

A `link` takes no arrowheads, so `both` on a link is refused as `both-on-link`.

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [Text and rendering](specs/text-and-rendering.md)

**Stories:**

- An agent marks a line both ways, to show a call that answers.

### F3.3: Weight

**Status:** ✅

Some lines are thicker than others, to say they matter more.

```sh
grafical edge weight <file> <id...> [--weight <level|pixels>]
grafical edge emphasize <file> <id...> [--off]
```

- A weight is a level or a width from 0.5 to 8 px.
  - The levels are `thin`, `thick` and `heavy`.
  - The built-in themes draw the levels 1.25, 2.5 and 4 px wide.
- Without `--weight`, the line is thin again.
- `emphasize` makes a line `thick`, the main path.
- A stylesheet may retune the levels and add more, such as `critical`.
  - A level the stylesheet lacks is refused as `unknown-weight`, with the allowed names.
- The arrowhead grows with the width.

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [Text and rendering](specs/text-and-rendering.md)
- **Why:** [026. Edge weights](specs/decisions/026-edge-weights.md)

**Stories:**

- An agent thickens the main path, to make it the first thing a reader follows.

### F3.4: Numbered steps

**Status:** ✅

A number on a line, so that a reader can follow a request or a process in order.

```sh
grafical edge step <file> <id> [--n <number>]
```

- The agent states each number, a whole number from 1 to 99.
  - grafical draws it as a small ring on the line, under the start of its label.
  - grafical never numbers or renumbers: lines may share a number and numbers may skip.
  - `show` adds `[step <n>]` to the line, and `show --drawn` adds `step=<n>` to its record.
- Without `--n`, the step is cleared.
  - In a batch: `{op: edge.step, id: <line>, n: <number>}`.
- A numbered line keeps its own port as a labelled one does.
  - It never joins a bundle.

- **Design:** [3. The engine never chooses for the agent](DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
- **How it works:** [Text placement: step badges](specs/labels.md#step-badges)
- **Why:** [039. Step badges ride the line](specs/decisions/039-step-badges-ride-the-line.md)

**Stories:**

- An agent numbers the lines of a request, to let a reader follow it in order.

### F3.5: Ends at a group, a row or a lane

**Status:** ✅

One arrow can point at a whole system instead of each of its parts.

- Either end of a line may be a box, a group, a row or a lane.
  - A row a line ends at is drawn as a band with its label above it.
  - A line meets the band straight past its other end where nothing is in the way.
- A row with no box may be an end too, when the other end holds a box: a gateway or a message bus that every request passes.
  - It is drawn as one 40 px bar across the content with its label at the left (specs/decisions, "A row with no box as one bar").
  - Each line meets it straight past its other end.
- A line that passes a bar without ending at it is refused (`bar-crossed`) unless it may: `edge add --pass`, or `edge pass <file> <id> [--off]` for a line already drawn.
  - It then names the bar in `passes`.
  - A row with no box and a look is a bar too, though no line ends at it ("Rows and order").
- An end may not lie inside the other (`edge-inside`).
  - A group or a lane end must hold a box (`empty-container`).
  - An end that shares a row with a group must sit right beside it there (`edge-blocked`).
  - A line between two rows with no box is refused (`bar-to-bar`), and so is a bar between the first and last rows of a group (`bar-in-group`).
- Two lanes are never the two ends of one line (`lane-to-lane`).
- Removing a group or a lane removes the lines that end at it.

- **Design:** [5. The engine routes every line, in plain forms](DESIGNS.md#5-the-engine-routes-every-line-in-plain-forms)
- **How it works:** [Routing: lines that end at a container](specs/routing.md#lines-that-end-at-a-container), [Placement: bands, bars and walls](specs/placement.md#bands-bars-and-walls)
- **Why:** [015. Lines that end at containers](specs/decisions/015-lines-that-end-at-containers.md), [038. A row with no box as one bar](specs/decisions/038-a-row-with-no-box-as-one-bar.md)

**Stories:**

- An agent points a line at a whole system, to avoid one arrow per part.

### F3.6: How lines are drawn

**Status:** ✅

The agent says what connects. grafical draws every line.

- Lines run in horizontal and vertical stretches through the gaps between rows and boxes, never through a box or across text.
- A line may leave or enter a box on any side.
  - Each line has its own place on a side, spread evenly.
- Three or more unlabelled lines of one style that leave one side of a box leave as one line and split near their targets, with a dot at each split.
  - Labelled lines and two-way lines keep their own place.
- Where two lines cross, one hops over the other.
  - Where lines join on purpose, a dot marks the join.
- A label sits beside its line.
  - When there is no room, it wraps or moves to another gap on its way.
  - Where no gap on its way has room, no line moves for it and the write is refused as `label-blocked` (specs/decisions, "The dirty work has edges").
  - The refusal names the line, the lines across the label and the gaps it tried.
  - `node resize` is among the commands that can change it.
  - grafical never widens a box for its lines.
  - A step's number is refused the same way.
- A stylesheet may draw the corners curved, with `paint.edge.shape: curved`.
  - The routes stay the same.

- **Design:** [5. The engine routes every line, in plain forms](DESIGNS.md#5-the-engine-routes-every-line-in-plain-forms)
- **How it works:** [Routing](specs/routing.md#the-steps), [Text placement: line labels](specs/labels.md#line-labels)
- **Why:**
  - [005. Our own gap router](specs/decisions/005-our-own-gap-router.md)
  - [019. Lines meet any side](specs/decisions/019-lines-meet-any-side.md)
  - [023. Fan-outs of three bundle](specs/decisions/023-fan-outs-of-three-bundle.md)
  - [041. The dirty work has edges](specs/decisions/041-the-dirty-work-has-edges.md)
  - [051. A label sits on its straight vertical line](specs/decisions/051-a-label-sits-on-its-straight-vertical-line.md)

**Stories:**

- An agent states what connects, to get lines that avoid boxes and text without drawing any.

## F4: Placing

**Status:** ✅

### F4.1: Rows and order

**Status:** ✅

A box sits in a row, in an order. A row only places, and is not drawn unless it has a look or a line ends at it.

```sh
grafical layer add <file> <id> [--label <text>] [--before <row> | --after <row>]
grafical layer rename <file> <id> --label <text>
grafical layer look <file> <id> [box|band]
grafical layer move <file> <id> --first | --last | --before <row> | --after <row>
grafical layer remove <file> <id>
grafical layer split <file> <id> <new-id> --label <text> [--from <node>]
grafical node add <file> <id> --layer <row> --label <text> [--kind <kind>] [--sublabel <text>] [--size s|m|l] [--first | --last | --before <node> | --after <node>] [--align <node>] [--accent]
grafical node move <file> <id> [--layer <row>] [--first | --last | --before <node> | --after <node>]
```

- A new row goes to the bottom unless `--before` or `--after` places it.
- A box added to a row or moved into another row says where it goes: `--first`, `--last`, `--before` or `--after`.
  - Without one it is refused as `missing-field`, with the row and the boxes in it.
  - Only the first box of an empty row needs none (specs/decisions, "The agent states every order").
- A row's label is optional.
  - It is drawn only with the row: in a band's head, or in a bar.
  - A drawn row with no label draws no name.
  - A band without one has no head (specs/decisions, "A row's label is optional").
- `layer split` moves the second half of a row into a new row below it.
  - With `--from <node>` it moves the boxes from that box on.
- A row can be removed only when it is empty, and the lines that end at it go with it.
- `layer look` draws a row and its label even when no line ends at it.
  - `box` draws it with a box's paint and a dark label.
  - `band` draws it with the band's light fill and grey label.
  - Without a look, a row is drawn only when a line ends at it.
  - Then a row with no box is drawn as a box and a row with boxes as a band.
  - A row with no box and a look is a bar and is checked as one (specs/decisions, "A row with a look is drawn").
  - A line that passes it needs `--pass` (`bar-crossed`).
  - It may not lie between the first and last rows of a group (`bar-in-group`).
  - Taking the look away with `layer look` clears `bar-in-group`.

- **Stance:** [What may the agent set?](PHILOSOPHY.md#what-may-the-agent-set)
- **Design:** [2. Places are facts, never coordinates](DESIGNS.md#2-places-are-facts-never-coordinates), [3. The engine never chooses for the agent](DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
- **How it works:** [The model](specs/model.md), [Placement: the column grid](specs/placement.md#the-column-grid)
- **Why:**
  - [003. Rows unseen, groups as systems](specs/decisions/003-rows-unseen-groups-as-systems.md)
  - [033. The agent states every order](specs/decisions/033-the-agent-states-every-order.md)
  - [045. A row with a look is drawn](specs/decisions/045-a-row-with-a-look-is-drawn.md)
  - [046. A row's label is optional](specs/decisions/046-a-row-s-label-is-optional.md)

**Stories:**

- An agent states each box's row and order, to decide the story's layout in facts.

### F4.2: Alignment

**Status:** ✅

```sh
grafical node align <file> <id> [--to <node>]
```

A box sits directly above or below a box in another row, and its row slides sideways as one block to put it there. An alignment that cannot hold with the order of either row is refused, as `alignment-conflict` or `alignment-cycle`. Without `--to`, the alignment is cleared.

- **Design:** [2. Places are facts, never coordinates](DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: alignment](specs/placement.md#alignment)
- **Why:** [002. Facts over coordinates](specs/decisions/002-facts-over-coordinates.md)

**Stories:**

- An agent aligns two boxes in different rows, to give a line between them a straight run.

### F4.3: Columns

**Status:** ✅

A second placement fact beside rows. Nothing is drawn: a column is a guide.

```sh
grafical column add <file> <id> [--nodes a,b] [--before <column> | --after <column>]
grafical column join <file> <column> <member...>
grafical column leave <file> <member...>
grafical column remove <file> <id>
```

- Every box of a column sits left of every box of the next column in all rows.
  - At least a row's gap lies between them.
  - Columns go left to right in the order they were added, unless placed `--before` or `--after` another.
- A group as a member brings its boxes.
  - A box in no column keeps its place beside the box left of it.
- An order that another fact contradicts is refused as `column-order`, naming two boxes whose order cannot hold.
- A diagram has columns or lanes that run as columns, not both (`column-lanes`).
- Removing a column leaves its boxes where they are.

- **Design:** [2. Places are facts, never coordinates](DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: columns](specs/placement.md#columns)
- **Why:** [027. Columns beside rows](specs/decisions/027-columns-beside-rows.md), [035. Columns hold across rows](specs/decisions/035-columns-hold-across-rows.md)

**Stories:**

- An agent sets columns, to keep boxes of different rows in one left-to-right order.

### F4.4: Steps from another box

**Status:** ✅

A box in no row, placed some cells of the grid from another box.

```sh
grafical node add <file> <id> --from <node> [--down <n> | --up <n>] [--left <n> | --right <n>] --label <text> [--kind <kind>]
grafical node move <file> <id> [--from <node>] [--down <n> | --up <n>] [--left <n> | --right <n>]
```

- Each step is a whole number from 1 to 10, and at least one is given.
  - A step is one cell of the grid: a row down or up, a column left or right.
- The box moves with the box it steps from, which may itself be placed by steps.
- Past the first or last row, the box lands in a row grafical adds.
  - `show --drawn` names that row `-`.
  - The boxes of a row it lands in stand aside.
- A cell another fact keeps is refused as `step-blocked`, a box that steps from itself as `step-cycle`.
  - Steps are not combined with a row, a position, an alignment, a column or a lane (`conflicting-position`).
- `node move --layer` puts the box back in a row.
  - `node move` with steps and no `--from` keeps the box it steps from, and with `--from` alone keeps the steps.
- A box placed by steps wholly beside every box it connects to is refused as `box-aside`.
  - The refusal names those boxes.

- **Design:** [2. Places are facts, never coordinates](DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: steps from another box](specs/placement.md#steps-from-another-box)
- **Why:** [031. Steps from another box](specs/decisions/031-steps-from-another-box.md), [032. Who chose is punished](specs/decisions/032-who-chose-is-punished.md)

**Stories:**

- An agent places a box some steps from another, to draw a staircase or a side path.

## F5: Grouping

**Status:** 🚧

### F5.1: Groups

**Status:** ✅

A group is a system, drawn as one box around its members, which may sit in several rows.

```sh
grafical group add <file> <id> --label <text> [--sublabel <text>] [--nodes a,b,c] [--in <group>]
grafical group join <file> <group> <node or group...>
grafical group leave <file> <node or group...> [--up]
grafical group rename <file> <id> --label <text>
grafical group describe <file> <id> [--text <text>]
grafical group title <file> <id> [top-left|top|top-right|left|right|bottom-left|bottom|bottom-right|outside-top|outside-bottom|outside-left|outside-right]
grafical group order <file> <id> --before <group> | --after <group>
grafical group remove <file> <id> [--out]
```

- A group's box spans every row from its top member to its bottom one.
  - The other boxes of those rows sit beside it, and nothing else lies inside it.
- Groups nest, up to three levels (`group-too-deep`).
  - A group inside itself is refused as `group-cycle`.
- `join` moves a box out of its previous group, and also moves a whole group into another.
  - `leave` takes members out of every group, or with `--up` one level out.
- `group title` (or `group label`) says where the group's label sits.
  - It takes one of these places:
    - In its head: at the left, the middle or the right.
    - In a foot below its last row: at the left, the middle or the right.
      - A foot takes the head's room, and the head keeps only its padding.
    - Just outside its top or bottom side, centred.
    - Beside its rows at the middle height, inside or outside its left or right side.
  - It sits exactly there and takes only its own room: no box and no line moves for it.
  - A line that comes near it refuses the write as `title-blocked`, naming the lines and the places where none would.
  - Without a place the engine seats the label at the leftmost spot of the head that no line comes near.
  - Where a line comes near every spot, the write is refused as `title-blocked` too (specs/decisions, "The agent states where a group's label sits").
  - All twelve places the owner chose are built.
- `group order` puts a group's boxes before or after another group's as one block in every row the two share.
  - The boxes of its inner groups move with it.
  - A group ordered beside itself or beside a group around or inside it is refused as `bad-reference`.
- `remove` keeps the members: they move into the group around it, or with `--out` out of every group.
  - Lines that end at the group go with it.
- A box inside a box takes the canvas's fill, so the fills alternate by depth.
  - A stylesheet may set `paint.nesting: shade` instead.

- **Design:** [2. Places are facts, never coordinates](DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: groups](specs/placement.md#groups), [Text placement: group titles](specs/labels.md#group-titles)
- **Why:** [003. Rows unseen, groups as systems](specs/decisions/003-rows-unseen-groups-as-systems.md), [040. The agent states where a group's label sits](specs/decisions/040-the-agent-states-where-a-group-s-label-sits.md)

**Stories:**

- An agent groups boxes into a system, to show which parts belong together.

### F5.2: Copying a group

**Status:** ✅

A second zone, region or shard in one operation.

```sh
grafical group copy <file> <id> <into> --label <text> --suffix <suffix> --before <group> | --after <group> [--outside]
```

- The copy holds the group's inner groups, its boxes and the lines between them.
  - It sits in the group the original sits in.
  - Every id it makes ends in the suffix except `<into>`.
  - A line id `<from>-><to>` follows its copied ends.
- `--outside` also copies the lines between the group and everything outside it, their inside end moved to the copy.
- Each copied box sits in its original's row.
  - It keeps its original's label, kind, size, marks, lane and column.
  - `--before` or `--after` puts the copy before or after a group in every row of the copy as `group order` does (specs/decisions, "The agent states every order").
  - A group with no box in one of those rows is refused as `no-shared-layer`.
- An alignment or steps to a box outside the group are refused as `copy-conflict` (specs/decisions, "A group copy holds its inside").
  - So is a lane or a column that would move the copy from its place.
  - The refusal names the box.
  - Notes and walls are not copied.

- **Design:** [1. Operations are the only way a diagram changes](DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **How it works:** [The model](specs/model.md)
- **Why:** [037. A group copy holds its inside](specs/decisions/037-a-group-copy-holds-its-inside.md)

**Stories:**

- An agent copies a group with its lines, to draw a second region or shard in one step.

### F5.3: Deeper nesting

**Status:** ⬜

Groups nest up to five levels instead of three, as a cloud's account, region, network, zone and subnet do. The fuzz test must hold at five levels first.

- **Design:** [2. Places are facts, never coordinates](DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: groups](specs/placement.md#groups)
- **Why:** [003. Rows unseen, groups as systems](specs/decisions/003-rows-unseen-groups-as-systems.md)

**Stories:**

- An agent nests groups five deep, to draw a cloud's account, region, network, zone and subnet.

### F5.4: Swimlanes

**Status:** ✅

A swimlane is a labelled band that says who owns what. A diagram's lanes all run one way, as rows or as columns.

```sh
grafical lane add <file> <id> --label <text> [--members a,b]
grafical lane join <file> <lane> <member...>
grafical lane leave <file> <member...>
grafical lane rename <file> <id> --label <text>
grafical lane remove <file> <id>
```

- Rows as members make lanes that run as rows, with the label on the left.
  - Boxes as members make lanes that run as columns, with the label on top.
  - A group stands for its rows or boxes.
  - Both in one diagram is refused as `lane-mixed`.
- A row lane's rows must be neighbours (`lane-gap`), and a row added between two rows of a lane joins it.
- Column lanes go left to right in creation order, and every row keeps that order.
  - A box outside every lane sits right of the lanes, or left of them when it comes first in its row.
- A group lies inside one lane (`group-across-lanes`).
- `lane remove` keeps the members and removes the lines that end at the lane.

- **Design:** [2. Places are facts, never coordinates](DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: lanes](specs/placement.md#lanes), [Text placement: lane labels](specs/labels.md#bands-bars-and-lanes)
- **Why:** [018. Swimlanes run one way](specs/decisions/018-swimlanes-run-one-way.md)

**Stories:**

- An agent sets lanes, to show who owns which step.

### F5.5: Walls

**Status:** ✅

Empty space between two parts of a picture, which lines cross only where the wall allows.

```sh
grafical wall add <file> <id> --between a,b --and c,d [--allow e,f] [--label <text>]
grafical wall allow <file> <id> <allow...> [--off]
grafical wall relabel <file> <id> [--label <text>]
grafical wall remove <file> <id>
```

- Each side is a list of boxes and groups.
  - When one side lies above the other, the wall runs across.
  - When they sit side by side in their rows, it runs up and down.
  - Otherwise it is refused as `wall-sides`, and so is a box on both sides.
- A wall is only as long as its two sides need.
- A line from one side to the other is refused as `wall-crossed`.
  - `allow` lets it cross by naming the line or a box or group at one of its ends, such as a gateway.
  - Any other line drawn through the wall is a defect with the same code.
- Without a label, a wall is invisible: only its space shows.
  - With a label, it draws a dashed divider through its middle.
  - The label sits along it at the first place no line comes near.
  - Where none is, the write is refused as `label-blocked` (specs/decisions, "The dirty work has edges").
  - `wall relabel` changes the label, or drops it without `--label`.
- A box or group that is removed leaves the wall's sides, and a wall left with an empty side goes.

- **Design:** [2. Places are facts, never coordinates](DESIGNS.md#2-places-are-facts-never-coordinates), [5. The engine routes every line, in plain forms](DESIGNS.md#5-the-engine-routes-every-line-in-plain-forms)
- **How it works:** [Placement: walls](specs/placement.md#bands-bars-and-walls), [Routing: walls](specs/routing.md#walls), [Text placement: wall labels](specs/labels.md#wall-labels)
- **Why:** [029. Walls as space](specs/decisions/029-walls-as-space.md)

**Stories:**

- An agent sets a wall between two parts, to keep them apart and let only named lines cross.

### F5.6: Notes

**Status:** ✅

A short text attached to a box, a line or a group, to keep detail out of extra boxes.

```sh
grafical note add <file> --on <id> --text <text> [--footnote]
grafical note remove <file> --on <id>
```

- A note is a card beside its target, joined by a dotted line.
  - With `--footnote` it is a small number on the target, with the text in a numbered list at the bottom.
  - The file holds a footnote as `footnote: true`.
  - A card with no place beside its target clear of every box, line and text is refused as `label-blocked` (specs/decisions, "The dirty work has edges").
  - The agent then shortens it or makes it a footnote.
- A target has one note, and adding another replaces it.
  - A note goes with its target.
- A note that takes more than four lines is an `overflow`.

- **Design:** [5. The engine routes every line, in plain forms](DESIGNS.md#5-the-engine-routes-every-line-in-plain-forms)
- **How it works:** [Text placement: notes](specs/labels.md#notes)
- **Why:** [030. Notes as callouts or footnotes](specs/decisions/030-notes-as-callouts-or-footnotes.md)

**Stories:**

- An agent attaches a note, to keep detail out of extra boxes.

## F6: The whole picture

**Status:** ✅

### F6.1: Title, subtitle and footnote

**Status:** ✅

```sh
grafical diagram title <file> --text <text>
grafical diagram subtitle <file> [--text <text>]
grafical diagram note <file> [--text <text>]
```

The subtitle is one sentence under the title. The footnote says what the diagram leaves out, such as "Not shown: Redis name cache". Without `--text`, either one is cleared.

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [Text and rendering](specs/text-and-rendering.md)

**Stories:**

- An agent sets the title and says what the picture leaves out, to tell a reader what they see.

### F6.2: Legend

**Status:** ✅

A key in the top right that says, in the agent's words, what the picture's styles, widths and marks mean.

```sh
grafical diagram legend <file> solid|dashed|dotted|plain|--weight <weight>|--mark <mark> [--text <text>]
```

- A line style, a line width other than `thin`, or a mark has an entry only when the diagram names it.
  - A diagram that names nothing draws no legend.
- Without `--text`, the words are taken away with their entry.
- `show --drawn` prints a `legend` record for each line style and width the picture draws, and for each named mark.
  - `weight` is what `--weight` takes, and `text=-` marks a style or width with no entry.
- Marks with the same name share one entry.
- When the legend is wider than its room, it wraps onto more lines.

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [Text placement: the legend](specs/labels.md#the-legend)
- **Why:** [028. A legend for widths and marks](specs/decisions/028-a-legend-for-widths-and-marks.md), [034. The legend says only what the agent named](specs/decisions/034-the-legend-says-only-what-the-agent-named.md)

**Stories:**

- An agent explains a style or a mark in its own words, to let a reader decode the picture.

### F6.3: Spacing

**Status:** ✅

```sh
grafical diagram density <file> compact|normal|airy
```

- **Design:** [4. A change moves only what it names](DESIGNS.md#4-a-change-moves-only-what-it-names)
- **How it works:** [Placement: rows down the page](specs/placement.md#rows-down-the-page)
- **Why:** [004. Layout computed again on every change](specs/decisions/004-layout-computed-again-on-every-change.md)

**Stories:**

- An agent picks a density, to trade size for air.

### F6.4: Themes and stylesheets

**Status:** ✅

A diagram takes its whole look from a built-in theme or from a stylesheet file it names.

```sh
grafical diagram style <file> [<style>]
```

- The built-in themes are `default`, `dark` (light lines on a dark ground) and `print` (greys with stronger lines).
- A stylesheet `<name>.grafical-style.yaml` starts from a theme and overrides any of its values.
  - Changing it changes every diagram that names it.
- Without a style, the default theme applies.

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [Text and rendering](specs/text-and-rendering.md)
- **Why:** [016. Themes and stylesheets](specs/decisions/016-themes-and-stylesheets.md)

**Stories:**

- An agent picks a theme or a stylesheet, to restyle every diagram that names it.

## F7: Seeing the result

**Status:** ✅

### F7.1: Show

**Status:** ✅

The agent's view of a diagram, in place of reading the YAML.

```sh
grafical show <file> [--drawn]
```

- `show` prints the diagram in the same words as the operations.
  - It lists the rows, the boxes in order, the groups, the lanes, the lines, the walls, the notes and the marks.
- `show --drawn` prints how the picture is drawn, as records with no advice:
  - Each box's row, place, size and lines by side.
  - Each line's sides, bends and length, the shortest it could be, the rows it skips, the lines it crosses and the rows it passes.
  - Each wall's length and the lines through it.
  - One `gutter` record for each pair of neighbouring rows: `gutter above=<row> below=<row> lines=<n> crossings=<n> tight=<n> crowded=<n>`.
    - It counts the lines with a run between the two rows, and the crossings, tight pairs and crowded labels there ("Composition counts").
    - It shows the agent which choice of rows costs.
  - How each note is drawn.
  - The lines bundled together, and the totals.

- **Design:** [12. The command line comes first, and the help is the agent's only reference](DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference), [8. Answers are data a script can read](DESIGNS.md#8-answers-are-data-a-script-can-read)
- **How it works:** [How grafical answers](specs/answers.md)
- **Why:** [021. The help as the reference](specs/decisions/021-the-help-as-the-reference.md), [022. Records over prose](specs/decisions/022-records-over-prose.md)

**Stories:**

- An agent reads the diagram as facts, to see what it drew without reading the YAML.

### F7.2: Counts

**Status:** ✅

After `apply`, `check` and `render`, grafical prints the drawing's counts as one record:

```text
counts nodes=3 lines=2 crossings=0 bends=1 bent=0 length=224 width=368 height=280 fullest=data:2 busiest=api:2 longest=api->cache:176 passing=0 across=0 tight=0 crowded=0
```

They are facts, with no threshold and no advice: what they mean is the agent's to judge.

`bent` counts the lines drawn with more than two bends ("The dirty work has edges"), and `passing` the lines that run through a row they do not connect. Three more say how the picture is composed, each a separate count and never a score ("Composition counts"): `across`, the lines that cross the box of a group holding neither of their ends; `tight`, the pairs of runs of two different lines (not one bus) that run side by side closer than a track, 12 px, for more than 100 px; and `crowded`, the line labels with less than 8 px of room on two or more of their four sides. Each place these five count is also a warning ("Warnings").

- **Stance:** [Who owns what?](PHILOSOPHY.md#who-owns-what)
- **Design:** [8. Answers are data a script can read](DESIGNS.md#8-answers-are-data-a-script-can-read)
- **How it works:** [The checker](specs/checks.md)
- **Why:** [022. Records over prose](specs/decisions/022-records-over-prose.md), [036. Composition counts](specs/decisions/036-composition-counts.md)

**Stories:**

- An agent reads the counts after a write, to know how the picture is drawn.

### F7.3: Warnings

**Status:** ✅

Every write, single commands included, and `check` and `render` print a warning block for each thing the picture draws poorly, before the counts, and never refuse for one (specs/decisions, "Every write prints every warning"). All of them print every time, not only those the command caused, since every change lays the whole diagram out again.

- `bent-line`: a line with more than two bends.
  - Detail: `edge`, `bends`, `skip` (the rows between its ends' rows).
- `passing-row`: a line that passes among the boxes of rows between its ends and meets none of them.
  - Detail: `edge`, `rows`.
- `line-across-group`: a line through the box of a group holding neither of its ends.
  - Detail: `edge`, `groups`.
- `tight-lines`: runs of two lines under 12 px apart for over 100 px.
  - Detail: `edges`, `over` (the pixels they share).
- `crowded-label`: a line's label with under 8 px of room on two sides.
  - Detail: `edge`.
- `lonely-box`: a box no line reaches.
  - It has no line of its own and none to its group, row or lane.
  - Detail: `node`.
- `line-per-member`: every box of a group of two or more has a line to one end outside it, or from it.
  - The lines are alike in kind, label, weight and arrowheads.
  - A group inside one with the same lines is left out.
  - Detail: `group`, `edges` (specs/decisions, "A line from every box of a group is a warning").
- `crossing`: a pair of lines that cross, however often.
  - Detail: `edges`.

A warning has no source: the outcome line names what the write changed, and a warning names the ids it is about (specs/decisions, "Every write prints every warning"):

```text
ok changed=sync->geo

warning: bent-line
description: A line bends more than twice, mostly because it skips rows.
detail:
  edge: sync->geo
  bends: 3
  skip: 1
next: layer move, node move, node swap
```

- **Design:** [6. Every write is checked, and each defect has an owner](DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)
- **How it works:** [The checker](specs/checks.md)
- **Why:** [048. Every write prints every warning](specs/decisions/048-every-write-prints-every-warning.md), [050. A line from every box of a group is a warning](specs/decisions/050-a-line-from-every-box-of-a-group-is-a-warning.md)

**Stories:**

- An agent reads the warnings, to find the line or box its choices made awkward.

### F7.4: Check

**Status:** ✅

```sh
grafical check <file> [--all]
```

`check` reports the defects the agent can fix, every warning, and the counts. `--all` adds the defects only the engine can avoid, which are engine bugs.

- **Design:** [6. Every write is checked, and each defect has an owner](DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)
- **How it works:** [The checker](specs/checks.md)
- **Why:** [008. Defects owned by who can fix them](specs/decisions/008-defects-owned-by-who-can-fix-them.md)

**Stories:**

- An agent runs `check`, to know the file is sound.

### F7.5: Render

**Status:** ✅

```sh
grafical render <file> [--svg [<out>]] [--png [<out>]] [--scale 1-4]
```

- With neither flag, `render` writes `<name>.svg` and `<name>.png` beside the file.
  - One flag writes only that one.
- The SVG carries the title and a description for screen readers.
- The PNG is drawn with no browser, at a scale from 1 to 4.
- The same file gives the same SVG and the same PNG pixels on macOS and Linux.

- **Design:** [9. The same file gives the same picture on any machine](DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)
- **How it works:** [Text and rendering](specs/text-and-rendering.md)
- **Why:** [007. Our own SVG writer](specs/decisions/007-our-own-svg-writer.md), [024. Same file exact, same facts mostly](specs/decisions/024-same-file-exact-same-facts-mostly.md)

**Stories:**

- An agent renders the file, to hand a reader a picture.

### F7.6: Live viewer

**Status:** ✅

A window that shows the diagram as it is now, while an agent draws it.

```sh
grafical view <file> [--port <n>] [--no-open]
```

- The window redraws within a moment of every change to the file from any process.
  - It briefly marks what changed.
- Beside the picture, a list says what each change did as operations.
  - The newest change comes first.
- The window opens at the picture's size and follows it.
  - It serves on 127.0.0.1 only, and only shows: nobody edits on it.
- While the file cannot be read, it keeps the last good picture and shows the errors.
- Ctrl-C stops it.

- **Stance:** [Who draws?](PHILOSOPHY.md#who-draws)
- **Design:** [14. A diagram reads no file outside its folder, and its pictures run nothing](DESIGNS.md#14-a-diagram-reads-no-file-outside-its-folder-and-its-pictures-run-nothing)
- **How it works:** [The command line](specs/ARCHITECTURE.md#the-command-line)
- **Why:** [017. A viewer that only shows](specs/decisions/017-a-viewer-that-only-shows.md)

**Stories:**

- The owner watches a window that redraws, to see the work as it happens.

### F7.7: Diff

**Status:** ✅

```sh
grafical diff <file> [<git-rev>]
```

`diff` reports how the file differs from a git revision, `HEAD` by default, as a batch of operations that `apply` replays on the revision's file. Outside git it fails with `not-in-git`.

- **Design:** [1. Operations are the only way a diagram changes](DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes), [4. A change moves only what it names](DESIGNS.md#4-a-change-moves-only-what-it-names)
- **How it works:** [The model](specs/model.md)
- **Why:** [009. Git as the history](specs/decisions/009-git-as-the-history.md)

**Stories:**

- A reviewer reads how a file differs from a revision, to review a diagram change like code.

### F7.8: Help

**Status:** ✅

How to use grafical: the agent's whole reference for the tool.

```sh
grafical --help
grafical <command> --help
```

`--help` says what grafical is, what it does not draw, how to work, and every way to draw, one line each by the story it tells, such as a box beside a box, one path in order, or two parts kept apart. Each command's help adds its options, its line in a batch, when to use it, what it draws, common mistakes, limits and an example. No page says what a refusal means: the refusal's block says it (specs/decisions, "Refusals say what happened and which commands can change it"). A command's arguments are named as its batch fields. The help does not say how a kind of diagram is drawn: the guides do.

`--help` is the one way to a page: there is no `grafical help <command>`. A command grafical does not have is refused with the word it most likely means, as a value and never as a command line: `grafical help apply` gives `error: unknown-command` with `found: help` and `likely: --help`, and `grafical node.add --help` gives `found: node.add` and `likely: node add`.

- **Stance:** [How does an agent learn grafical?](PHILOSOPHY.md#how-does-an-agent-learn-grafical)
- **Design:** [12. The command line comes first, and the help is the agent's only reference](DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)
- **How it works:** [How grafical answers](specs/answers.md)
- **Why:**
  - [021. The help as the reference](specs/decisions/021-the-help-as-the-reference.md)
  - [042. One entry page, help where it is used](specs/decisions/042-one-entry-page-help-where-it-is-used.md)
  - [044. One way to a page, and a wrong command names the right one](specs/decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)

**Stories:**

- An agent learns grafical from `--help`, to start without being told how.

### F7.9: Guides

**Status:** ✅

How common kinds of diagram are usually drawn: best practice, for an agent that wants it.

```sh
grafical guide
grafical guide <name>
```

`grafical guide` lists the guides by what a diagram is about: architecture, C4, infrastructure (cloud and deployment) and dependency for what exists; data flow and event flow for what moves; flowchart and swimlane for a process; state machine for one thing's states; and composition, for any kind, what makes a diagram good and what to change when a picture looks wrong. `grafical guide <name>` prints one; `cloud`, `deployment`, `process` and `states` find theirs. A name that is no guide is refused as `unknown-guide` with the likely ones. The entry page names `grafical guide` once, and nothing tells an agent to read a guide: grafical refuses only what would draw wrong.

- **Design:** [12. The command line comes first, and the help is the agent's only reference](DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)
- **How it works:** [How grafical answers](specs/answers.md)
- **Why:** [043. Help for the tool, guides for best practice](specs/decisions/043-help-for-the-tool-guides-for-best-practice.md)

**Stories:**

- An agent reads a guide, to draw a kind of diagram the usual way.

## F8: Files

**Status:** ✅

### F8.1: The diagram file

**Status:** ✅

One YAML file, `<name>.grafical.yaml`, holds the whole diagram as facts: its rows and their boxes in order, its groups, lanes, columns, walls, notes and lines. The diagram on the README's front page is one: `docs/images/pipeline.grafical.yaml`.

- grafical writes it in a fixed key order, so the same facts give the same bytes and a change reads as a small diff in git.
- It holds no coordinate.
  - A field that holds its default is left out.
- A file of a newer format or with a field grafical does not know is refused, never half read.

- **Design:** [10. What grafical cannot fully read, it refuses](DESIGNS.md#10-what-grafical-cannot-fully-read-it-refuses), [9. The same file gives the same picture on any machine](DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)
- **How it works:** [The model](specs/model.md), [The file formats](specs/file-formats.md#the-diagram-file)
- **Why:**
  - [001. Operations over whole-file rewrites](specs/decisions/001-operations-over-whole-file-rewrites.md)
  - [009. Git as the history](specs/decisions/009-git-as-the-history.md)
  - [024. Same file exact, same facts mostly](specs/decisions/024-same-file-exact-same-facts-mostly.md)

**Stories:**

- An engineer keeps one YAML file in git, to review and reproduce the picture.

### F8.2: The stylesheet file

**Status:** ✅

A stylesheet, `<name>.grafical-style.yaml`, starts from a built-in theme and overrides any of its colors, line widths, corner radii and type sizes.

- Every value not given comes from the theme it starts from.
- Larger type changes the layout, and text that no longer fits is refused as `overflow`.
- An unknown key, a malformed colour or a weight the fonts lack is refused with the path of the value.
- A missing stylesheet fails every command that reads the diagram with `style-not-found`, and a wrong one with `bad-stylesheet`.

- **Design:** [11. Looks are free, while shape and dash follow the kind](DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind), [10. What grafical cannot fully read, it refuses](DESIGNS.md#10-what-grafical-cannot-fully-read-it-refuses)
- **How it works:** [Text and rendering](specs/text-and-rendering.md), [The file formats](specs/file-formats.md#the-stylesheet)
- **Why:** [016. Themes and stylesheets](specs/decisions/016-themes-and-stylesheets.md)

**Stories:**

- An engineer writes a stylesheet, to set the look of many diagrams at once.

## When something fails

Every failure leaves the file as it was and says what happened, in the block described under F1.5: Refusals.

- **An operation is wrong:** refused with a code, the facts and the commands that can change it (F1.5: Refusals).
  - The ones about names are in F1.4: IDs, and the ones about a whole batch in F1.2: Batches.
- **The picture would draw wrong:** the write is refused as a defect.
  - `overflow` for a label that does not fit (F2.2: Labels and sublabels).
  - `label-blocked` for a label with no place (F3.6: How lines are drawn, F5.5: Walls and F5.6: Notes).
  - `title-blocked` for a group's label (F5.1: Groups).
- **The picture draws poorly:** written, and reported as a warning (F7.3: Warnings).
- **A file cannot be read:** nothing is drawn from it.
  - A YAML syntax error gives its line.
  - A missing stylesheet fails every command that reads the diagram (F8.2: The stylesheet file).
  - A file written by a newer grafical is refused rather than guessed at (F8.1: The diagram file).
- **A command line is wrong:** a usage error prints a block and exits 2, and a command that does not exist is refused with the one it most likely means (F7.8: Help).

## Later

These are wanted, but not scheduled. Each becomes a planned feature once ROADMAP.md gives it a milestone.

- **More combinations of operations.** The owner said on 2026-10-14 that what grafical lacks is more ways to combine its operations.
  - What form that takes is not decided, such as one operation for a common edit ("put a cache between the API and the database") or for a common shape.
- **Flow direction:** rows become columns, so that a diagram reads left to right.
  - Held by the owner on 2026-10-14 because most of the layout assumes rows run across.
  - Nothing yet shows it helps.
- **Lanes both ways in one diagram,** as a grid of lanes and phases.
- **Diagram types with a layout of their own:** sequence diagrams, time scales such as Gantt charts, mind maps and other radial trees, shapes such as pyramids, and overlapping sets.
  - Each is a type the agent gives a diagram, which sets its space and the operations that apply (specs/decisions, "An optional type sets the diagram's space").
  - Entity-relationship and class diagrams may be a type or a kind of box.
- **Importing** Mermaid, draw.io and Excalidraw files.
- **An MCP server** over the same operations.
- **Views:** several pictures of parts of one file.
  - A group may be drawn folded into one box.
- **One catalog of systems** shared by many diagrams.
- **Brand fonts.**

## Not planned

- **A board where people edit the diagram,** with drags that become operations.
  - Agents draw good enough diagrams with grafical, and a person asks for a change in words (PHILOSOPHY.md, "Who draws?").
  - Dropped by the owner on 2026-10-14.
- **Placement by coordinates, for anyone.** Coordinates are the dirty work models fail at.
  - A free position would break the promise that a change moves only what it names (PHILOSOPHY.md, "What may the agent set?").
- **A score of how readable a picture is.** Readers differ (PHILOSOPHY.md, "What makes grafical good?").
- **A declared diagram type that checks its conventions.** grafical would be judging content (specs/decisions, "Records over prose").
  - A type that sets only the diagram's space is in *Later*.
- **Real-time collaboration, accounts or a hosted service.** The diagram is a file in git.
  - Git already shares it and keeps its history (specs/decisions, "Git as the history").
- **The same facts always giving the same picture,** whatever order they arrived in.
  - The file fixes the picture, and the same facts give mostly the same picture (specs/decisions, "Same file exact, same facts mostly").
- **Tidying, a row reordered by the engine.** The engine does not choose an order for the agent.
  - The agent compares orders with `grafical try` (specs/decisions, "The agent states every order").
  - Dropped by the owner on 2026-10-15.
- **`grafical guide`.** The help replaced it (specs/decisions, "The help as the reference").
- **Docking to an edge, and placement such as "beside" or "between".** Columns and steps cover them.
  - A second way to say one thing is one more choice.
- **Gaps between sections.** Spacing is the engine's.
- **Zones and section titles.** Walls and groups cover them.
- **Ports, end labels and tags.** They are choices with little gain for architecture diagrams.
  - A sublabel holds a port.
- **Patterns, one operation for a common structure.** Shorthand for content: the help's examples teach the structures.
  - Dropped on 2026-10-13, and open again under "More combinations of operations" in *Later*.
