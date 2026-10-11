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
| `grafical show <file>` | Print a compact view of the diagram for agents | done |
| `grafical check <file> [--all]` | Report the defects the agent can fix. `--all` adds the engine-owned ones, which are engine bugs (D14) | done |
| `grafical render <file> [--svg <out>] [--png <out>]` | Write SVG and PNG. With neither flag, writes `<name>.svg` and `<name>.png` beside the file. `--scale` sets the PNG scale, from 1 to 4 | done |
| `grafical view <file> [--port <n>] [--no-open]` | Open a window, sized to the diagram, that shows it as it is now, redrawn within a moment of every change, with the changed parts marked, a list of each change as operations, and the problems. Ctrl-C stops it (D31) | done |
| `grafical diff <file> [<git-rev>]` | Report how the file on disk differs from a git revision, `HEAD` by default, as a batch of operations that `apply` replays on the revision's file (D18) | done |
| `grafical guide` | Print the operation reference for agents, within 3k tokens | done |
| `grafical guide <type>` | Print how to draw one diagram type, such as a state machine or a flowchart (D34) | stage 1 |
| `grafical review <file>` | Open the board on the diagram | stage 2 |
| `grafical mcp` | Serve the same operations over MCP | later |

Every write command reports the IDs it changed, any operation errors and any defects. `--json` prints the same report as JSON.

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
| `group.add` | Draw a system box around nodes, which may sit in several neighbouring rows (D7) | done |
| `group.add --in` | Put the new group inside another group, up to three levels (D34) | stage 1 |
| `group.join`, `group.leave` | Add a node to a group, or take it out | done |
| `group.rename` | Change a group's label | done |
| `group.remove` | Remove the box and keep its nodes. Edges that end at the group go with it | done |
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
grafical group add <file> <id> --label <text> [--sublabel <text>] [--nodes a,b,c]
grafical group join <file> <group> <node...>
grafical group leave <file> <node...>
grafical group rename <file> <id> --label <text>
grafical group remove <file> <id>
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
grafical show <file>
grafical check <file> [--all]
grafical render <file> [--svg <out>] [--png <out>] [--scale 1-4]
grafical view <file> [--port <n>] [--no-open]
grafical diff <file> [<git-rev>]
grafical guide
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
- A group's members must sit in neighbouring rows, or the write fails with `group-gap`. `group join` moves a node out of its previous group. `group remove` keeps the members, ungrouped. `diagram subtitle` and `diagram note` without `--text` clear the text.
- Warnings never block and never change the exit code. A write, `check` and `render` report them:
  - `too-many-nodes`: more than 16 nodes, with merge candidates (D26);
  - `too-wide`: the picture is wider than 1024 px, naming the widest layer to split (D29);
  - `crowded-layer`: a layer holds more than 5 nodes (D29);
  - `lonely-group`: a group holds one node;
  - `edge-crosses-layer`: an edge's line threads between the nodes of a layer it does not connect (D29);
  - `too-many-main-edges`: more than three edges, and more than a third of them, are on the main path (D33).
- Every command accepts `--json`. Exit codes: 0 for success, 1 for an operation error or a defect, 2 for a usage error.
- `grafical guide` prints this reference, written for agents, within 3k tokens (D17).

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

- Keys appear in the order shown. `sizing: fixed`, when set, comes right after `density`. A layer's keys are `id`, `label`, `lane`, `nodes`. A node's keys are `id`, `label`, `kind`, `sublabel`, `size`, `accent`, `align`, `group`, `lane`. A `lanes` list of `id` and `label`, in order across, comes after `groups` (D32). An edge's keys are `id`, `from`, `to`, `kind`, `label`, `both`, `accent`, and `both` and `accent` appear only when true. A node has `size` only when one was given; without it grafical sizes the box (D27). A field that holds its default (no accent, no alignment, no group, no lane, auto sizing) is left out, and so are an empty `groups` or `lanes` list, a missing subtitle and a missing note.
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
| Line shape | Planned (D33): `curved`, set in a stylesheet |

## Output

| Feature | Status |
|---|---|
| SVG with an accessible title and description | stage 1 |
| PNG rendered by resvg, with no browser | stage 1 |
| Bundled fonts: Inter, and a Simplified Chinese subset of Noto Sans SC | stage 1 |
| Same SVG bytes and PNG pixels for the same file, on macOS and Linux | stage 1 |
| Built-in themes `default`, `dark` and `print`, and stylesheet files (D30) | done |
| Brand fonts | later |

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
