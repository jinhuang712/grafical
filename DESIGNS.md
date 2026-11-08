# Designs

An agent's operations go in, a checked diagram file and a picture come out, and facts and counts go back. This is the shape between: the commitments every design change must meet. Why grafical sees diagrams this way is in [PHILOSOPHY.md](PHILOSOPHY.md). How its parts fit is in [ARCHITECTURE.md](specs/ARCHITECTURE.md).

grafical is designed around 15 guidelines:

1. **Operations are the only way a diagram changes:** every change is a named and checked operation
2. **Places are facts, never coordinates:** a place is a layer or an order or a column and never a position
3. **The engine never chooses for the agent:** every structural choice is the agent's
4. **A change keeps every fact it does not name:** the layout is computed again and positions may shift
5. **The engine routes every edge, in plain forms:** edges run through the gaps in a few plain forms
6. **Every write is checked, and each defect has an owner:** a defect fails the write when the agent can fix it
7. **A refusal gives the facts, and the agent writes the fix:** grafical states what went wrong and never writes the fix
8. **Answers are data a script can read:** every answer is keys and values
9. **The same file gives the same picture on any machine:** nothing depends on the host
10. **What grafical cannot fully read, it refuses:** a file is read whole or refused
11. **Looks are free, while shape and dash follow the type:** colors and widths take any value while the type sets the shape
12. **The command line comes first, and the help is the agent's only reference:** an agent learns and uses grafical from its commands alone
13. **Every search the engine runs has a cap:** no step searches without a bound
14. **One shortest way for each situation:** a form that only repeats another is removed
15. **A picture is judged by how it reads:** a reader sees the structure first, and a count never proves a picture good

## 1. Operations are the only way a diagram changes

Every change is a named operation, such as `node.add`, applied to a diagram file that nobody edits by hand. A batch applies all or nothing, and the caller picks every ID, which never changes. Cost: every new ability needs an operation, one bad operation sends a batch of forty back, and the agent must invent unique names.

**Ask:** Does this change go through a named operation that is checked before anything is written?

