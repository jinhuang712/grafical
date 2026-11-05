# Features

What grafical does, from the side of the agent that draws and the person who asks. Why each one works the way it does is in [DESIGNS.md](DESIGNS.md) and in the decisions in [specs/decisions](specs/decisions/README.md). `grafical --help` and each command's `--help` hold the full syntax.

✅ built · 🚧 built, with a gap named beside it · ❔ claimed and not yet run · ⬜ planned

## Summary

```
Features
├── 🚧 F1: Elements — what a diagram is made of (gaps in boxes and containers)
│   ├── 🚧 F1.1: Boxes — the parts of the system (diamond corners and corner marks not checked and size multiples and marks by name and box looks not built)
│   │   ├── 🚧 F1.1.1: Kinds and shapes — a box's kind sets its shape (a line may still meet a diamond's slanted edge)
│   │   ├── ✅ F1.1.2: Labels and sublabels — a label and a quieter sublabel
│   │   ├── 🚧 F1.1.3: Sizes — sized to the text, or by a step (multiples not built)
│   │   ├── 🚧 F1.1.4: Marks — up to five small marks on a box (a corner mark is not checked against nearby lines)
│   │   ├── ⬜ F1.1.5: Marks by name — a mark from one bundled icon set
│   │   ├── ✅ F1.1.6: Emphasis — at most two boxes stand out
│   │   └── ⬜ F1.1.7: Box looks — colors of a box's own
│   ├── 🚧 F1.2: Lines — what connects to what (a second way to draw a line thick and bars across groups and edge looks not built)
│   │   ├── ✅ F1.2.1: Kinds — a line's kind sets its style
│   │   ├── ✅ F1.2.2: Arrowheads at both ends — two-way lines
│   │   ├── 🚧 F1.2.3: Weight — thicker lines for what matters more (`edge emphasize` not yet removed)
│   │   ├── ✅ F1.2.4: Numbered steps — a number on a line
│   │   ├── 🚧 F1.2.5: Ends at a group, a row or a lane — one arrow to a whole system (a bar cannot yet cross a group)
│   │   └── ⬜ F1.2.6: Edge looks — a color of an edge's own
│   └── 🚧 F1.3: Containers — what gathers boxes (deeper nesting and lanes both ways not built)
│       ├── ✅ F1.3.1: Groups — a system drawn as one frame
│       ├── ✅ F1.3.2: Copying a group — a second zone in one operation
│       ├── ⬜ F1.3.3: Deeper nesting — up to five levels
│       ├── ✅ F1.3.4: Lanes — bands that say who owns what
│       ├── ⬜ F1.3.5: Lanes both ways — a grid of lanes and phases
│       ├── ✅ F1.3.6: Walls — space that lines cross only where allowed
│       └── ✅ F1.3.7: Notes — a short text on a box, a line or a group
├── 🚧 F2: Layout — where everything goes (region gaps and line sides and smooth lines and labels on turning lines and flow direction not built)
│   ├── ✅ F2.1: Placing every box — grafical gives every box its place
│   ├── ✅ F2.2: Rows and order — a box's row and its place in it
│   ├── ✅ F2.3: Alignment — one box above or below another
│   ├── 🚧 F2.4: Columns — a second placement fact beside rows (headings not built)
│   │   └── ⬜ F2.4.1: Column headings — a label above a column
│   ├── ✅ F2.5: Steps from another box — a box some cells from another
│   ├── 🚧 F2.6: Spacing — compact, normal or airy (region gaps not built)
│   │   └── ⬜ F2.6.1: Region gaps — more room between two regions
│   ├── 🚧 F2.7: How lines are drawn — grafical routes every line (line sides and smooth lines and labels on turning lines not built)
│   │   ├── ⬜ F2.7.1: Line sides — the side a line leaves or enters by
│   │   ├── 🚧 F2.7.2: Line shapes — square, round or smooth (round is only in the stylesheet and smooth is not built)
│   │   └── 🚧 F2.7.3: Labels on lines — a line carries its label (only on straight vertical lines)
│   └── ⬜ F2.8: Flow direction — a diagram that reads left to right
├── 🚧 F3: Editing — how a diagram changes (more combinations not built)
│   ├── 🚧 F3.1: Operations — one named command per change (the file still follows the command and verbs are not flags yet and names still differ)
│   ├── 🚧 F3.2: Batches — many operations, all or nothing (standard input not built)
│   ├── ✅ F3.3: Trying a change — see counts before writing
│   ├── ✅ F3.4: IDs — the caller names every element
│   ├── ✅ F3.5: Refusals — a wrong operation is refused with facts
│   ├── ✅ F3.6: Merging and swapping — merge, swap and remove boxes
│   └── ⬜ F3.7: More combinations of operations — one operation for a common edit
├── 🚧 F4: Look — how the picture looks (brand fonts and label text not built)
│   ├── ✅ F4.1: Title, subtitle and footnote — the words around the picture
│   ├── ✅ F4.2: Legend — a key for styles, widths and marks
│   ├── ✅ F4.3: Themes and stylesheets — the whole look from one name
│   ├── ✅ F4.4: The stylesheet file — colors, widths and type sizes
│   ├── ⬜ F4.5: Brand fonts — a team's own typeface
│   └── ⬜ F4.6: Label text — breaks and alignment
├── ✅ F5: Checking — how an agent knows it came out right
│   ├── ✅ F5.1: Show — the diagram as facts
│   ├── ✅ F5.2: Counts — facts about how the picture is drawn
│   ├── ✅ F5.3: Warnings — what the picture draws poorly
│   │   ├── ✅ F5.3.1: Bent lines — `bent-line`
│   │   ├── ✅ F5.3.2: Lines passing a row — `passing-row`
│   │   ├── ✅ F5.3.3: Lines across a group — `line-across-group`
│   │   ├── ✅ F5.3.4: Tight lines — `tight-lines`
│   │   ├── ✅ F5.3.5: Crowded labels — `crowded-label`
│   │   ├── ✅ F5.3.6: Lonely boxes — `lonely-box`
│   │   ├── ✅ F5.3.7: A line per member — `line-per-member`
│   │   ├── ✅ F5.3.8: Crossings — `crossing`
│   │   └── ✅ F5.3.9: Boxes aside — `box-aside`
│   └── ✅ F5.4: Check — defects, warnings and counts on demand
├── ✅ F6: Output — what a diagram leaves behind
│   ├── ✅ F6.1: The diagram file — one YAML file of facts
│   ├── ✅ F6.2: Render — SVG and PNG, the same everywhere
│   ├── ✅ F6.3: Live viewer — a window that redraws as the agent draws
│   └── ✅ F6.4: Diff — a change as operations
├── ✅ F7: Help — how an agent learns grafical
│   ├── ✅ F7.1: Help — the agent's whole reference
│   └── ✅ F7.2: Guides — how common diagrams are usually drawn
├── ⬜ F8: Diagram types — diagrams with a layout of their own
│   ├── ⬜ F8.1: Sequence diagrams — messages in time order
│   ├── ⬜ F8.2: Gantt charts — tasks over time
│   ├── ⬜ F8.3: Mind maps — ideas around one topic
│   ├── ⬜ F8.4: Pyramids — layers of a whole
│   ├── ⬜ F8.5: Overlapping sets — what two sets share
│   └── ⬜ F8.6: Entity-relationship and class diagrams — tables and classes
├── ⬜ F9: Import — a diagram started from an existing file
│   ├── ⬜ F9.1: Mermaid files — start from a Mermaid file
│   ├── ⬜ F9.2: draw.io files — start from a draw.io file
│   ├── ⬜ F9.3: Excalidraw files — start from an Excalidraw file
│   └── ⬜ F9.4: Someone else's picture — redraw a picture that has no source
├── ⬜ F10: Many views — several pictures of one system
│   ├── ⬜ F10.1: Views of one file — several pictures of parts of one file
│   ├── ⬜ F10.2: Folded groups — a group drawn as one box
│   └── ⬜ F10.3: One catalog of systems — one list many diagrams share
└── ⬜ F11: Getting grafical — how grafical reaches an agent
    ├── ⬜ F11.1: The npm package — install with one command
    └── ⬜ F11.2: An MCP server — operations without a shell
```

