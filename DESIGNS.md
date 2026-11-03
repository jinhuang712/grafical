# Designs

An agent's operations go in, a checked diagram file and a picture come out, and facts and counts go back. This is the shape between: the commitments every design change must meet. Why grafical sees diagrams this way is in [PHILOSOPHY.md](PHILOSOPHY.md), what it does is in [FEATURES.md](FEATURES.md), and how its parts fit is in [ARCHITECTURE.md](specs/ARCHITECTURE.md).

grafical is designed around 15 guidelines:

1. **Operations are the only way a diagram changes**
2. **Places are facts, never coordinates**
3. **The engine never chooses for the agent**
4. **A change moves only what it names**
5. **The engine routes every line, in plain forms**
6. **Every write is checked, and each defect has an owner**
7. **A refusal says what happened and which commands can change it**
8. **Output is records, with no advice**
9. **The same file gives the same picture on any machine**
10. **What grafical cannot fully read, it refuses**
11. **Looks are free, while shape and dash follow the kind**
12. **The command line comes first, and the help is the agent's only reference**
13. **A write is fast enough to run every time**
14. **A diagram reads no file outside its folder, and its pictures run nothing**
15. **Every dependency allows use in an MIT project**

## 1. Operations are the only way a diagram changes

Every change is a named operation, such as `node.add`, applied to a diagram file that nobody edits by hand. A batch applies all or nothing, and the caller picks every ID, which never changes. Cost: every new ability needs an operation, one bad operation sends a batch of forty back, and the agent must invent unique names.

**Ask:** Does this change go through a named operation that is checked before anything is written?