- **Stance:** [What does a change do?](PHILOSOPHY.md#what-does-a-change-do)
- **Decisions:**
  - [001. Operations over whole-file rewrites](specs/decisions/001-operations-over-whole-file-rewrites.md)
  - [009. Git as the history](specs/decisions/009-git-as-the-history.md)
- **How it works:** [The model](specs/model.md)

## 2. Places are facts, never coordinates

A node's place is its layer, its order in the layer, its group, its column, an alignment, a number of steps from another node, or a fraction of a cell off its cell. How far apart things sit is the engine's, and an agent may ask for a multiple of it between two regions. Cost: an agent moves one node only by a stated fraction of the grid, and every new need for placement becomes a new fact.

**Ask:** Does this ask the agent for a position, a size in pixels or a bend point?

- **Stance:** [What may the agent set?](PHILOSOPHY.md#what-may-the-agent-set)
- **Decisions:**
  - [002. Facts over coordinates](specs/decisions/002-facts-over-coordinates.md)
  - [003. Layers unseen, groups as systems](specs/decisions/003-layers-unseen-groups-as-systems.md)
  - [027. Columns beside layers](specs/decisions/027-columns-beside-layers.md)
  - [031. Steps from another node](specs/decisions/031-steps-from-another-node.md)
  - [079. The gap between two regions may be magnified](specs/decisions/079-the-gap-between-two-regions-may-be-magnified.md)
  - [093. A node may sit off its cell by a fraction](specs/decisions/093-a-node-may-sit-off-its-cell-by-a-fraction.md)
- **How it works:** [Placement](specs/placement.md)

## 3. The engine never chooses for the agent

The engine never adds, drops, merges or reorders what the agent stated, and never picks a fact for it: every layer, order, group and place is stated. It does the dirty work, which is spacing, routing and drawing, and reports facts. Cost: a diagram stays as cluttered as the agent made it, and grafical only reports counts.

**Ask:** Does the engine pick, default or repair a structural choice the agent did not state?

- **Stance:** [Who owns what?](PHILOSOPHY.md#who-owns-what)
- **Decisions:**
  - [033. The agent states every order](specs/decisions/033-the-agent-states-every-order.md)
  - [032. Who chose is punished](specs/decisions/032-who-chose-is-punished.md)
  - [013. Curation stays with the agent](specs/decisions/013-curation-stays-with-the-agent.md)
- **How it works:**
  - [Placement](specs/placement.md)
  - [The model](specs/model.md)

## 4. A change keeps every fact it does not name

The layout is computed again from the facts after every write, and positions are never stored. An operation changes the facts it names, and every other layer, order, group, lane and alignment stays. Cost: every write pays for a full layout, and a column grid solved again can move nodes sideways in layers the change did not touch.

**Ask:** Does any fact change that the operation did not name?

- **Stance:** [What does a change do?](PHILOSOPHY.md#what-does-a-change-do)
- **Decisions:**
  - [004. Layout computed again on every change](specs/decisions/004-layout-computed-again-on-every-change.md)
  - [024. Same file exact, same facts mostly](specs/decisions/024-same-file-exact-same-facts-mostly.md)
  - [072. A change keeps the structure and positions may shift](specs/decisions/072-a-change-keeps-the-structure-and-positions-may-shift.md)
- **How it works:** [Placement](specs/placement.md)

## 5. The engine routes every edge, in plain forms

Edges run orthogonally through the gaps between layers and nodes. The engine picks each edge's ports, tracks and bundles, and no operation can name a coordinate. A side, a passage, a fraction of the way and a multiple of a detour are the engine's unless the agent states them. It draws each thing in a few plain forms: where the facts leave none, the write is refused if the picture would hide something, and reported if it only costs. Cost: an agent steers an ugly edge only by facts, and each new way to steer it binds the router.

**Ask:** Does this hand the agent a coordinate, or draw a crooked form to make the facts fit?

- **Stance:** [Who owns what?](PHILOSOPHY.md#who-owns-what)
- **Decisions:**
  - [005. Our own gap router](specs/decisions/005-our-own-gap-router.md)
  - [019. Edges meet any side](specs/decisions/019-edges-meet-any-side.md)
  - [015. Edges that end at containers](specs/decisions/015-edges-that-end-at-containers.md)
  - [023. Fan-outs of three bundle](specs/decisions/023-fan-outs-of-three-bundle.md)
  - [090. A bundle splits at one knot](specs/decisions/090-a-bundle-splits-at-one-knot.md)
  - [065. Unreadable is refused and costly is reported](specs/decisions/065-unreadable-is-refused-and-costly-is-reported.md)
  - [058. An agent may state the side of an edge](specs/decisions/058-an-agent-may-state-the-side-of-an-edge.md)
  - [059. Edges may be drawn square or round](specs/decisions/059-edges-may-be-drawn-square-or-round.md)
  - [095. A good route is one the eye can follow](specs/decisions/095-a-good-route-is-one-the-eye-can-follow.md)
  - [096. An edge is steered by facts and never by coordinates](specs/decisions/096-an-edge-is-steered-by-facts-and-never-by-coordinates.md)
  - [097. The router draws clean edges and the agent makes their room](specs/decisions/097-the-router-draws-clean-edges-and-the-agent-makes-their-room.md)
- **How it works:**
  - [Routing](specs/routing.md)
  - [Text placement](specs/labels.md)

## 6. Every write is checked, and each defect has an owner

A defect the agent can fix fails the write and changes nothing. A defect only the engine can avoid is an engine bug: the write goes ahead, and only `grafical check --all` reports it. What the picture draws poorly is a warning, printed on every write. Cost: an engine bug can reach a picture without the agent knowing, so a fuzz test must keep looking for them.

**Ask:** Who can fix this defect, the agent or the engine, and does the write say so?

- **Stance:** [Who owns what?](PHILOSOPHY.md#who-owns-what)
- **Decisions:**
  - [008. Defects owned by who can fix them](specs/decisions/008-defects-owned-by-who-can-fix-them.md)
  - [048. Every write prints every warning](specs/decisions/048-every-write-prints-every-warning.md)
  - [036. Composition counts](specs/decisions/036-composition-counts.md)
- **How it works:** [The checker](specs/checks.md)

## 7. A refusal gives the facts, and the agent writes the fix

When grafical refuses a write, it says what went wrong, what caused it and which commands could change it. It never writes the fixed command for the agent, because choosing the fix is the agent's work. Cost: the agent spends a step working out the fix from the facts.

**Ask:** Can the agent find the fix from this refusal alone, without grafical writing it?

- **Stance:** [How does an agent learn grafical?](PHILOSOPHY.md#how-does-an-agent-learn-grafical)
- **Decisions:**
  - [047. Refusals say what happened and which commands can change it](specs/decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md)
  - [044. One way to a page, and a wrong command names the right one](specs/decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)
- **How it works:** [How grafical answers](specs/answers.md)

## 8. Answers are data a script can read

grafical answers in fixed keys and values, never in sentences of advice. The one sentence it prints is the fixed description of a problem's code. Cost: grafical never says what looks wrong, so the agent judges the picture itself, from the records and by looking.

**Ask:** Could a script read this answer without parsing English?

- **Stance:** [How does an agent learn grafical?](PHILOSOPHY.md#how-does-an-agent-learn-grafical)
- **Decisions:**
  - [022. Records over prose](specs/decisions/022-records-over-prose.md)
  - [099. An agent checks its own picture against a list](specs/decisions/099-an-agent-checks-its-own-picture-against-a-list.md)
- **How it works:** [How grafical answers](specs/answers.md)

## 9. The same file gives the same picture on any machine

Under one version of grafical, the same file and stylesheet give the same SVG bytes and PNG pixels. Nothing depends on the host: not its fonts, locale, clock or the order of an unordered collection. Text is measured from bundled fonts, never from the system. Cost: the fonts are bundled, about 2.75 MB per weight for the Chinese subset, every list keeps a fixed order, and a character outside the subset is a defect the agent must fix.

**Ask:** Does anything here depend on the machine it runs on?

- **Stance:** [What does a change do?](PHILOSOPHY.md#what-does-a-change-do)
- **Decisions:**
  - [006. Bundled fonts](specs/decisions/006-bundled-fonts.md)
  - [007. Our own SVG writer](specs/decisions/007-our-own-svg-writer.md)
  - [024. Same file exact, same facts mostly](specs/decisions/024-same-file-exact-same-facts-mostly.md)
- **How it works:**
  - [The text measurer](specs/text.md)
  - [The renderer](specs/rendering.md)

## 10. What grafical cannot fully read, it refuses

A file of a newer format, a field the schema does not know, a mark file that changed and a missing stylesheet all fail the load. Nothing is half read. The file records its format version, and after the first release the format only grows: a field may be added, but changing or removing one needs a new major version. Cost: an older grafical cannot open a newer file, and old fields keep their meaning forever.

**Ask:** Does an old file keep its meaning, and does an unreadable file fail loudly instead of being guessed at?

- **Stance:** [What does a change do?](PHILOSOPHY.md#what-does-a-change-do)
- **Decisions:** [001. Operations over whole-file rewrites](specs/decisions/001-operations-over-whole-file-rewrites.md)
- **How it works:** [The .grafical file](specs/grafical-file.md)

## 11. Looks are free, while shape and dash follow the type

Any object may take any color, a mark may be any emoji, text or file, and an edge may take any width from 0.5 to 8 px. A look comes from the object, then the styles it marks, then the object it follows with `like`, then its type, then the theme. A node's shape and an edge's dash come from its type, so that a reader can trust them. Cost: two diagrams can look different, the legend has to say what a color, a width or a mark means, and a look a team shares lives in a second file.

**Ask:** Is this a look the agent may choose freely, or a place that must stay a fact?

- **Stance:** [What may the agent set?](PHILOSOPHY.md#what-may-the-agent-set)
- **Decisions:**
  - [025. Marks of any kind](specs/decisions/025-marks-of-any-kind.md)
  - [026. Edge weights](specs/decisions/026-edge-weights.md)
  - [016. Themes and stylesheets](specs/decisions/016-themes-and-stylesheets.md)
  - [028. A legend for widths and marks](specs/decisions/028-a-legend-for-widths-and-marks.md)
  - [034. The legend says only what the agent named](specs/decisions/034-the-legend-says-only-what-the-agent-named.md)
  - [091. A label may mark a style](specs/decisions/091-a-label-may-mark-a-style.md)
  - [092. `like` follows an object's look and nothing else](specs/decisions/092-like-follows-an-object-s-look-and-nothing-else.md)
- **How it works:**
  - [The theme](specs/theme.md)
  - [The renderer](specs/rendering.md)

## 12. The command line comes first, and the help is the agent's only reference

Every operation is a command, every command takes `--json`, and every write reports what it changed, so that the agent need not read the diagram again. An agent learns grafical from `grafical --help` and each command's help, and reads a diagram through `show`, never the file. An MCP server may wrap the same operations later. Cost: each command is a process start, which a batch spreads over many operations.

**Ask:** Can an agent do this, and learn how, from the command line and its help alone?

- **Stance:** [How does an agent learn grafical?](PHILOSOPHY.md#how-does-an-agent-learn-grafical)
- **Decisions:**
  - [021. The help as the reference](specs/decisions/021-the-help-as-the-reference.md)
  - [042. One entry page, help where it is used](specs/decisions/042-one-entry-page-help-where-it-is-used.md)
  - [043. Help for the tool, guides for best practice](specs/decisions/043-help-for-the-tool-guides-for-best-practice.md)
- **How it works:**
  - [Architecture](specs/ARCHITECTURE.md)
  - [How grafical answers](specs/answers.md)

## 13. Every search the engine runs has a cap

Every write lays out, routes and checks the whole diagram again ([4. A change keeps every fact it does not name](#4-a-change-keeps-every-fact-it-does-not-name)), so no step may search without a bound. Each search, such as trying the prefixes of a refused batch, stops at a fixed limit. Cost: a search that could find a better answer stops at its cap.

**Ask:** Does any step here search without a cap, or grow faster than the diagram?

- **Stance:** [Why are good diagrams rare?](PHILOSOPHY.md#why-are-good-diagrams-rare)
- **Decisions:**
  - [033. The agent states every order](specs/decisions/033-the-agent-states-every-order.md)
  - [047. Refusals say what happened and which commands can change it](specs/decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md)
- **How it works:**
  - [How grafical answers](specs/answers.md)
  - [Placement](specs/placement.md)

## 14. One shortest way for each situation

In one situation an agent has one shortest way to do a thing. Stating a fact while making an element and changing it later are two situations, and each keeps its own way. Cost: a convenient short form goes when it repeats another, and every new command must name the situation it serves.

**Ask:** Is there already a way to do this in the same situation, and which of the two is shorter?

- **Stance:** [How many ways does one thing have?](PHILOSOPHY.md#how-many-ways-does-one-thing-have)
- **Decisions:**
  - [070. One shortest way for each situation](specs/decisions/070-one-shortest-way-for-each-situation.md)
  - [044. One way to a page, and a wrong command names the right one](specs/decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)
- **How it works:** [Architecture](specs/ARCHITECTURE.md)

## 15. A picture is judged by how it reads

A reader sees the structure of a picture before following any edge, so a design serves that reading first. What the picture implies must be what the facts say, the shape must show at once, the places must say most of it and like things must look alike. Placing is the agent's and routing is the engine's, so a bad picture may be either's to fix. A count may show a fault and never shows a picture good, since a picture with no crossings can still read badly. The owner's eye judges grafical, and an agent judges its own picture against the same points. Cost: no script can pass a picture, so judging grafical takes the owner's look, and a change that improves every count may still be thrown out.

**Ask:** Can a reader see the structure before following an edge, and does the picture imply only what the facts say?

- **Stance:** [How does a reader see a diagram?](PHILOSOPHY.md#how-does-a-reader-see-a-diagram)
- **Decisions:**
  - [098. A picture is judged by how it reads](specs/decisions/098-a-picture-is-judged-by-how-it-reads.md)
  - [099. An agent checks its own picture against a list](specs/decisions/099-an-agent-checks-its-own-picture-against-a-list.md)
  - [097. The router draws clean edges and the agent makes their room](specs/decisions/097-the-router-draws-clean-edges-and-the-agent-makes-their-room.md)
  - [095. A good route is one the eye can follow](specs/decisions/095-a-good-route-is-one-the-eye-can-follow.md)
  - [065. Unreadable is refused and costly is reported](specs/decisions/065-unreadable-is-refused-and-costly-is-reported.md)
- **How it works:**
  - [Placement](specs/placement.md)
  - [Routing](specs/routing.md)

Every other decision, such as how a layer without a node is drawn, is in [specs/decisions](specs/decisions/README.md).
