# CLI

Agents call grafical, and scripts read what it prints. A person calls `view` and reads the help.

Status: ✅ built · ⬜ planned

A command is a noun and flags, and a verb is a flag that takes the ID. A call holds one verb. Every command but `guide` names its file with `-f`.

## Commands

### new

**Status:** ✅

`grafical -f <file> new --title <text>`

| Flag | Means | Default |
|---|---|---|
| `--title <text>` | the title | required |
| `--subtitle <text>` | one sentence under the title | none |
| `--caption <text>` | what the picture leaves out | none |
| `--density <density>` | `compact` · `normal` · `airy` | `normal` |
| `--sizing <sizing>` | `auto` · `fixed` | `auto` |
| `--style <style>` | a theme or a stylesheet | `default` |

**Called by:** both

**Prints:** the outcome on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical new --title "Order flow"` prints `ok` and writes the file.

### layer

**Status:** ✅

`grafical -f <file> layer --<verb> <id>`

| Flag | Means | Default |
|---|---|---|
| `--add <id>` with `--label` · `--before` · `--after` | add a layer | at the bottom |
| `--label <id>` with `--label` | change its label | required |
| `--look <id> [box\|band]` | draw it | clears the look |
| `--label-at <id> [at]` | where its label sits along its head | the engine's |
| `--move <id>` with `--first` · `--last` · `--before` · `--after` | move it | required |
| `--split <id> <into>` with `--label` · `--from` | move part of it into a new layer | the second half |
| `--remove <id>` | remove an empty layer | none |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical layer --add app --label App` prints `ok changed=app`.

### node

**Status:** ✅

`grafical -f <file> node --<verb> <id>`

| Flag | Means | Default |
|---|---|---|
| `--add <id>` with `--layer` · `--label` · `--type` · `--sublabel` · `--size` · `--first` · `--last` · `--before` · `--after` · `--align` · `--emphasis` | add a node to a layer | `service` |
| `--add <id>` with `--from` · `--down` · `--up` · `--left` · `--right` | add a node by steps from another | none |
| `--move <id>` with `--layer` · `--first` · `--last` · `--before` · `--after` · `--from` · `--down` · `--up` · `--left` · `--right` | move a node | none |
| `--label <id>` with `--label` | change its label | required |
| `--sublabel <id>` with `--text` | set its sublabel | clears it |
| `--size <id>` with `--size` | `s` · `m` · `l` | sized to its text |
| `--emphasis <id>` with `--off` | make it stand out | on |
| `--mark <id>` with `--slot` · `--mark` · `--bg` · `--fg` · `--border` · `--shape` · `--size` | put a mark in a slot | clears the slot |
| `--align <id>` with `--to` | sit above or below a node | clears it |
| `--swap <a> <b>` | trade places | none |
| `--merge <id>` with `--nodes` · `--label` · `--sublabel` · `--type` | replace nodes with one | none |
| `--type <id> [type]` | give it a type | its built-in type |
| `--style <id> [styles...]` | mark styles | clears them |
| `--like <id> [like]` | follow another's look | lets go |
| `--remove <id>` | remove it and its edges | none |