- **Decisions:** [Operations over whole-file rewrites](specs/decisions/001-operations-over-whole-file-rewrites.md), [Git as the history](specs/decisions/009-git-as-the-history.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 2. Places are facts, never coordinates

A box's place is its row, its order in the row, its group, its column, an alignment, or a number of steps from another box. How far apart things sit is the engine's. Cost: an agent cannot nudge one box, and every new need for placement becomes a new fact.

**Ask:** Does this ask the agent for a position, a size in pixels or a bend point?

- **Decisions:** [Facts over coordinates](specs/decisions/002-facts-over-coordinates.md), [Rows unseen, groups as systems](specs/decisions/003-rows-unseen-groups-as-systems.md), [Columns beside rows](specs/decisions/027-columns-beside-rows.md), [Steps from another box](specs/decisions/031-steps-from-another-box.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 3. The engine never chooses for the agent

The engine never adds, drops, merges or reorders what the agent stated, and never picks a fact for it: every row, order, group and place is stated. It does the dirty work, which is spacing, routing and drawing, and reports facts. Cost: a diagram stays as cluttered as the agent made it, and grafical only reports counts.

**Ask:** Does the engine pick, default or repair a structural choice the agent did not state?

- **Decisions:** [The agent states every order](specs/decisions/033-the-agent-states-every-order.md), [Who chose is punished](specs/decisions/032-who-chose-is-punished.md), [Curation stays with the agent](specs/decisions/013-curation-stays-with-the-agent.md), [The engine picks a new box's slot](specs/decisions/011-the-engine-picks-a-new-box-s-slot.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 4. A change moves only what it names

The layout is computed again from the facts after every write, and positions are never stored. An operation changes the facts it names, and only a fixed list of things may follow it. Cost: every write pays for a full layout, the engine may not tidy beyond the list, and a column grid solved again can move boxes sideways in rows the change did not touch.

**Ask:** What moves besides what the operation named, and is it on the list?

- **Decisions:** [Layout computed again on every change](specs/decisions/004-layout-computed-again-on-every-change.md), [Same file exact, same facts mostly](specs/decisions/024-same-file-exact-same-facts-mostly.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 5. The engine routes every line, in plain forms

Lines run orthogonally through the gaps between rows and boxes. The engine picks each line's sides, ports, tracks and bundles, and no operation can. It draws each thing in a few plain forms: where the facts leave none, the write is refused if the picture would hide something, and reported if it only costs. Cost: an agent cannot fix one ugly line directly, only change the facts around it.

**Ask:** Does this hand the agent a side, a port or a bend, or draw a crooked form to make the facts fit?

- **Decisions:** [Our own gap router](specs/decisions/005-our-own-gap-router.md), [Lines meet any side](specs/decisions/019-lines-meet-any-side.md), [Lines that end at containers](specs/decisions/015-lines-that-end-at-containers.md), [Fan-outs of three bundle](specs/decisions/023-fan-outs-of-three-bundle.md), [The dirty work has edges](specs/decisions/041-the-dirty-work-has-edges.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 6. Every write is checked, and each defect has an owner

A defect the agent can fix fails the write and changes nothing. A defect only the engine can avoid is an engine bug: the write goes ahead, and only `grafical check --all` reports it. What the picture draws poorly is a warning, printed on every write. Cost: an engine bug can reach a picture without the agent knowing, so a fuzz test must keep looking for them.

**Ask:** Who can fix this defect, the agent or the engine, and does the write say so?

- **Decisions:** [Defects owned by who can fix them](specs/decisions/008-defects-owned-by-who-can-fix-them.md), [Every write prints every warning](specs/decisions/048-every-write-prints-every-warning.md), [Composition counts](specs/decisions/036-composition-counts.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 7. A refusal says what happened and which commands can change it

A refusal is a block: its kind and code, the code's one fixed sentence, what caused it, the facts one per line, and the names of the commands that can change it. It never teaches and never writes the command with values filled in. Cost: the agent writes the command itself, from the facts.

**Ask:** Does the answer carry facts and command names only, with no advice and no ready-made fix?

- **Decisions:** [Refusals say what happened and which commands can change it](specs/decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md), [One way to a page, and a wrong command names the right one](specs/decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 8. Output is records, with no advice

Everything grafical prints is a record of fixed keys and values, or a line of a problem's block. The only sentence is a code's fixed description. Cost: an agent must judge a drawing from counts, without being told what is wrong with it.

**Ask:** Could a script read this output, and does it say anything the agent must take as advice?

- **Decisions:** [Records over prose](specs/decisions/022-records-over-prose.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 9. The same file gives the same picture on any machine

Under one version of grafical, the same file and stylesheet give the same SVG bytes and PNG pixels. Nothing depends on the host: not its fonts, locale, clock or the order of an unordered collection. Text is measured from bundled fonts, never from the system. Cost: the fonts are bundled, about 2.75 MB per weight for the Chinese subset, every list keeps a fixed order, and a character outside the subset is a defect the agent must fix.

**Ask:** Does anything here depend on the machine it runs on?

- **Decisions:** [Bundled fonts](specs/decisions/006-bundled-fonts.md), [Our own SVG writer](specs/decisions/007-our-own-svg-writer.md), [Same file exact, same facts mostly](specs/decisions/024-same-file-exact-same-facts-mostly.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 10. What grafical cannot fully read, it refuses

A file of a newer format, a field the schema does not know, a mark file that changed and a missing stylesheet all fail the load. Nothing is half read. The file records its format version, and after the first release the format only grows: a field may be added, but changing or removing one needs a new major version. Cost: an older grafical cannot open a newer file, and old fields keep their meaning forever.

**Ask:** Does an old file keep its meaning, and does an unreadable file fail loudly instead of being guessed at?

- **Decisions:** [Operations over whole-file rewrites](specs/decisions/001-operations-over-whole-file-rewrites.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 11. Looks are free, while shape and dash follow the kind

A theme or a stylesheet sets any color, a mark may carry any color, emoji, text or file, and a line may take any width from 0.5 to 8 px. A box's shape and a line's dash pattern come from its kind, so that a reader can trust them. The look comes from a theme or a stylesheet that the file names. Cost: two diagrams can look different, the legend has to say what a width or a mark means, and a look a team shares lives in a second file.

**Ask:** Is this a look the agent may choose freely, or a place that must stay a fact?

- **Decisions:** [Marks of any kind](specs/decisions/025-marks-of-any-kind.md), [Edge weights](specs/decisions/026-edge-weights.md), [Themes and stylesheets](specs/decisions/016-themes-and-stylesheets.md), [A legend for widths and marks](specs/decisions/028-a-legend-for-widths-and-marks.md), [The legend says only what the agent named](specs/decisions/034-the-legend-says-only-what-the-agent-named.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 12. The command line comes first, and the help is the agent's only reference

Every operation is a command, every command takes `--json`, and every write reports what it changed, so that the agent need not read the diagram again. An agent learns grafical from `grafical --help` and each command's help, and reads a diagram through `show`, never the YAML. An MCP server may wrap the same operations later. Cost: each command is a process start, which a batch spreads over many operations.

**Ask:** Can an agent do this, and learn how, from the command line and its help alone?

- **Decisions:** [The help as the reference](specs/decisions/021-the-help-as-the-reference.md), [One entry page, help where it is used](specs/decisions/042-one-entry-page-help-where-it-is-used.md), [Help for the tool, guides for best practice](specs/decisions/043-help-for-the-tool-guides-for-best-practice.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 13. A write is fast enough to run every time

A write lays out, routes and checks within the targets under "Speed" in GOALS.md. Cost: every search the engine runs, such as choosing a slot, needs a cap, so that a large diagram stays fast.

**Ask:** How long does this take at 50 boxes, and does any search in it have a cap?

- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 14. A diagram reads no file outside its folder, and its pictures run nothing

A mark's file must sit inside the diagram's folder, is pinned by its SHA-256, and is embedded in the SVG, never linked. An SVG with a script, an embedded document, an event handler or a reference outside itself is refused. The live viewer listens on 127.0.0.1 only. Cost: diagrams cannot share one icons folder above them, and a diagram cannot be watched from another machine.

**Ask:** Can this read a path outside the folder, run something, or listen beyond this machine?

- **Decisions:** [A viewer that only shows](specs/decisions/017-a-viewer-that-only-shows.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

## 15. Every dependency allows use in an MIT project

grafical is MIT-licensed, so every runtime dependency is MIT, ISC, BSD or MPL-2.0, the fonts are under the SIL Open Font License, and the Twemoji graphics are CC-BY 4.0, which asks for attribution. Cost: LGPL and GPL libraries are out, such as `libavoid-js` and `elkjs`, whatever they would save.

**Ask:** Does the license of this dependency allow use in an MIT project?

- **Decisions:** [TypeScript on Node](specs/decisions/010-typescript-on-node.md)
- **How it works:** [ARCHITECTURE.md](specs/ARCHITECTURE.md)

Every other decision, such as how a row without a box is drawn, is in [specs/decisions](specs/decisions/README.md).
