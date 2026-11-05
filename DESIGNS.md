# Designs

An agent's operations go in, a checked diagram file and a picture come out, and facts and counts go back. This is the shape between: the commitments every design change must meet. Why grafical sees diagrams this way is in [PHILOSOPHY.md](PHILOSOPHY.md). How its parts fit is in [ARCHITECTURE.md](specs/ARCHITECTURE.md).

grafical is designed around 15 guidelines:

1. **Operations are the only way a diagram changes:** every change is a named and checked operation
2. **Places are facts, never coordinates:** a place is a row or an order or a column and never a position
3. **The engine never chooses for the agent:** every structural choice is the agent's
4. **A change moves only what it names:** the layout is computed again and only a fixed list may follow a change
5. **The engine routes every line, in plain forms:** lines run through the gaps in a few plain forms
6. **Every write is checked, and each defect has an owner:** a defect fails the write when the agent can fix it
7. **A refusal gives the facts, and the agent writes the fix:** grafical states what went wrong and never writes the fix
8. **Answers are data a script can read:** every answer is keys and values
9. **The same file gives the same picture on any machine:** nothing depends on the host
10. **What grafical cannot fully read, it refuses:** a file is read whole or refused
11. **Looks are free, while shape and dash follow the kind:** colors and widths take any value while the kind sets the shape
12. **The command line comes first, and the help is the agent's only reference:** an agent learns and uses grafical from its commands alone
13. **Every search the engine runs has a cap:** no step searches without a bound
14. **A diagram reads no file outside its folder, and its pictures run nothing:** marks stay in the folder and an SVG holds no script
15. **Every dependency allows use in an MIT project:** runtime dependencies are MIT-compatible

## 1. Operations are the only way a diagram changes

Every change is a named operation, such as `node.add`, applied to a diagram file that nobody edits by hand. A batch applies all or nothing, and the caller picks every ID, which never changes. Cost: every new ability needs an operation, one bad operation sends a batch of forty back, and the agent must invent unique names.

**Ask:** Does this change go through a named operation that is checked before anything is written?