**Status of its planned flags:** ⬜ `--size` with `--width` · `--height` · `--magnified`, and ⬜ `--mark` with a `<set>:<name>` value.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical node --add api --label "Order API" --layer app` prints `ok changed=api`.

### edge

**Status:** ✅

`grafical -f <file> edge --<verb> <id>`

| Flag | Means | Default |
|---|---|---|
| `--add <from> <to>` with `--id` · `--label` · `--type` · `--both` · `--pass` | connect two ends | ID `<from>-><to>` |
| `--label <id>` with `--label` | set its label | clears it |
| `--label-at <id> <seat>` | `on` · `beside` | `on` |
| `--side <id>` with `--out` · `--in` | the side it leaves or enters by | the engine's |
| `--weight <edges...>` with `--weight` | a level or a width | `thin` |
| `--both <id>` with `--off` | arrowheads at both ends | on |
| `--via <id> [object]` with `--side` | what it passes | the engine's |
| `--straight <id>` with `--off` | no bend | on |
| `--main <id>` with `--off` | the main flow | on |
| `--with <id> [with]` | share a trunk | its own way |
| `--bend <id>` with `--at` | where its longest inner run sits | the engine's |
| `--stretch <id>` with `--magnified` | how far a detour reaches | the engine's |
| `--pass <id>` with `--off` | pass the bars between its ends | on |
| `--number <id>` with `--n` | a step number | clears it |
| `--reverse <id>` | swap its direction | none |
| `--type <id> [type]` | give it a type | its built-in type |
| `--style <id> [styles...]` | mark styles | clears them |
| `--like <id> [like]` | follow another's look | lets go |
| `--remove <id>` | remove it | none |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical edge --add api db --label writes` prints `ok changed=api->db`.

### plug

**Status:** ✅

`grafical -f <file> plug <id>`

| Flag | Means | Default |
|---|---|---|
| `--from <end>` | a new start | stays |
| `--to <end>` | a new end | stays |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical plug api->db --to cache` prints `ok changed=api->db`.

### move

**Status:** ⬜

`grafical -f <file> move <id...>`

| Flag | Means | Default |
|---|---|---|
| `--layer <layer>` | the layer | stays |
| `--first` · `--last` · `--before <id>` · `--after <id>` | the place | required |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical move db --first` prints `ok changed=db`.

### group

**Status:** ✅

`grafical -f <file> group --<verb> <id>`

| Flag | Means | Default |
|---|---|---|
| `--add <id>` with `--label` · `--sublabel` · `--nodes` · `--in` | add a group | none |
| `--join <group> <nodes...>` | put members in | none |
| `--leave <nodes...>` with `--up` | take members out | every group |
| `--label <id>` with `--label` | change its label | required |
| `--sublabel <id>` with `--text` | set its sublabel | clears it |
| `--label-at <id> [at]` with `--side` · `--place` | where its label sits | the engine's |
| `--order <id>` with `--before` · `--after` | place it beside a group | required |
| `--copy <id> <into>` with `--label` · `--suffix` · `--before` · `--after` · `--outside` | copy it | none |
| `--style <id> [styles...]` | mark styles | clears them |
| `--like <id> [like]` | follow another's look | lets go |
| `--remove <id>` with `--out` | remove it and keep its members | into the group around it |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical group --add pay --label Payments --nodes api` prints `ok changed=pay,api`.

### lane

**Status:** ✅

`grafical -f <file> lane --<verb> <id>`

| Flag | Means | Default |
|---|---|---|
| `--add <id>` with `--label` · `--members` | add a lane | none |
| `--join <lane> <members...>` | put members in | none |
| `--leave <members...>` | take members out | none |
| `--label <id>` with `--label` | change its label | required |
| `--label-at <id> [at]` | where its label sits along its head | the engine's |
| `--style <id> [styles...]` | mark styles | clears them |
| `--like <id> [like]` | follow another's look | lets go |
| `--remove <id>` | remove it and keep its members | none |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical lane --add team --label Team --members app` prints `ok changed=team,app`.

### column

**Status:** ✅

`grafical -f <file> column --<verb> <id>`

| Flag | Means | Default |
|---|---|---|
| `--add <id>` with `--nodes` · `--before` · `--after` | add a column | last |
| `--join <column> <members...>` | put members in | none |
| `--leave <members...>` | take members out | none |
| `--remove <id>` | remove it and keep its nodes | none |