## Groups

- [F1: Elements](features/F1-elements.md)
- [F2: Layout](features/F2-layout.md)
- [F3: Editing](features/F3-editing.md)
- [F4: Look](features/F4-look.md)
- [F5: Checking](features/F5-checking.md)
- [F6: Output](features/F6-output.md)
- [F7: Help](features/F7-help.md)
- [F8: Diagram types](features/F8-diagram-types.md)
- [F9: Import](features/F9-import.md)
- [F10: Many views](features/F10-many-views.md)
- [F11: Getting grafical](features/F11-getting-grafical.md)

## Not planned

- **A board where people edit the diagram:** agents draw diagrams worth keeping with grafical, and a person asks for a change in words ([Who draws?](PHILOSOPHY.md#who-draws)).
- **Placement by coordinates for anyone:** a free position would break the promise that a change keeps every fact it does not name ([What may the agent set?](PHILOSOPHY.md#what-may-the-agent-set)).
- **A score of how readable a picture is:** readers differ ([What makes grafical good?](PHILOSOPHY.md#what-makes-grafical-good)).
- **A declared diagram type that checks its conventions:** grafical would be judging content ([049. An optional type sets the diagram's space](specs/decisions/049-an-optional-type-sets-the-diagram-s-space.md)).
- **Real-time collaboration or accounts or a hosted service:** git already shares the file and keeps its history ([009. Git as the history](specs/decisions/009-git-as-the-history.md)).
- **The same facts always giving the same picture whatever order they arrived in:** the file fixes the picture ([024. Same file exact, same facts mostly](specs/decisions/024-same-file-exact-same-facts-mostly.md)).
- **A row reordered by the engine to tidy it:** the engine does not choose an order, and the agent compares orders with `grafical try` ([033. The agent states every order](specs/decisions/033-the-agent-states-every-order.md)).
- **Docking to an edge or placement such as "beside" and "between":** columns and steps cover them, and a second way to say one thing is one more choice.
- **Zones and section titles:** walls and groups cover them.
- **Ports and end labels and tags:** they add choices with little gain for architecture diagrams, and a sublabel holds a port.
- **Patterns as one operation for a common structure:** the help's examples teach the structures, and the idea lives on in *More combinations of operations*.
