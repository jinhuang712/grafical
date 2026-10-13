# Features

What grafical does, as commands and operations, with the status of each. "Command-line syntax" below is what is built. Rows marked `stage 1` are planned, and their syntax is fixed when they are built. Decisions behind these features are in [DESIGN.md](DESIGN.md).

| Status | Meaning |
|---|---|
| `stage 1` | Planned for the MVP |
| `stage 2` | Planned for the board |
| `later` | Wanted, not scheduled |
| `done` | Implemented and tested |

## Commands

| Command | Does | Status |
|---|---|---|
| `grafical new <file> --title <text>` | Create an empty diagram | done |
| `grafical <noun> <verb> <file> …` | Apply one operation, such as `grafical node add` | done |
| `grafical apply <file> <batch.yaml>` | Apply a list of operations, all or nothing | done |
| `grafical try <file> <batch.yaml>` | Apply a batch without writing it, and print the drawing's counts before and after it, and the change in each. The agent decides what to try; grafical measures (D37) | done |
| `grafical show <file> [--drawn]` | Print a compact view of the diagram for agents. `--drawn`: how it is drawn, as `key=value` records: each box's row, place, size, lines by side and their length together; each line's sides, bends, length, the shortest it could be, the rows it skips, crossings and the rows it passes; and totals (D37) | done |
| `grafical check <file> [--all]` | Report the defects the agent can fix. `--all` adds the engine-owned ones, which are engine bugs (D14) | done |
| `grafical render <file> [--svg [<out>]] [--png [<out>]]` | Write SVG and PNG. With neither flag, writes `<name>.svg` and `<name>.png` beside the file; `--svg` or `--png` alone writes only that one, to `<out>` or beside the file. `--scale` sets the PNG scale, from 1 to 4 | done |
| `grafical view <file> [--port <n>] [--no-open]` | Open a window, sized to the diagram, that shows it as it is now, redrawn within a moment of every change, with the changed parts marked, a list of each change as operations, and the problems. Ctrl-C stops it (D31) | done |
| `grafical diff <file> [<git-rev>]` | Report how the file on disk differs from a git revision, `HEAD` by default, as a batch of operations that `apply` replays on the revision's file (D18) | done |
| `grafical --help`, `grafical <command> --help` | The reference for agents: how to work, what makes a diagram good, the diagram types, and for each command its options, guidelines, common mistakes, limits and an example (D36) | done |
| `grafical guide [<type>]` | Print the reference, or how to draw one diagram type (D34) | dropped: the help replaced it (D36) |
| `grafical review <file>` | Open the board on the diagram | stage 2 |
| `grafical mcp` | Serve the same operations over MCP | later |

Every write command reports the IDs it changed, any operation errors and any defects. `--json` prints the same report as JSON. `apply`, `check` and `render` also print the drawing's counts as one `key=value` record: nodes, lines, crossings, bends, the lines' length together, width, height, the row with most nodes, the box with most lines, the longest line, and the lines that pass a row they do not connect (D37). They are facts; what they mean is the agent's to judge.

## Operations

On the command line an operation is `<noun> <verb> <file> <id>`, and every other value is a flag, such as `--label`. In a batch file it is `op: <noun>.<verb>`, with the same field names.

### Diagram

| Operation | Does | Status |
|---|---|---|
| `diagram.title` | Set the title | done |
| `diagram.density` | Set spacing: `compact`, `normal` or `airy` | done |
| `diagram.sizing` | Set how a node with no size is sized: `auto`, to its text (the default), or `fixed`, always medium (D27) | done |
| `diagram.subtitle` | Set or clear one sentence under the title (D26) | done |
| `diagram.note` | Set or clear the footnote, such as "Not shown: …" (D26) | done |
| `diagram.style` | Take the look from a built-in theme (`default`, `dark`, `print`) or a stylesheet file beside the diagram; without one, the default theme (D30) | done |
| `diagram.legend` | Name a line style in the legend, such as "Kafka message" for dashed lines, or go back to the default wording | done |
| `diagram.tidy` | Reorder every layer's nodes once, together, to reduce crossings (D24) | done |