**Status of its planned flags:** ⬜ `--add` with `--label`, and ⬜ `--label <id>` with `--label`.

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical column --add left --nodes api,db` prints `ok changed=left,api,db`.

### wall

**Status:** ✅

`grafical -f <file> wall --<verb> <id>`

| Flag | Means | Default |
|---|---|---|
| `--add <id>` with `--between` · `--and` · `--allow` · `--label` | add a wall | none |
| `--allow <id> <allow...>` with `--off` | let edges through | on |
| `--label <id>` with `--label` | set the words on its divider | space alone |
| `--remove <id>` | remove it | none |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical wall --add w --between web --and db` prints `ok changed=w`.

### note

**Status:** ✅

`grafical -f <file> note --<verb>`

| Flag | Means | Default |
|---|---|---|
| `--add` with `--on` · `--text` · `--footnote` | add a note | a card |
| `--align <on> <align>` | `left` · `center` · `right` | `left` |
| `--remove` with `--on` | remove a note | none |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical note --add --on api --text "Retries twice"` prints `ok changed=api`.

### label

**Status:** ✅

`grafical -f <file> label --<verb> <id>`

| Flag | Means | Default |
|---|---|---|
| `--style <id> [styles...]` | mark styles on an edge's label | clears them |
| `--align <id> <align>` | `left` · `center` · `right` | `center` |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical label --align api left` prints `ok changed=api`.

### gap

**Status:** ✅

`grafical -f <file> gap --between <a> <b>`

| Flag | Means | Default |
|---|---|---|
| `--magnified <n>` | `1.25` · `1.5` · `2` | back to the default gap |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical gap --between app data --magnified 1.5` prints `ok changed=app,data`.

### type

**Status:** ✅

`grafical -f <file> type --<verb> <id>`

| Flag | Means | Default |
|---|---|---|
| `--add <id>` with `--base` · `--shape` · `--fill` · `--border` · `--border-width` · `--color` | define or change a type | none |
| `--remove <id>` | remove it | none |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical type --add db --base store --fill #eef` prints `ok changed=db`.

### style

**Status:** ✅

`grafical -f <file> style --<verb> <id>`

| Flag | Means | Default |
|---|---|---|
| `--add <id>` with `--fill` · `--border` · `--border-width` · `--color` | name or change a look | none |
| `--remove <id>` | remove it and every mark of it | none |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical style --add danger --border #c00` prints `ok changed=danger`.

### diagram

**Status:** ✅

`grafical -f <file> diagram --<verb>`

| Flag | Means | Default |
|---|---|---|
| `--title` with `--text` | change the title | required |
| `--subtitle` with `--text` | set the subtitle | clears it |
| `--caption` with `--text` | set the caption | clears it |
| `--label-at [at]` with `--side` | where the title sits | the engine's |
| `--density <density>` | `compact` · `normal` · `airy` | `normal` |
| `--sizing <mode>` | `auto` · `fixed` | `auto` |
| `--style [style]` | a theme or a stylesheet | `default` |
| `--lines <lines>` | `square` · `round` | `square` |
| `--legend [style]` with `--weight` · `--mark` · `--text` | name a style, a width or a mark | takes the entry away |

**Called by:** both

**Prints:** the outcome and one block per problem on stdout.

**Fails:** a usage error exits 2, and a refused write exits 1.

**Example:** `grafical -f arch.grafical diagram --density airy` prints `ok changed=density`.

### apply

**Status:** ✅

`grafical -f <file> apply <batch.yaml>`

A batch named `-` comes from standard input.

**Called by:** both

**Prints:** the outcome, one block per problem and the counts on stdout.

**Fails:** a usage error exits 2, and a refused batch exits 1 and writes nothing.

**Example:** `grafical -f arch.grafical apply batch.yaml` prints `ok changed=cache` and the counts.

### try

**Status:** ✅

`grafical -f <file> try <batch...>`

**Called by:** both

**Prints:** `before`, `after` and `delta` records on stdout, and writes nothing.

**Fails:** a usage error exits 2, and any refused batch exits 1 while the others are still tried.

