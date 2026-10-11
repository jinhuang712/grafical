# Features

What grafical does, as commands and operations, with the status of each. "Phase 1 syntax" below is fixed. The rest is illustrative until phase 2 fixes it. Decisions behind these features are in [DESIGN.md](DESIGN.md).

| Status | Meaning |
|---|---|
| `stage 1` | Planned for the MVP |
| `stage 2` | Planned for the board |
| `later` | Wanted, not scheduled |
| `done` | Implemented and tested |

## Commands

| Command | Does | Status |
|---|---|---|
| `grafical new <file> --title <text>` | Create an empty diagram | stage 1 |
| `grafical <noun> <verb> <file> …` | Apply one operation, such as `grafical node add` | stage 1 |
| `grafical apply <file> <batch.yaml>` | Apply a list of operations, all or nothing | stage 1 |
| `grafical show <file>` | Print a compact view of the diagram for agents | stage 1 |
| `grafical check <file> [--all]` | Report the defects the agent can fix. `--all` adds the engine-owned ones, which are engine bugs (D14) | stage 1 |
| `grafical render <file> [--svg <out>] [--png <out>]` | Write SVG and PNG. With neither flag, writes `<name>.svg` and `<name>.png` beside the file. `--scale` sets the PNG scale, from 1 to 4 | stage 1 |
| `grafical diff <file> [<git-rev>]` | Report how the file on disk differs from a git revision, `HEAD` by default, as operations | stage 1 |
| `grafical guide` | Print the operation reference for agents, within 3k tokens | stage 1 |
| `grafical review <file>` | Open the board on the diagram | stage 2 |
| `grafical mcp` | Serve the same operations over MCP | later |

Every write command reports the IDs it changed, any operation errors and any defects. `--json` prints the same report as JSON.

## Operations

On the command line an operation is `<noun> <verb> <file> <id>`, and every other value is a flag, such as `--label`. In a batch file it is `op: <noun>.<verb>`, with the same field names.

### Diagram

| Operation | Does | Status |
|---|---|---|
| `diagram.title` | Set the title | stage 1 |
| `diagram.density` | Set spacing: `compact`, `normal` or `airy` | stage 1 |
| `diagram.sizing` | Set how a node with no size is sized: `auto`, to its text (the default), or `fixed`, always medium (D27) | stage 1 |
| `diagram.subtitle` | Set or clear one sentence under the title (D26) | stage 1 |
| `diagram.note` | Set or clear the footnote, such as "Not shown: …" (D26) | stage 1 |

### Layers

| Operation | Does | Status |
|---|---|---|
| `layer.add` | Add a layer: at the top, at the bottom, or before or after another layer | stage 1 |
| `layer.rename` | Change a layer's label | stage 1 |
| `layer.move` | Change a layer's position | stage 1 |
| `layer.tidy` | Reorder a layer's nodes to reduce edge crossings, once (D24) | stage 1 |
| `layer.remove` | Remove an empty layer | stage 1 |

### Groups

| Operation | Does | Status |
|---|---|---|
| `group.add` | Draw a system box around nodes, which may sit in several neighbouring rows (D7) | stage 1 |
| `group.join`, `group.leave` | Add a node to a group, or take it out | stage 1 |
| `group.rename` | Change a group's label | stage 1 |
| `group.remove` | Remove the box and keep its nodes | stage 1 |

### Nodes

| Operation | Does | Status |
|---|---|---|
| `node.add` | Add a node with an ID, a label, a kind and a layer, placed first, last, or before or after another node. Without a position, grafical picks the slot with the fewest crossings (D24) | stage 1 |
| `node.rename` | Change the label. The ID stays. A node grafical sizes grows or shrinks with its label (D27). A label that still does not fit fails with a suggested fix | stage 1 |
| `node.describe` | Set or clear the sublabel, such as a port or a topic name | stage 1 |
| `node.kind` | Change the kind | stage 1 |
| `node.move` | Move to another layer, group or position | stage 1 |
| `node.resize` | Set the size step, which fixes the box's width and height. Without a step, grafical sizes the box to its text again (D27) | stage 1 |
| `node.align` | Place the node directly above or below a node in another layer. Fails if the alignment cannot hold with the order of either layer | stage 1 |
| `node.emphasize` | Turn the accent on or off | stage 1 |
| `node.remove` | Remove the node and its edges | stage 1 |

### Edges

