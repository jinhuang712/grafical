# Features

What grafical does, from the side of the agent that draws and the person who asks. Why each one works the way it does is in [DESIGNS.md](DESIGNS.md) and in the decisions in [specs/decisions](specs/decisions/README.md). `grafical --help` and each command's `--help` hold the full syntax.

✅ built · 🚧 built, with a gap named beside it · ❔ claimed and not yet run · ⬜ planned

## Summary

```
Features
├── ✅ F1: Drawing in steps — every change is one named, checked operation
│   ├── ✅ F1.1: Operations — one named command per change
│   ├── ✅ F1.2: Batches — many operations, all or nothing
│   ├── ✅ F1.3: Trying a change — see counts before writing
│   ├── ✅ F1.4: IDs — the caller names every element
│   └── ✅ F1.5: Refusals — a wrong operation is refused with facts
├── 🚧 F2: Boxes — what a box is, says and carries (marks have a gap · marks by name are planned)
│   ├── ✅ F2.1: Kinds and shapes — a box's kind sets its shape
│   ├── ✅ F2.2: Labels and sublabels — a label and a quieter sublabel
│   ├── ✅ F2.3: Sizes — sized to the text, or by a step
│   ├── 🚧 F2.4: Marks — up to five small marks on a box (a corner mark is not checked against nearby lines)
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
├── 🚧 F4: Placing — where a box sits, stated as a fact (alignment differs from the code)
│   ├── ✅ F4.1: Rows and order — a box's row and its place in it
│   ├── 🚧 F4.2: Alignment — one box above or below another (the code joins a column instead)
│   ├── ✅ F4.3: Columns — a second placement fact beside rows
│   └── ✅ F4.4: Steps from another box — a box some cells from another
├── 🚧 F5: Grouping — systems, lanes, walls and notes around boxes (deeper nesting is planned)
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

## Groups

- [F1: Drawing in steps](features/F1-drawing-in-steps.md)
- [F2: Boxes](features/F2-boxes.md)
- [F3: Lines](features/F3-lines.md)
- [F4: Placing](features/F4-placing.md)
- [F5: Grouping](features/F5-grouping.md)
- [F6: The whole picture](features/F6-the-whole-picture.md)
- [F7: Seeing the result](features/F7-seeing-the-result.md)
- [F8: Files](features/F8-files.md)

## Later, if needed

Each idea becomes a planned feature once it gets a checkpoint.

- **More combinations of operations:** one operation for a common edit or a common shape, such as "put a cache between the API and the database".
  - The owner said on 2026-10-14 that this is what grafical lacks most.
  - A round that shows agents asking for what no operation can say would bring it.
- **Flow direction:** rows become columns so that a diagram reads left to right.
  - The owner held it on 2026-10-14 because most of the layout assumes rows run across.
  - A round that shows it helps would bring it.
- **Lanes both ways in one diagram:** a grid of lanes and phases.
  - A brief that needs both would bring it.
- **Diagram types with a layout of their own:** sequence diagrams · Gantt charts · mind maps · pyramids · overlapping sets.
  - Each is a type that sets a diagram's space and the operations that apply ([049. An optional type sets the diagram's space](specs/decisions/049-an-optional-type-sets-the-diagram-s-space.md)).
  - Entity-relationship and class diagrams may be a type or a kind of box.
  - Agents asking for one of these types would bring it.
- **Importing Mermaid and draw.io and Excalidraw files:** a diagram started from an existing file.
  - Users who bring such files would bring it.
- **An MCP server:** the same operations served to an agent without a shell.
  - An agent that cannot run commands would bring it.
- **Views:** several pictures of parts of one file, with a group drawn folded into one box.
  - A diagram too large for one picture would bring it.
- **One catalog of systems:** many diagrams that share one list of systems.
  - Teams that keep several diagrams of one system would bring it.
- **Brand fonts:** a team's own typeface.
  - A team that needs its brand on the pictures would bring it.

## Not planned

- **A board where people edit the diagram:** agents draw good enough diagrams with grafical, and a person asks for a change in words ([Who draws?](PHILOSOPHY.md#who-draws)).
- **Placement by coordinates for anyone:** a free position would break the promise that a change moves only what it names ([What may the agent set?](PHILOSOPHY.md#what-may-the-agent-set)).
- **A score of how readable a picture is:** readers differ ([What makes grafical good?](PHILOSOPHY.md#what-makes-grafical-good)).
- **A declared diagram type that checks its conventions:** grafical would be judging content ([022. Records over prose](specs/decisions/022-records-over-prose.md)).
- **Real-time collaboration or accounts or a hosted service:** git already shares the file and keeps its history ([009. Git as the history](specs/decisions/009-git-as-the-history.md)).
- **The same facts always giving the same picture whatever order they arrived in:** the file fixes the picture ([024. Same file exact, same facts mostly](specs/decisions/024-same-file-exact-same-facts-mostly.md)).
- **A row reordered by the engine to tidy it:** the engine does not choose an order, and the agent compares orders with `grafical try` ([033. The agent states every order](specs/decisions/033-the-agent-states-every-order.md)).
- **`grafical guide`:** the help replaced it ([021. The help as the reference](specs/decisions/021-the-help-as-the-reference.md)).
- **Docking to an edge or placement such as "beside" and "between":** columns and steps cover them, and a second way to say one thing is one more choice.
- **Gaps between sections:** spacing is the engine's.
- **Zones and section titles:** walls and groups cover them.
- **Ports and end labels and tags:** they add choices with little gain for architecture diagrams, and a sublabel holds a port.
- **Patterns as one operation for a common structure:** the help's examples teach the structures, and the idea lives on in *More combinations of operations*.