### Layers

| Operation | Does | Status |
|---|---|---|
| `layer.add` | Add a layer: at the top, at the bottom, or before or after another layer | done |
| `layer.rename` | Change a layer's label | done |
| `layer.move` | Change a layer's position | done |
| `layer.tidy` | Reorder a layer's nodes to reduce edge crossings, once (D24) | done |
| `layer.remove` | Remove an empty layer, and the edges that end at it | done |
| `layer.split` | Move the second half of a layer, or its nodes from one node on, into a new layer below it (D29) | done |

### Groups

| Operation | Does | Status |
|---|---|---|
| `group.add` | Draw a system box around nodes, which may sit in several rows (D7) | done |
| `group.add --in` | Put the new group inside another group, up to three levels (D34) | done |
| `group.join`, `group.leave` | Add a node to a group, or take it out. Either also moves a whole group into another or out (D34). `leave` takes members out of every group, or with `--up` one level out | done |
| `group.rename` | Change a group's label | done |
| `group.remove` | Remove the box and keep its nodes. Its nodes and inner groups move into the group around it, or with `--out` out of every group (D34). Edges that end at the group go with it | done |
| `group.describe` | Set or clear a second, quieter part of the group's label, such as "write side" | done |
| `group.order` | Put a group's members before or after another group's, in every layer the two share | done |

### Lanes

| Operation | Does | Status |
|---|---|---|
| `lane.add` | Add a swimlane that names who owns what, optionally with members: layers (the lanes run as rows), nodes (as columns) or groups, which bring their layers or nodes (D32) | done |
| `lane.join`, `lane.leave` | Put layers, nodes or groups into a lane, or take them out | done |
| `lane.rename` | Change a lane's label | done |
| `lane.remove` | Remove the lane and keep its members. Edges that end at the lane go with it | done |

### Nodes

| Operation | Does | Status |
|---|---|---|
| `node.add` | Add a node with an ID, a label, a kind and a layer, placed first, last, or before or after another node. Without a position, grafical picks the slot with the fewest crossings (D24) | done |
| `node.rename` | Change the label. The ID stays. A node grafical sizes grows or shrinks with its label (D27). A label that still does not fit fails with a suggested fix | done |
| `node.describe` | Set or clear the sublabel, such as a port or a topic name | done |
| `node.kind` | Change the kind | done |
| `node.move` | Move to another layer, group or position | done |
| `node.resize` | Set the size step, which fixes the box's width and height. Without a step, grafical sizes the box to its text again (D27) | done |
| `node.align` | Place the node directly above or below a node in another layer. Fails if the alignment cannot hold with the order of either layer | done |
| `node.emphasize` | Turn the accent on or off | done |
| `node.remove` | Remove the node and its edges | done |
| `node.swap` | Two nodes trade places: layer and slot | done |
| `node.merge` | Replace nodes with one new node that keeps all their edges, each once. Edges between them go | done |

### Edges

| Operation | Does | Status |
|---|---|---|
| `edge.add` | Connect two ends, with an optional label and kind. An end is a node, a group, a layer or a lane (D28, D32) | done |
| `edge.relabel` | Change or clear the label | done |
| `edge.kind` | Change the kind | done |
| `edge.reverse` | Swap the direction. The ID stays | done |
| `edge.remove` | Remove the edge | done |
| `edge.retarget` | Move one or both ends of an edge. Its ID, kind and label stay | done |
| `edge.both` | Draw arrowheads at both ends, or one end again. A link takes none (`both-on-link`) (D33) | done |
| `edge.emphasize` | Draw edges thick, as the main path, or thin again. The legend names it "main path" (D33) | done |

## Command-line syntax

This is the syntax built so far. `<file>` is a diagram file, named `<name>.grafical.yaml` by convention.