**Example:** `grafical -f arch.grafical try a.yaml b.yaml` prints one `before`, then the records of each batch keyed by `batch=<file>`.

### show

**Status:** ✅

`grafical -f <file> show [id]`

| Flag | Means | Default |
|---|---|---|
| `--drawn` | how the picture is drawn | the facts |

**Called by:** both

**Prints:** the diagram in the words of the operations on stdout, or records with `--drawn`.

**Fails:** a usage error exits 2, and a file that cannot be read exits 1.

**Example:** `grafical -f arch.grafical show` prints `layer app "App": api "Order API" service`.

### check

**Status:** ✅

`grafical -f <file> check`

| Flag | Means | Default |
|---|---|---|
| `--all` | add the defects the engine owns | off |

**Called by:** both

**Prints:** the outcome, one block per problem and the counts on stdout.

**Fails:** a file every write would refuse exits 1, and an engine-owned defect exits 1 under `--all`.

**Example:** `grafical -f arch.grafical check` prints `ok` and the counts.

### render

**Status:** ✅

`grafical -f <file> render`

| Flag | Means | Default |
|---|---|---|
| `--svg [out]` | write only the SVG | beside the file |
| `--png [out]` | write only the PNG | beside the file |
| `--scale <n>` | PNG scale from 1 to 4 | 2 |

**Called by:** both

**Prints:** `ok`, one `wrote file=<f>` record per file, the warnings and the counts on stdout.

**Fails:** a usage error exits 2, and a file that cannot be read exits 1.

**Example:** `grafical -f arch.grafical render --png arch.png` prints `wrote file=arch.png`.

### diff

**Status:** ✅

`grafical -f <file> diff [rev]`

The revision is `HEAD` by default.

**Called by:** both

**Prints:** a batch of operations on stdout, which `apply` replays on the revision's file.

**Fails:** a file outside git is `not-in-git` and exits 1.

**Example:** `grafical -f arch.grafical diff HEAD~1` prints one operation per line.

### view

**Status:** ✅

`grafical -f <file> view`

| Flag | Means | Default |
|---|---|---|
| `--port <n>` | the local port | a free one |
| `--no-open` | print the address and open no window | opens a window |

**Called by:** a person

**Prints:** the address on stdout, and it runs until Ctrl-C.

**Fails:** a usage error exits 2.

**Example:** `grafical -f arch.grafical view --no-open` prints the address on 127.0.0.1.

### guide

**Status:** ✅

`grafical guide [name]`

**Called by:** both

**Prints:** the list of guides or one guide on stdout.

**Fails:** an unknown name is `unknown-guide` and exits 2.

**Example:** `grafical guide composition` prints that guide.

## Global flags

| Flag | Means | Default |
|---|---|---|
| `-f` · `--file <file>` | the diagram file, ahead of the command | required |
| `--json` | print the answer as one JSON object | off |
| `-h` · `--help` | print the page of a command | off |

`--json` is on every command but `view` and `guide`.

## Exit codes

| Code | Means |
|---|---|
| 0 | it succeeded, with warnings or without |
| 1 | a write was refused or a file could not be read |
| 2 | a usage error |

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

counts nodes=... edges=... ...   apply, check and render only
```

A usage error prints the same outcome and block on stderr, or on stdout with `--json`.

**JSON:** the same answer is `{ok, changed, problems, counts}`, with each problem as `{kind, code, description, source, detail, next}`.

- A usage error gives the same object without counts.
- `render` adds `files`.
- `show` gives `{ok, diagram}`.
- `show --drawn` gives `{ok, drawing}`.
- `diff` gives `{ok, ops}`.
- `try` gives its before, after and delta.

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

**Source:** the source takes one of four forms:

- The command line as typed.
- `<batch file> line <n>: <the operation as written>`.
- `already in the file`.
- The batch file alone where the line cannot be known.

With `--json`, a problem an operation caused carries the operation's index as `detail.op`.

## Environment

grafical reads no environment variable of its own.