| Operation | Does | Status |
|---|---|---|
| `edge.add` | Connect two ends, with an optional label and kind. An end is a node, a group or a layer (D28) | stage 1 |
| `edge.relabel` | Change or clear the label | stage 1 |
| `edge.kind` | Change the kind | stage 1 |
| `edge.reverse` | Swap the direction. The ID stays | stage 1 |
| `edge.remove` | Remove the edge | stage 1 |

## Phase 1 syntax

Phase 1 builds this subset. `<file>` is a diagram file, named `<name>.grafical.yaml` by convention.

```sh
grafical new <file> --title <text> [--subtitle <text>] [--note <text>] [--density compact|normal|airy]
    [--sizing auto|fixed]
grafical layer add <file> <id> --label <text> [--before <layer> | --after <layer>]
grafical node add <file> <id> --layer <layer> --label <text> [--kind <kind>] [--sublabel <text>]
    [--size s|m|l] [--first | --last | --before <node> | --after <node>] [--align <node>] [--accent]
grafical node rename <file> <id> --label <text>
grafical node resize <file> <id> [--size s|m|l]
grafical node move <file> <id> [--layer <layer>] [--first | --last | --before <node> | --after <node>]
grafical node remove <file> <id>
grafical edge add <file> <from> <to> [--id <id>] [--label <text>] [--kind <kind>]
grafical edge remove <file> <id>
grafical group add <file> <id> --label <text> [--nodes a,b,c]
grafical group join <file> <group> <node...>
grafical group leave <file> <node...>
grafical group rename <file> <id> --label <text>
grafical group remove <file> <id>
grafical diagram subtitle <file> [--text <text>]
grafical diagram note <file> [--text <text>]
grafical diagram sizing <file> auto|fixed
grafical apply <file> <batch.yaml>
grafical show <file>
grafical check <file> [--all]
grafical render <file> [--svg <out>] [--png <out>] [--scale 1-4]
grafical guide
```

- A new layer goes to the bottom unless `--before` or `--after` places it.
- `node add` without a position lets grafical pick the slot (D24). `node move --layer` without a position does the same.
- `node add` without `--size` gets a medium box, or a large one when its text does not fit the medium box (D27). `node resize` without `--size` returns a node to that. With `diagram sizing fixed`, a node without a size is always medium.
- `node remove` also removes the node's edges, and reports their ids.
- An edge id defaults to `<from>-><to>` (D4). Either end may be a node, a group or a layer. A layer an edge ends at is drawn as a band. An end may not lie inside the other (`edge-inside`), a container end must hold a node (`empty-container`), and an end that shares a row with a group must sit right beside it there (`edge-blocked`). `group remove` also removes the edges that end at the group.
- A group's members must sit in neighbouring rows, or the write fails with `group-gap`. `group join` moves a node out of its previous group. `group remove` keeps the members, ungrouped. `diagram subtitle` and `diagram note` without `--text` clear the text.
- A write over 16 nodes succeeds with a `too-many-nodes` warning that names merge candidates (D26). Warnings never change the exit code.
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

- Keys appear in the order shown. `sizing: fixed`, when set, comes right after `density`. A node's keys are `id`, `label`, `kind`, `sublabel`, `size`, `accent`, `align`, `group`. A node has `size` only when one was given; without it grafical sizes the box (D27). A field that holds its default (no accent, no alignment, no group, auto sizing) is left out, and so are an empty `groups` list, a missing subtitle and a missing note.
- Layers, the nodes in a layer, and edges are ordered lists. The order of layers and nodes is their place in the picture. The order of edges is creation order and changes nothing visible.

## Vocabulary

This is the one place these lists are kept. They are first lists, and phase 2 settles them.

| List | Values |
|---|---|
| Node kinds | `service`, `store`, `queue`, `external`, `actor` |
| Edge kinds | `call`, `async`, `data` |
| Size steps | `s`, `m`, `l` |
| Density | `compact`, `normal`, `airy` |
| Emphasis | `accent`, at most 2 per diagram |

## Output

| Feature | Status |
|---|---|
| SVG with an accessible title and description | stage 1 |
| PNG rendered by resvg, with no browser | stage 1 |
| Bundled fonts: Inter, and a Simplified Chinese subset of Noto Sans SC | stage 1 |
| Same SVG bytes and PNG pixels for the same file, on macOS and Linux | stage 1 |
| One theme | stage 1 |
| More themes, and brand colors and fonts | later |

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
| Groups that span layers, and swimlanes | later |
| Other diagram types | later |
| Import from Mermaid, draw.io and Excalidraw | later |
| An MCP server | later |