```sh
grafical new <file> --title <text> [--subtitle <text>] [--note <text>] [--density compact|normal|airy]
    [--sizing auto|fixed] [--style <style>]
grafical layer add <file> <id> --label <text> [--before <layer> | --after <layer>]
grafical layer rename <file> <id> --label <text>
grafical layer move <file> <id> --first | --last | --before <layer> | --after <layer>
grafical layer remove <file> <id>
grafical layer tidy <file> <id>
grafical layer split <file> <id> <new-id> --label <text> [--from <node>]
grafical node add <file> <id> --layer <layer> --label <text> [--kind <kind>] [--sublabel <text>]
    [--size s|m|l] [--first | --last | --before <node> | --after <node>] [--align <node>] [--accent]
grafical node rename <file> <id> --label <text>
grafical node resize <file> <id> [--size s|m|l]
grafical node move <file> <id> [--layer <layer>] [--first | --last | --before <node> | --after <node>]
grafical node remove <file> <id>
grafical node describe <file> <id> [--text <text>]
grafical node kind <file> <id> <kind>
grafical node emphasize <file> <id> [--off]
grafical node align <file> <id> [--to <node>]
grafical node swap <file> <a> <b>
grafical node merge <file> <new-id> --nodes a,b,c --label <text> [--sublabel <text>] [--kind <kind>]
grafical edge add <file> <from> <to> [--id <id>] [--label <text>] [--kind <kind>] [--both]
grafical edge remove <file> <id>
grafical edge relabel <file> <id> [--label <text>]
grafical edge kind <file> <id> <kind>
grafical edge reverse <file> <id>
grafical edge both <file> <id> [--off]
grafical edge emphasize <file> <id...> [--off]
grafical edge retarget <file> <id> [--from <end>] [--to <end>]
grafical group add <file> <id> --label <text> [--sublabel <text>] [--nodes a,b,c] [--in <group>]
grafical group join <file> <group> <node or group...>
grafical group leave <file> <node or group...> [--up]
grafical group rename <file> <id> --label <text>
grafical group remove <file> <id> [--out]
grafical group describe <file> <id> [--text <text>]
grafical group order <file> <id> --before <group> | --after <group>
grafical lane add <file> <id> --label <text> [--members a,b]
grafical lane join <file> <lane> <member...>
grafical lane leave <file> <member...>
grafical lane rename <file> <id> --label <text>
grafical lane remove <file> <id>
grafical diagram subtitle <file> [--text <text>]
grafical diagram note <file> [--text <text>]
grafical diagram sizing <file> auto|fixed
grafical diagram title <file> --text <text>
grafical diagram density <file> compact|normal|airy
grafical diagram legend <file> solid|dashed|dotted|plain [--text <text>]
grafical diagram tidy <file>
grafical diagram style <file> [<style>]
grafical apply <file> <batch.yaml>
grafical show <file> [--drawn]
grafical check <file> [--all]
grafical render <file> [--svg [<out>]] [--png [<out>]] [--scale 1-4]
grafical view <file> [--port <n>] [--no-open]
grafical diff <file> [<git-rev>]
```

