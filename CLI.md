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
- ⬜ Every flag of `style --set` is also a flag of `--set` on each noun it fits, such as `node --set api --fill "#fdd"`, and a value set on the object beats its styles.

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

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical diagram --set --title "Order flow"` prints `WRITTEN` and `MADE diagram`.

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

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical layer --set app,data` prints `WRITTEN` with `MADE layer=app` and `MADE layer=data`.

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

**Called by:** both

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical node --set api --label "Order API" --layer app` prints `WRITTEN` and `MADE node=api`.

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

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical edge --set api-db --from api --to db --label writes` prints `WRITTEN` and `MADE edge=api-db`.

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

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical group --set pay --label Payments` prints `WRITTEN` and `MADE group=pay`.

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

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical lane --set team --label Team` prints `WRITTEN` and `MADE lane=team`.

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

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical column --set left` prints `WRITTEN` and `MADE column=left`.

### wall

**Status:** ✅

`grafical -f <file> wall --<verb> <ids>`

- `--set <ids>`: make walls, or change them.
  - `--between <ids>` · `--and <ids>`: the nodes and groups of each side, both required for a new wall.
  - `--allow <ids>`: the edges, nodes and groups it lets through, as the whole list.
  - `--label <text>`: the words on its divider (space alone by default).
- `--remove <ids>`: remove walls.

**Called by:** both

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical wall --set w --between web --and db` prints `WRITTEN` and `MADE wall=w`.

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

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical note --set api --text "Retries twice"` prints `WRITTEN` and `MADE note=api`.

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

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical label --set api --align left` prints `WRITTEN` and `CHANGED label=api fields=align`.

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

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical mark --set api:top-left --text 🔥` prints `WRITTEN` and `MADE mark=api:top-left`.

### legend

**Status:** ✅

`grafical -f <file> legend --<verb> <ids>`

An entry is named `style:<line>` for `solid` · `dashed` · `dotted` · `plain`, `weight:<level>` or `mark:<text>`.

- `--set <ids>` with `--text`: say what a line, a width or a mark means, and the text is required.
- `--remove <ids>`: take entries away.

**Called by:** both

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical legend --set style:dashed --text Async` prints `WRITTEN` and `MADE legend=style:dashed`.

### type

**Status:** ✅

`grafical -f <file> type --<verb> <ids>`