- **Stance:** [What does a change do?](PHILOSOPHY.md#what-does-a-change-do)
- **Decisions:**
  - [001. Operations over whole-file rewrites](specs/decisions/001-operations-over-whole-file-rewrites.md)
  - [009. Git as the history](specs/decisions/009-git-as-the-history.md)
- **How it works:** [The model](specs/model.md)

## 2. Places are facts, never coordinates

A box's place is its row, its order in the row, its group, its column, an alignment, or a number of steps from another box. How far apart things sit is the engine's. Cost: an agent cannot nudge one box, and every new need for placement becomes a new fact.

**Ask:** Does this ask the agent for a position, a size in pixels or a bend point?

- **Stance:** [What may the agent set?](PHILOSOPHY.md#what-may-the-agent-set)
- **Decisions:**
  - [002. Facts over coordinates](specs/decisions/002-facts-over-coordinates.md)
  - [003. Rows unseen, groups as systems](specs/decisions/003-rows-unseen-groups-as-systems.md)
  - [027. Columns beside rows](specs/decisions/027-columns-beside-rows.md)
  - [031. Steps from another box](specs/decisions/031-steps-from-another-box.md)
- **How it works:** [Placement](specs/placement.md)

## 3. The engine never chooses for the agent

The engine never adds, drops, merges or reorders what the agent stated, and never picks a fact for it: every row, order, group and place is stated. It does the dirty work, which is spacing, routing and drawing, and reports facts. Cost: a diagram stays as cluttered as the agent made it, and grafical only reports counts.

**Ask:** Does the engine pick, default or repair a structural choice the agent did not state?

- **Stance:** [Who owns what?](PHILOSOPHY.md#who-owns-what)
- **Decisions:**
  - [033. The agent states every order](specs/decisions/033-the-agent-states-every-order.md)
  - [032. Who chose is punished](specs/decisions/032-who-chose-is-punished.md)
  - [013. Curation stays with the agent](specs/decisions/013-curation-stays-with-the-agent.md)
  - [011. The engine picks a new box's slot](specs/decisions/011-the-engine-picks-a-new-box-s-slot.md)
- **How it works:**
  - [Placement](specs/placement.md)
  - [The model](specs/model.md)

## 4. A change moves only what it names

The layout is computed again from the facts after every write, and positions are never stored. An operation changes the facts it names, and only a fixed list of things may follow it. Cost: every write pays for a full layout, the engine may not tidy beyond the list, and a column grid solved again can move boxes sideways in rows the change did not touch.

**Ask:** What moves besides what the operation named, and is it on the list?

- **Stance:** [What does a change do?](PHILOSOPHY.md#what-does-a-change-do)
- **Decisions:**
  - [004. Layout computed again on every change](specs/decisions/004-layout-computed-again-on-every-change.md)
  - [024. Same file exact, same facts mostly](specs/decisions/024-same-file-exact-same-facts-mostly.md)
- **How it works:** [Placement](specs/placement.md)

## 5. The engine routes every line, in plain forms

Lines run orthogonally through the gaps between rows and boxes. The engine picks each line's ports, tracks and bundles, and no operation can. A side is the engine's unless the agent states it. It draws each thing in a few plain forms: where the facts leave none, the write is refused if the picture would hide something, and reported if it only costs. Cost: an agent cannot bend one ugly line directly, only state its sides and change the facts around it.

**Ask:** Does this hand the agent a port or a bend, or draw a crooked form to make the facts fit?

- **Stance:** [Who owns what?](PHILOSOPHY.md#who-owns-what)
- **Decisions:**
  - [005. Our own gap router](specs/decisions/005-our-own-gap-router.md)
  - [019. Lines meet any side](specs/decisions/019-lines-meet-any-side.md)
  - [015. Lines that end at containers](specs/decisions/015-lines-that-end-at-containers.md)
  - [023. Fan-outs of three bundle](specs/decisions/023-fan-outs-of-three-bundle.md)
  - [065. Unreadable is refused and costly is reported](specs/decisions/065-unreadable-is-refused-and-costly-is-reported.md)
  - [058. An agent may state the side of a line](specs/decisions/058-an-agent-may-state-the-side-of-a-line.md)
  - [059. Lines may be drawn square, round or smooth](specs/decisions/059-lines-may-be-drawn-square-round-or-smooth.md)
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

grafical answers in fixed keys and values, never in sentences of advice. The one sentence it prints is the fixed description of a problem's code. Cost: grafical never says what looks wrong, so the agent judges the picture from the counts.

**Ask:** Could a script read this answer without parsing English?

- **Stance:** [How does an agent learn grafical?](PHILOSOPHY.md#how-does-an-agent-learn-grafical)
- **Decisions:** [022. Records over prose](specs/decisions/022-records-over-prose.md)
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
- **How it works:** [The file formats](specs/file-formats.md)

## 11. Looks are free, while shape and dash follow the kind

A theme or a stylesheet sets any color, a mark may carry any color, emoji, text or file, and a line may take any width from 0.5 to 8 px. A box's shape and a line's dash pattern come from its kind, so that a reader can trust them. The look comes from a theme or a stylesheet that the file names. Cost: two diagrams can look different, the legend has to say what a width or a mark means, and a look a team shares lives in a second file.

**Ask:** Is this a look the agent may choose freely, or a place that must stay a fact?

- **Stance:** [What may the agent set?](PHILOSOPHY.md#what-may-the-agent-set)
- **Decisions:**
  - [025. Marks of any kind](specs/decisions/025-marks-of-any-kind.md)
  - [026. Edge weights](specs/decisions/026-edge-weights.md)
  - [016. Themes and stylesheets](specs/decisions/016-themes-and-stylesheets.md)
  - [028. A legend for widths and marks](specs/decisions/028-a-legend-for-widths-and-marks.md)
  - [034. The legend says only what the agent named](specs/decisions/034-the-legend-says-only-what-the-agent-named.md)
- **How it works:**
  - [The theme](specs/theme.md)
  - [The renderer](specs/rendering.md)

## 12. The command line comes first, and the help is the agent's only reference

Every operation is a command, every command takes `--json`, and every write reports what it changed, so that the agent need not read the diagram again. An agent learns grafical from `grafical --help` and each command's help, and reads a diagram through `show`, never the YAML. An MCP server may wrap the same operations later. Cost: each command is a process start, which a batch spreads over many operations.

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

Every write lays out, routes and checks the whole diagram again ([4. A change moves only what it names](#4-a-change-moves-only-what-it-names)), so no step may search without a bound. Each search, such as trying the prefixes of a refused batch, stops at a fixed limit. Cost: a search that could find a better answer stops at its cap.

**Ask:** Does any step here search without a cap, or grow faster than the diagram?

- **Stance:** [Why are good diagrams rare?](PHILOSOPHY.md#why-are-good-diagrams-rare)
- **Decisions:**
  - [011. The engine picks a new box's slot](specs/decisions/011-the-engine-picks-a-new-box-s-slot.md)
  - [033. The agent states every order](specs/decisions/033-the-agent-states-every-order.md)
  - [047. Refusals say what happened and which commands can change it](specs/decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md)
- **How it works:**
  - [How grafical answers](specs/answers.md)
  - [Placement](specs/placement.md)

## 14. A diagram reads no file outside its folder, and its pictures run nothing

A mark's file must sit inside the diagram's folder, is pinned by its SHA-256, and is embedded in the SVG, never linked. An SVG with a script, an embedded document, an event handler or a reference outside itself is refused. The live viewer listens on 127.0.0.1 only. Cost: diagrams cannot share one icons folder above them, and a diagram cannot be watched from another machine.

**Ask:** Can this read a path outside the folder, run something, or listen beyond this machine?

- **Stance:** none
- **Decisions:** [017. A viewer that only shows](specs/decisions/017-a-viewer-that-only-shows.md)
- **How it works:**
  - [The file formats](specs/file-formats.md)
  - [The renderer](specs/rendering.md)

## 15. Every dependency allows use in an MIT project

grafical is MIT-licensed, so every runtime dependency is MIT, ISC, BSD or MPL-2.0, the fonts are under the SIL Open Font License, and the Twemoji graphics are CC-BY 4.0, which asks for attribution. Cost: LGPL, GPL and EPL libraries are out, such as `libavoid-js` and `elkjs`, whatever they would save.

**Ask:** Does the license of this dependency allow use in an MIT project?

- **Stance:** none
- **Decisions:** [010. TypeScript on Node](specs/decisions/010-typescript-on-node.md)
- **How it works:** [Architecture](specs/ARCHITECTURE.md)

Every other decision, such as how a row without a box is drawn, is in [specs/decisions](specs/decisions/README.md).