- A new layer goes to the bottom unless `--before` or `--after` places it.
- `node add` without a position lets grafical pick the slot (D24). `node move --layer` without a position does the same.
- `node add` without `--size` gets a medium box, or a large one when its text does not fit the medium box (D27). `node resize` without `--size` returns a node to that. With `diagram sizing fixed`, a node without a size is always medium.
- `node remove` also removes the node's edges, and reports their ids.
- `node merge` puts the new node where the first listed node was, keeps every edge of the merged nodes once, and drops the edges between them. It may reuse a merged node's id. Nodes aligned to a merged node lose the alignment.
- `layer tidy` and `diagram tidy` reorder once, when asked (D24). They report every node that moved.
- Clearing: `node describe`, `node align`, `edge relabel`, `group describe` and `diagram legend` without their value clear it.
- An edge id defaults to `<from>-><to>` (D4). Either end may be a node, a group, a layer or a lane. A layer an edge ends at is drawn as a band. An end may not lie inside the other (`edge-inside`), a container end must hold a node (`empty-container`), and an end that shares a row with a group must sit right beside it there (`edge-blocked`). `group remove` also removes the edges that end at the group.
- A lane's members are layers or nodes, one way per diagram (`lane-mixed`). A row lane's layers must be neighbours (`lane-gap`), and a layer added between two layers of a lane joins it. Column lanes go left to right in creation order, and grafical keeps each row in that order: a node outside every lane sits right of the lanes, or left of them when it comes first in its row. A group lies in one lane (`group-across-lanes`) and joins with all its members. Two lanes are never the ends of one edge (`lane-to-lane`), and neither are a layer and a column lane (`edge-inside`). `lane remove` keeps the members and removes the edges that end at the lane.
- A group's box spans every row from its top member to its bottom one, rows without a member included; the other nodes of those rows sit beside the box (D7). `group join` moves a node out of its previous group. `group remove` keeps the members, ungrouped. `diagram subtitle` and `diagram note` without `--text` clear the text.
- grafical prints no warnings and no hints (D37). What they reported is in the counts and in `grafical show --drawn`: the number of nodes, the picture's width, the nodes in each row, the members of each group, and the rows a line passes.
- Every command accepts `--json`. Exit codes: 0 for success, 1 for an operation error or a defect, 2 for a usage error.
- `grafical --help` and each command's `--help` carry this reference, written for agents (D36).

A batch file is a YAML list of operations. Each item has `op: <noun>.<verb>` and the same fields as the command's flags, in camelCase:

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

### The diagram file

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

- Keys appear in the order shown. `sizing: fixed`, when set, comes right after `density`. A group's keys are `id`, `label`, `sublabel` and `in`, the group it sits inside (D34). A layer's keys are `id`, `label`, `lane`, `nodes`. A node's keys are `id`, `label`, `kind`, `sublabel`, `size`, `accent`, `align`, `group`, `lane`. A `lanes` list of `id` and `label`, in order across, comes after `groups` (D32). An edge's keys are `id`, `from`, `to`, `kind`, `label`, `both`, `accent`, and `both` and `accent` appear only when true. A node has `size` only when one was given; without it grafical sizes the box (D27). A field that holds its default (no accent, no alignment, no group, no lane, auto sizing) is left out, and so are an empty `groups` or `lanes` list, a missing subtitle and a missing note.
- Layers, the nodes in a layer, and edges are ordered lists. The order of layers and nodes is their place in the picture. The order of edges is creation order and changes nothing visible.

### The stylesheet file

A diagram names its look with `style:`, right after `density`: a built-in theme, or a stylesheet's path relative to the diagram, ending in `.grafical-style.yaml` (D30).

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
type:
  title: { size: 22 }
  node-label: { size: 14, weight: 600 }
