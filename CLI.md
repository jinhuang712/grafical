# CLI

Agents call grafical, and scripts read what it prints. A person calls `view` and reads the help.

Status: ✅ built · ⬜ planned

A command is a noun and flags, and a verb is a flag that takes the IDs. A call holds one verb. Every command but `library` and `guide` names its file with `-f`.

Every noun takes `--set`, and the nouns with a place or a removal take `--move` and `--remove`:

- `--set <ids>` makes each object whose ID is new and changes only what the flags name on the others.
  - The same command run twice changes nothing the second time.
  - A new object takes its place from the same flags `--move` takes.
  - A place given to an object that exists must already hold, or it is refused as `placed-elsewhere`.
- `--move <ids>` places the objects in the order given.
- `--remove <ids>` removes them.
- `<ids>` is a comma-separated list, and every flag applies to each object.
- `-` gives a flag's attribute back its default, and a switch takes `on` or `off`.
- `--style <styles>` marks styles in four forms: `a,b` marks exactly these · `+a` adds one · `-a` takes one away · `-` clears them.

Each `--set` below lists its flags, and those a new object needs are marked as required.

## Commands

### diagram

**Status:** ✅

`grafical -f <file> diagram --set`

- `--set` makes the file when it is missing and changes the whole diagram.
  - `--title <text>`: the title, required for a new file.
  - `--subtitle <text>`: one sentence under the title.
  - `--caption <text>`: what the picture leaves out, at its foot.
  - `--stylesheet <name>`: a built-in stylesheet or a `<name>.grafical` beside the file (`default` by default).
  - `--style <styles>`: the styles the diagram marks, such as `compact` or `airy`.
  - `--sizing <mode>`: `auto` · `fixed` (`auto` by default).
  - `--lines <lines>`: `square` · `round` (`square` by default).
  - `--title-at <at>`: where the title sits across, from 0 to 1 (the engine's by default).
  - `--title-side <side>`: `top` · `bottom`.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical diagram --set --title "Order flow"` prints `ok` and writes the file.

### layer

**Status:** ✅

`grafical -f <file> layer --<verb> <ids>`

- `--set <ids>`: make layers, or change them.
  - `--label <text>`: its name, drawn only when the layer is drawn.
  - `--look <look>`: `box` · `band`, drawn though no edge ends at it (not drawn by default).
  - `--lane <lane>`: the lane it lies in, when lanes run as layers.
  - `--style <styles>`: the styles it marks.
  - `--first` · `--last` · `--before <layer>` · `--after <layer>`: the place of a new layer (last by default).
- `--move <ids>` with `--first` · `--last` · `--before` · `--after`: move layers.
- `--split <id> <into>` with `--label` · `--from`: move part of a layer into a new layer below it (the second half by default).
- `--remove <ids>`: remove empty layers.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical layer --set app,data` prints `ok changed=app,data`.

### node

**Status:** ✅

`grafical -f <file> node --<verb> <ids>`

- `--set <ids>`: make nodes, or change them.
  - `--label <text>`: the name, required for a new node.
  - `--sublabel <text>`: a second, smaller line.
  - `--type <type>`: a built-in type or one of the diagram's own (`service` by default).
  - `--size <size>`: `s` · `m` · `l` (sized to its text by default).
  - `--emphasis <on|off>`: make it stand out, at most two nodes.
  - `--align <node>`: sit directly above or below that node.
  - `--group <group>`: the group it is in.
  - `--lane <lane>`: the lane it lies in, when lanes run as columns.
  - `--column <column>`: the column it follows.
  - `--style <styles>`: the styles it marks.
  - `--like <node>`: follow another node's look.
  - `--layer <layer>` with `--first` · `--last` · `--before <node>` · `--after <node>`: the place of a new node in a layer.
  - `--from <node>` with `--down` · `--up` · `--left` · `--right <n>`: the place of a new node by steps from another, from 1 to 10.
- `--move <ids>` with the same place flags: move nodes, in the order given.
- `--merge <id>` with `--nodes` · `--label` · `--sublabel` · `--type`: replace nodes with one where the first one was.
- `--remove <ids>`: remove nodes and their edges.

**Status of its planned flags:** ⬜ `--set` with `--width` · `--height` · `--magnified`.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical node --set api --label "Order API" --layer app` prints `ok changed=api`.

### edge

**Status:** ✅

`grafical -f <file> edge --<verb> <ids>`

- `--set <ids>`: make edges, or change them.
  - `--from <end>` · `--to <end>`: a node, a group, a layer or a lane, both required for a new edge.
  - `--label <text>`: the words on it.
  - `--type <type>`: a built-in type or one of the diagram's own (`call` by default).
  - `--weight <weight>`: a level such as `thick` or a width from 0.5 to 8 (`thin` by default).
  - `--both <on|off>`: arrowheads at both ends.
  - `--pass <on|off>`: may pass the bars between its ends.
  - `--out <side>` · `--in <side>`: the side it leaves or enters by (the engine's by default).
  - `--via <object:side>`: pass a node or a group on its left or right, such as `db:left`.
  - `--straight <on|off>`: no bend, or the write is refused.
  - `--with <edge>`: run along that edge's trunk.
  - `--bend-at <at>`: `0.25` · `0.5` · `0.75`, where its longest inner run sits.
  - `--stretch <n>`: `1.25` · `1.5` · `2`, how far a detour reaches.
  - `--number <n>`: a step number from 1 to 99.
  - `--style <styles>`: the styles it marks.
  - `--like <edge>`: follow another edge's look.
- `--remove <ids>`: remove edges.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical edge --set api-db --from api --to db --label writes` prints `ok changed=api-db`.

### group

**Status:** ✅

`grafical -f <file> group --<verb> <ids>`

- `--set <ids>`: make groups, or change them.
  - `--label <text>`: the name, required for a new group.
  - `--sublabel <text>`: a second, quieter part of the label.
  - `--in <group>`: the group it sits inside.
  - `--style <styles>`: the styles it marks.
  - `--like <group>`: follow another group's look.
- `--move <ids>` with `--before` · `--after`: place groups beside a group.
- `--copy <id> <into>` with `--label` · `--suffix` · `--before` · `--after` · `--outside`: copy a group with everything inside it.
- `--remove <ids>` with `--out`: remove groups and keep their members (in the group around them by default).

A node joins a group with `node --set --group`.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical group --set pay --label Payments` prints `ok changed=pay`.

### lane

**Status:** ✅

`grafical -f <file> lane --<verb> <ids>`

- `--set <ids>`: make lanes, or change them.
  - `--label <text>`: who owns what lies in it, required for a new lane.
  - `--style <styles>`: the styles it marks.
  - `--like <lane>`: follow another lane's look.
- `--remove <ids>`: remove lanes and keep what lies in them.

A layer or a node lies in a lane with `layer --set --lane` or `node --set --lane`.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical lane --set team --label Team` prints `ok changed=team`.

### column

**Status:** ✅

`grafical -f <file> column --<verb> <ids>`

- `--set <ids>`: make columns, or change them.
  - `--style <styles>`: the styles it marks.
  - `--first` · `--last` · `--before <column>` · `--after <column>`: the place of a new column (last by default).
- `--move <ids>` with `--first` · `--last` · `--before` · `--after`: move columns.
- `--remove <ids>`: remove columns and keep their nodes.

A node follows a column with `node --set --column`.

**Status of its planned flags:** ⬜ `--set` with `--label`.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical column --set left` prints `ok changed=left`.

### wall

**Status:** ✅

`grafical -f <file> wall --<verb> <ids>`

- `--set <ids>`: make walls, or change them.
  - `--between <ids>` · `--and <ids>`: the nodes and groups of each side, both required for a new wall.
  - `--allow <ids>`: the edges, nodes and groups it lets through, as the whole list.
  - `--label <text>`: the words on its divider (space alone by default).
- `--remove <ids>`: remove walls.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical wall --set w --between web --and db` prints `ok changed=w`.

### note

**Status:** ✅

`grafical -f <file> note --<verb> <ids>`

A note is named by the node, edge or group it is about.

- `--set <ids>`: put notes on objects, or change them.
  - `--text <text>`: a sentence or two, required for a new note.
  - `--footnote <on|off>`: a number on its object and the text at the bottom (a card by default).
  - `--align <align>`: `left` · `center` · `right`, for a card (`left` by default).
- `--remove <ids>`: remove notes.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical note --set api --text "Retries twice"` prints `ok changed=api`.

### label

**Status:** ✅

`grafical -f <file> label --set <ids>`

A label is named by its owner, and its text is the owner's `--label`.

- `--set <ids>`: change how labels look and where they sit.
  - `--style <styles>`: the styles an edge's label marks.
  - `--align <align>`: `left` · `center` · `right` (`center` by default).
  - `--at <at>`: where a group's, a layer's or a lane's label sits along its side, from 0 to 1 (the engine's by default).
  - `--side <side>` · `--place <place>`: a group's label on `top` · `bottom` · `left` · `right`, `inside` · `outside`.
  - `--seat <seat>`: `on` · `beside`, for an edge's label (`on` by default).

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical label --set api --align left` prints `ok changed=api`.

### mark

**Status:** ✅

`grafical -f <file> mark --<verb> <ids>`

A mark is named by its node and slot, such as `api:top-left`.

- `--set <ids>`: put marks on nodes, or change them.
  - `--text <text>` · `--file <file>`: an emoji or a short text, or an `.svg` or `.png` beside the diagram, one of them required for a new mark.
  - `--bg <color>` · `--fg <color>` · `--border <color>`: a text mark's colors.
  - `--shape <shape>`: `square` · `rounded` · `pill` (`rounded` by default).
  - `--size <size>`: `s` · `m` · `l` (`m` by default).
- `--remove <ids>`: take marks off.

**Status of its planned flags:** ⬜ `--set` with a `<set>:<name>` mark.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical mark --set api:top-left --text 🔥` prints `ok changed=api`.

### legend

**Status:** ✅

`grafical -f <file> legend --<verb> <ids>`

An entry is named `style:<line>` for `solid` · `dashed` · `dotted` · `plain`, `weight:<level>` or `mark:<text>`.

- `--set <ids>` with `--text`: say what a line, a width or a mark means, and the text is required.
- `--remove <ids>`: take entries away.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical legend --set style:dashed --text Async` prints `ok changed=legend`.

### type

**Status:** ✅

`grafical -f <file> type --<verb> <ids>`

- `--set <ids>`: make types of the diagram's own, or change them, and a change reaches every object of the type.
  - `--base <base>`: the type it starts from, required for a new type.
  - `--shape <shape>`: `box` · `round` · `pill` · `cylinder` · `diamond` · `small-diamond` · `dot` · `ring`.
  - `--fill <color>` · `--border <color>` · `--border-width <n>` · `--color <color>`: its look (its base's by default).
- `--remove <ids>`: remove types.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical type --set db --base store --fill "#eeeeff"` prints `ok changed=db`.

### style

**Status:** ✅

`grafical -f <file> style --<verb> <ids>`

- `--set <ids>`: make named looks, or change them.
  - `--fill <color>` · `--border <color>` · `--color <color>`: its colors.
  - `--border-width <n>`: from 0.5 to 8.
  - `--margin-top` · `--margin-right` · `--margin-bottom` · `--margin-left <px>`: room on each side, a multiple of 4.
  - `--row-gap <px>` · `--column-gap <px>`: the room between layers and between the nodes of a layer, for the diagram.
- `--move <ids>` with `--before` · `--after`: reorder styles, since the later one wins.
- `--remove <ids>`: remove styles and every mark of them.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical style --set roomy --margin-left 16 --margin-right 16` prints `ok changed=roomy`.

### show

**Status:** ✅

`grafical -f <file> show [id]`

- `--drawn`: how the picture is drawn (the facts by default).

**Called by:** both

**Prints:** the diagram in the words of the operations on stdout, or records with `--drawn`.

**Fails:** a usage error exits 2, and a file that cannot be read exits 1.

**Example:** `grafical -f arch.grafical show` prints `layer app "App": api "Order API" service`.

### check

**Status:** ✅

`grafical -f <file> check`

- `--all`: add the defects the engine owns (off by default).

**Called by:** both

**Prints:** the outcome, one block per problem and the counts on stdout.

**Fails:** a file every write would refuse exits 1, and an engine-owned defect exits 1 under `--all`.

**Example:** `grafical -f arch.grafical check` prints `ok` and the counts.

### render

**Status:** ✅

`grafical -f <file> render`

- `--svg [out]`: write only the SVG (beside the file by default).
- `--png [out]`: write only the PNG (beside the file by default).
- `--scale <n>`: PNG scale from 1 to 4 (2 by default).

**Called by:** both

**Prints:** `ok`, one `wrote file=<f>` record per file, the warnings and the counts on stdout.

**Fails:** a usage error exits 2, and a file that cannot be read exits 1.

**Example:** `grafical -f arch.grafical render --png arch.png` prints `wrote file=arch.png`.

### diff

**Status:** ✅

`grafical -f <file> diff [rev]`

The revision is `HEAD` by default.

**Called by:** both

**Prints:** one command line per change on stdout, or `# no changes`, and a shell that runs them in order on the revision's file gives the file on disk.

**Fails:** a file outside git is `not-in-git` and exits 1.

**Example:** `grafical -f arch.grafical diff HEAD~1` prints `grafical -f arch.grafical edge --set api-cache --from api --to cache --label reads --type call`.

### view

**Status:** ✅

`grafical -f <file> view`

- `--port <n>`: the local port (a free one by default).
- `--no-open`: print the address and open no window (opens a window by default).

**Called by:** a person

**Prints:** the address on stdout, and it runs until Ctrl-C.

**Fails:** a usage error exits 2.

**Example:** `grafical -f arch.grafical view --no-open` prints the address on 127.0.0.1.

### library

**Status:** ✅

`grafical library [word]`

**Called by:** both

**Prints:** one `stylesheet name=<name> about=<text>` record per built-in stylesheet on stdout, those whose name or look holds the word when one is given, or `stylesheet -` when none does.

**Fails:** a usage error exits 2.

**Example:** `grafical library dark` prints `stylesheet name=dark about="Light lines on a dark ground."`.

### guide

**Status:** ✅

`grafical guide [name]`

**Called by:** both

**Prints:** the list of guides or one guide on stdout.

**Fails:** an unknown name is `unknown-guide` and exits 2.

**Example:** `grafical guide composition` prints that guide.

## Global flags

- `-f` · `--file <file>`: the diagram file, ahead of the command, and it is required.
- `--json`: print the answer as one JSON object (off by default).
- `--try`: print `ok changed=<ids> written=no` and the `before` · `after` · `delta` counts without writing (off by default).
  - Every command that writes takes it.
- `-h` · `--help`: print the page of a command (off by default).

`--json` is on every command but `view`, `library` and `guide`.

## Exit codes

- 0: it succeeded, with warnings or without.
- 1: a write was refused or a file could not be read.
- 2: a usage error.

Engine-owned defects exit 1 under `check --all` only.

## Output formats

A command prints in this order:

```text
ok changed=<ids>          or  ok  (nothing changed)  or  failed changed=-
<records the command adds, such as render's  wrote file=<f>>

<kind>: <code>            one block per problem, a blank line before each
description: <the code's one sentence>
source: <what caused it>
detail:
  <key>: <value>
next: <command names>

counts nodes=... edges=... ...   check and render only
```

A usage error prints the same outcome and block on stderr, or on stdout with `--json`.

**JSON:** the same answer is `{ok, changed, problems, counts}`, with each problem as `{kind, code, description, source, detail, next}`.

- A usage error gives the same object without counts.
- `render` adds `files`.
- `show` gives `{ok, diagram}`.
- `show --drawn` gives `{ok, drawing}`.
- `diff` gives `{ok, commands}`.
- `--try` gives `{ok, changed, before, after, delta}`.

**Records:** a record is one line: a word that names it, then `key=value` fields in the logfmt style.

- A record with no fields is its name alone, such as `ok`.
- A value that holds a space, a quote or `=` is quoted as JSON.
- A list is comma separated, and `-` stands for none.
- A count by name is `name:n`.
- The keys are the JSON's fields under the same names.

`show --drawn` prints `counts`, then one record for each `node`, `group`, `wall`, `note`, `edge`, `gutter` and `legend` entry. An `edge` record gives `id`, `from`, `to`, `leaves`, `enters`, `bends`, `length`, `direct`, `detour`, `skip`, `crosses`, `passes`, `bundle`, and `step` when the edge has one.

**Blocks:** a problem is an `error`, which could not be read or applied, a `defect`, which would draw wrong, or a `warning`, which is drawn poorly.

- `<kind>: <code>` names the kind of problem.
- `description:` is the code's one fixed sentence, and it says what happened and never what to do.
- `source:` says what caused it, and a warning has none.
- `detail:` holds the facts one per line, or `detail: -` when there are none.
- `next:` names the commands that can change it in the order the help lists them, or `-`.

The detail starts with `field` and `found`, or `owner` for a defect, and the other facts follow in one fixed order. An empty value or list prints `-`, and a fact that is absent is left out. A key for several things holds a list even of one: `likely`, `near`, `edges`, `ends`, `nodes`, `layers`, `groups`, `lanes`, `between`, `across`, `chain`, `clear`, `gutters`, `allowed`, `takes` and `chars`.

**Source:** the source is the command line as typed, or `already in the file`.

## Environment

grafical reads no environment variable of its own.