- `--set <ids>`: make types of the diagram's own, or change them, and a change reaches every object of the type.
  - `--base <base>`: the type it starts from, required for a new type.
  - `--shape <shape>`: `box` · `round` · `pill` · `cylinder` · `diamond` · `small-diamond` · `dot` · `ring`.
  - `--fill <color>` · `--border <color>` · `--border-width <n>` · `--color <color>`: its look (its base's by default).
- `--remove <ids>`: remove types.

**Called by:** both

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical type --set db --base store --fill "#eeeeff"` prints `WRITTEN` and `MADE type=db`.

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

**Status of its planned flags:** ⬜ `--set` with `--size` · `--width` · `--height`, the last two 0.75 · 1.25 · 1.5 · 2 times a node's size.

**Called by:** both

**Prints:** the answer on stdout: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, then its sections.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical style --set roomy --margin-left 16 --margin-right 16` prints `WRITTEN` and `MADE style=roomy`.

### show

**Status:** ✅

`grafical -f <file> show [id]`

- `--drawn`: how the picture is drawn (the facts by default).

**Called by:** both

**Prints:** `OK` and a `<diagram>` section in the words of the operations on stdout, an `<object>` section for one ID, or a `<drawing>` section of records with `--drawn`.

**Fails:** a usage error exits 2, and a file that cannot be read exits 1.

**Example:** `grafical -f arch.grafical show` prints `layer app "App": api "Order API" service`.

### check

**Status:** ✅

`grafical -f <file> check`

- `--all`: add the defects the engine owns (off by default).

**Called by:** both

**Prints:** `OK`, or `REFUSED` when it finds an error or a defect, then `<counts>` and every problem in `<problems>` on stdout.

**Fails:** a file every write would refuse exits 1, and an engine-owned defect exits 1 under `--all`.

**Example:** `grafical -f arch.grafical check` prints `OK` and a `<counts>` section.

### render

**Status:** ✅

`grafical -f <file> render`

- `--svg [out]`: write only the SVG (beside the file by default).
- `--png [out]`: write only the PNG (beside the file by default).
- `--scale <n>`: PNG scale from 1 to 4 (2 by default).

**Called by:** both

**Prints:** `OK`, then `<files>` with one path per file, `<counts>` and every warning in `<problems>` on stdout.

**Fails:** a usage error exits 2, and a file that cannot be read or that holds a defect the agent owns is `REFUSED`, exits 1 and writes no file.

**Example:** `grafical -f arch.grafical render --png arch.png` prints `OK` and `arch.png` in its `<files>` section.

### diff

**Status:** ✅

`grafical -f <file> diff [rev]`

The revision is `HEAD` by default.

**Called by:** both

**Prints:** one command line per change on stdout, or `# no changes`. A shell that runs them in order on the revision's file gives the file on disk, unless a picture in between would draw wrong and its line is refused.

**Fails:** a file outside git is `not-in-git` and exits 1.

**Example:** `grafical -f arch.grafical diff HEAD~1` prints `grafical -f arch.grafical edge --set api-cache --from api --to cache --label reads --type call`.

### view

**Status:** ✅

`grafical -f <file> view`

- `--port <n>`: the local port (a free one by default).
- `--no-open`: print the address and open no window (opens a window by default).

**Called by:** a person

**Prints:** `OK` and an `<address>` section on stdout, and it runs until Ctrl-C.

**Fails:** a usage error exits 2.

**Example:** `grafical -f arch.grafical view --no-open` prints the address on 127.0.0.1.

### library

**Status:** ✅

`grafical library [word]`

**Called by:** both

**Prints:** `OK` and a `<stylesheets>` section on stdout, with one `stylesheet name=<name> about=<text>` record per built-in stylesheet, those whose name or look holds the word when one is given, or `stylesheet -` when none does.

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
- `--try`: answer `TRIED` with the `<changes>` it would make and the `<before>` · `<after>` · `<delta>` counts, and write nothing (off by default).
  - Every command that writes takes it.
- `-h` · `--help`: print the page of a command (off by default).

`--json` is on every command but `view`, `library` and `guide`.

## Exit codes

- 0: it succeeded, with warnings or without.
- 1: `REFUSED`, since a write, a check or a render was refused or a file could not be read.
- 2: a usage error.

Engine-owned defects exit 1 under `check --all` only.

## Output formats

Every answer but the help, `guide` and `diff` is one keyword alone on its first line, then sections in this order, each in tags and left out when empty:

```text
WRITTEN · UNCHANGED · TRIED · REFUSED · OK
<changes>                  MADE · CHANGED fields= · REMOVED, and by= for a consequence
<warnings>                 new= cleared= total=, then a CLEARED line for each warning gone
<before> <after> <delta>   --try only
<files>                    render only
<counts>                   check and render only
<diagram> <object> <drawing> <stylesheets> <address>   what a command that reads prints
<problems>                 one block per problem
```

A section's content is indented two spaces, and each level inside it two more. A write lists only the warnings it brought, while `check` and `render` list every warning. A usage error prints its answer on stderr. `diff` prints plain command lines that a shell replays.

```text
WRITTEN
<changes>
  REMOVED node=db
  REMOVED edge=api-db by=node:db
</changes>
<warnings>
  new=1 cleared=0 total=1
</warnings>
<problems>
  WARNING lonely-node
    description: No edge reaches a node: none of its own, and none to its group, layer or lane.
    source: grafical -f arch.grafical node --remove db
    detail:
      node: api
    next: node --remove, edge --set
</problems>
```

**Keywords:**

| Keyword | Means |
|---|---|
| `WRITTEN` | the file was written |
| `UNCHANGED` | what the command asks already holds |
| `TRIED` | `--try` measured the command |
| `REFUSED` | nothing was written, and `<problems>` says why |
| `OK` | a command that only reads succeeded |
| `MADE` · `CHANGED` · `REMOVED` | what happened to one object |
| `CLEARED` | a warning the write took away |
| `ERROR` · `DEFECT` · `WARNING` | the kind of a problem |

**JSON:** `--json` gives the same answer as one object, with a key for each section that applies: `outcome` · `changes` · `warnings` · `before` · `after` · `delta` · `files` · `counts` · `problems`, and the section a read prints.

- `changes` is `[{action, sort, id, fields, by}]`.
- `warnings` is `{new, cleared, total}`.
- Each problem is `{kind, code, description, source, detail, next}`.
- Keywords keep their capitals, such as `"outcome": "WRITTEN"`.
- `diff` gives `{outcome, commands}`.

**Records:** a record is one line of `key=value` fields in the logfmt style, after its keyword where it has one.

- A value that holds a space, a quote or `=` is quoted as JSON.
- A list is comma separated, and `-` stands for none.
- A count by name is `name:n`.
- The keys are the JSON's fields under the same names.

`show --drawn` prints in its `<drawing>` section `counts`, then one record for each `node`, `group`, `wall`, `note`, `edge`, `gutter` and `legend` entry. An `edge` record gives `id`, `from`, `to`, `leaves`, `enters`, `bends`, `length`, `direct`, `detour`, `skip`, `crosses`, `passes`, `bundle`, and `step` when the edge has one.

**Blocks:** a problem is an `ERROR`, which could not be read or applied, a `DEFECT`, which would draw wrong, or a `WARNING`, which is drawn poorly.

- `<KIND> <code>` names the kind of problem.
- `description:` is the code's one fixed sentence, and it says what happened and never what to do.
- `source:` says what caused it.
- `detail:` holds the facts one per line, or `detail: -` when there are none.
- `next:` names the commands that can change it in the order the help lists them, or `-`.

The detail starts with `field` and `found`, or `owner` for a defect, and the other facts follow in one fixed order. An empty value or list prints `-`, and a fact that is absent is left out. A key for several things holds a list even of one: `likely`, `near`, `edges`, `ends`, `nodes`, `layers`, `groups`, `lanes`, `between`, `across`, `chain`, `clear`, `gutters`, `allowed`, `takes` and `chars`.

**Source:** the source is the command line as typed, or `already in the file`. A warning a write brought takes the command, and every warning `check` and `render` print takes `already in the file`.

## Environment

grafical reads no environment variable of its own.