```

- `paint` holds every colour, stroke width and corner radius, by role, under the same keys as the built-in themes. Any node kind may take a dashed border. Only `async` and `optional` edges have a dash pattern, because the kind decides the line style (D8, D33).
- `type` holds a size (6 to 48) and a weight (400 or 600, the bundled fonts' weights) per text role. Larger type changes the layout, and text that no longer fits its box is refused as overflow.
- An unknown key, a malformed colour or a weight the fonts lack is refused with the path of the value.
- A missing stylesheet fails every command that reads the diagram with `style-not-found`, and a wrong one with `bad-stylesheet`.

## Vocabulary

This is the one place these lists are kept. They are first lists, and phase 2 settles them.

| List | Values |
|---|---|
| Node kinds | `service`, `store`, `queue`, `external`, `actor`, `state` (rounded box), `terminal` (pill: a flowchart's start or end), `decision` (diamond), `initial` and `final` (a state machine's start dot and end ring: one size, label not drawn) (D34) |
| Edge kinds | `call`, `async`, `data`, `link` (no arrowhead), `optional` (dotted) |
| Size steps | `s`, `m`, `l` |
| Density | `compact`, `normal`, `airy` |
| Emphasis | `accent`: at most 2 nodes per diagram, and edges on the main path, drawn thick (D33) |
| Line shape | `orthogonal` (default) or `curved`, set in a stylesheet as `paint.edge.shape` (D33) |
| Nested box fill | `alternate` (default): group fill and background in turn; `shade`: each level a shade nearer the border colour. Set in a stylesheet as `paint.nesting` (D34) |

## Output

| Feature | Status |
|---|---|
| SVG with an accessible title and description | stage 1 |
| PNG rendered by resvg, with no browser | stage 1 |
| Bundled fonts: Inter, and a Simplified Chinese subset of Noto Sans SC | stage 1 |
| Same SVG bytes and PNG pixels for the same file, on macOS and Linux | stage 1 |
| Built-in themes `default`, `dark` and `print`, and stylesheet files (D30) | done |
| Brand fonts | later |

## Phase 1e: chosen by the owner on 2026-10-13

Each is kept only if it measurably helps (ROADMAP.md, phase 1e). Syntax is fixed when it is built. The test each passed: a fact the agent states or the engine's own behavior, never a coordinate; easier or more consistent; no choice the agent does not need (PHILOSOPHY.md).

| Feature | Does | Status |
|---|---|---|
| Bundled fan-outs | Three or more unlabelled lines of one style from one side of a box leave as one line and split near their targets, with a dot at each split. The engine's behavior: nothing for the agent to state (D38) | done |
| Equal heights in a row | Every box in a row takes the height of the row's tallest, so their tops line up (D27) | done |
| Room around stores | A gutter keeps more room on its side next to a row that holds a store, so lines run clear of the cylinders (D33) | done |
| Flow direction | `down` (as now) or `right`: rows become columns of the flow, left to right. One diagram fact | stage 1 |
| Dividers and walls | A labelled line between parts of a picture ("trust boundary"); a wall also lets lines cross only through a named gate node | stage 1 |
| Notes | A short text attached to a box, a line or a group, placed by the engine | stage 1 |
| Same facts, same picture | Boxes placed without a stated position land the same way whatever order the facts arrived in, so two agents that state the same facts get the same picture. Needs a decision first, since it touches stability (D10) and slot choice (D24) | stage 1 |
| Columns | An optional second placement fact beside rows: every box of a column sits left of every box of the next; a box in no column settles near what it connects to. Prototyped 2026-10-13 | stage 1 |

## Stage 2: the board

| Feature | Status |
|---|---|
| An X6 board opened by `grafical review` | stage 2 |
| A drag becomes an ordinary operation, with snap guides that show which one before the drop | stage 2 |
| A person's adjustments land in the diagram file like an agent's | stage 2 |
| An agent continues from a person's changes, and the reverse | stage 2 |

## Later

| Feature | Status |
|---|---|
| Lanes that run both ways in one diagram, as a grid of lanes and phases (D32) | later |
| Diagram types that need a layout of their own: sequence, entity-relationship and class, mind map, timeline (D34) | later |
| Import from Mermaid, draw.io and Excalidraw | later |
| An MCP server | later |
| Numbered steps along the main flow | later |
| Views: one file, several pictures of parts of it, a group drawn folded into one box | later |
| One catalog of systems shared by many diagrams | later |

## Considered and dropped, 2026-10-13

| Feature | Why |
|---|---|
| Docking to an edge, relative placement ("beside", "between") | Columns and drift cover them; a second way to say one thing is one more choice |
| Gaps between sections | Spacing is the engine's |
| Zones, section titles | Dividers and groups cover them |
| Ports, end labels, tags | Choices with little gain for architecture diagrams; a sublabel holds a port |
| Icons | More kinds a weak model can get wrong (D29) |
| Patterns, one operation for a common structure | Shorthand for content; the help's examples teach the structures |
| A declared diagram type that checks its conventions | grafical would judge content (D37) |
| A score of how readable a picture is | Readers differ (PHILOSOPHY.md) |
