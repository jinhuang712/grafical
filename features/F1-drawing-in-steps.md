# F1: Drawing in steps

```
F1: Drawing in steps
├── F1.1: Operations — one named command per change
├── F1.2: Batches — many operations, all or nothing
├── F1.3: Trying a change — see counts before writing
├── F1.4: IDs — the caller names every element
└── F1.5: Refusals — a wrong operation is refused with facts
```

An agent changes a diagram only through named operations, and grafical checks each one before it writes anything. The agent sends one command or a batch, can try a change before making it, and names every element itself. When something is wrong, the write is refused, the file stays as it was, and the refusal says what happened and which commands can change it.

## F1.1: Operations

Every change to a diagram is one named operation, run as a command. The diagram file is `<name>.grafical.yaml` by convention.

```sh
grafical new arch.grafical.yaml --title "Order flow"
grafical node add arch.grafical.yaml api --layer app --label "Order API" --kind service
```

- On the command line an operation is `grafical <noun> <verb> <file> …`.
  - Every other value is a flag, such as `--label`.
- `grafical new` takes the title and optionally `--subtitle` · `--note` · `--density` · `--sizing` · `--style`.
- Every write reports the IDs it changed, then one block for each problem.
  - A block says what the write is refused for, or what the picture draws poorly ([F1.5: Refusals](#f15-refusals) and [F7.3: Warnings](F7-seeing-the-result.md#f73-warnings)).
  - A refused write changes nothing.
- Every command takes `--json`, which prints the same report as JSON.
- Exit codes:
  - 0 for success.
  - 1 for a refused operation or a defect.
  - 2 for a usage error.
- The parser refuses an unknown option, a missing argument and an unknown command.
  - Its refusals print `failed changed=-` and a block on standard error, such as `error: unknown-option` with `found: --bogus`.

- **Stance:** [What does a change do?](../PHILOSOPHY.md#what-does-a-change-do)
- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **How it works:**
  - [The command line](../specs/ARCHITECTURE.md#the-command-line)
  - [The model](../specs/model.md)
- **Why:** [001. Operations over whole-file rewrites](../specs/decisions/001-operations-over-whole-file-rewrites.md)

**Stories:**

- An agent changes a diagram with one named command, to move only what it named.

## F1.2: Batches

Many operations at once, all or nothing.

```sh
grafical apply arch.grafical.yaml batch.yaml
```

A batch file is a YAML list. Each item has `op: <noun>.<verb>` and the same fields as the command's flags, in camelCase:

```yaml
- {op: node.add, id: cache, layer: storage, label: Redis, kind: store}
- {op: edge.add, from: api, to: cache, label: read}
```

grafical checks each operation in order, and writes only when every one is valid and the picture has no defect the agent must fix. Otherwise nothing changes, and each problem's source names the batch line that caused it.

- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:** [001. Operations over whole-file rewrites](../specs/decisions/001-operations-over-whole-file-rewrites.md)

**Stories:**

- An agent sends many operations in one call, to save round trips and never leave a half-made change.

## F1.3: Trying a change

See what a batch would do before making it.

```sh
grafical try arch.grafical.yaml batch.yaml
```

`try` applies the batch without writing it, and prints the drawing's counts before and after it, and a `delta` record of the change in each. The agent decides what to try, and grafical measures.

`try` takes several batches to compare arrangements in one call.

- It prints one `before` record first.
- Each batch then prints `ok` · `after` · `delta` records that carry `batch=<file>`.
- A batch that would be refused prints `failed batch=<file> changed=-` and its blocks.
  - The other batches are still tried.
  - The exit code is 1.
- With `--json` it prints `{ok, before, batches: [{batch, ok, changed, after, delta}]}`.
- A single batch prints without the `batch` key.

- **Design:**
  - [3. The engine never chooses for the agent](../DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
  - [8. Answers are data a script can read](../DESIGNS.md#8-answers-are-data-a-script-can-read)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:**
  - [033. The agent states every order](../specs/decisions/033-the-agent-states-every-order.md)
  - [022. Records over prose](../specs/decisions/022-records-over-prose.md)

**Stories:**

- An agent compares arrangements with `try`, to pick the one with fewer crossings without writing any.

## F1.4: IDs

The caller names every row, group, lane, column, wall, box and line, and a name never changes while the element exists.

- A rename changes the label, never the ID.
- A line's ID defaults to `<from>-><to>`, with a suffix when the same pair is connected twice.
  - A reversed line keeps its ID.
- A taken ID is refused, with a free one suggested.

- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **How it works:** [The model](../specs/model.md)
- **Why:** [001. Operations over whole-file rewrites](../specs/decisions/001-operations-over-whole-file-rewrites.md)

**Stories:**

- An agent names every element, to refer to it later without it ever changing.

## F1.5: Refusals

A wrong operation is refused at once, and nothing is written. Each problem is a block: what happened, what caused it, the facts, and the commands that can change it, by name ([047. Refusals say what happened and which commands can change it](../specs/decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md)).

```text
failed changed=-

error: bad-value
description: A field holds a value that it does not take.
source: batch.yaml line 4: {op: node.add, id: db, layer: row-store, label: DB, kind: database}
detail:
  field: kind
  found: database
  likely: store
  allowed: service, store, queue, external, actor, state, terminal, decision, initial, final
next: -
```

- The kind is one of three:
  - `error`: the operation could not be read or applied.
  - `defect`: the picture would draw wrong.
  - `warning`: the picture is written but drawn poorly.
- The description is one fixed sentence per code, which says what happened and never what to do.
- The source is one of three:
  - The command line as typed.
  - The batch line and the operation as written.
  - `already in the file`, for a problem the file had before the command.
- A warning has no source.
- A defect found after layout names the batch line that caused it, and so does an error of the whole diagram.
  - grafical finds that line by trying ever shorter prefixes of the batch, back towards the file.
  - The line it names is the one after the last prefix without the problem.
- Where that cannot be known, the source is the batch file alone.
  - A prefix refused for another problem cannot tell.
  - A refused write lays out at most 400 boxes and lines across all the prefixes it tries: 3 prefixes of a diagram of 113.
  - So a problem caused early in a long batch has the batch file as its source, as in a draft.
- The detail gives the facts, one per line:
  - `near`: the closest IDs.
  - `likely`: the value it most likely meant.
  - `allowed` · `free` · `count` · `lines` · `min` · `max`.
  - The element it concerns: `node` · `row` · `group` · `edge` · `lane`.
  - `line` and `column` in the YAML.
- The detail carries what the agent needs to find the change itself, such as the first and last rows a group's box covers.
  - No refusal writes the change for it.
- `next` names the commands that can change it in the order the help lists them, or `-` when none can.
- A YAML syntax error gives the text of its line.

- **Design:** [7. A refusal gives the facts, and the agent writes the fix](../DESIGNS.md#7-a-refusal-gives-the-facts-and-the-agent-writes-the-fix)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:**
  - [047. Refusals say what happened and which commands can change it](../specs/decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md)
  - [044. One way to a page, and a wrong command names the right one](../specs/decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)

**Stories:**

- An agent that asks for something wrong gets what happened and which commands can change it, to fix it alone.

## When something fails

Every failure leaves the file as it was and says what happened, in the block described under [F1.5: Refusals](#f15-refusals).

- **An operation is wrong:** refused with a code, the facts and the commands that can change it ([F1.5: Refusals](#f15-refusals)).
  - The ones about names are in [F1.4: IDs](#f14-ids), and the ones about a whole batch in [F1.2: Batches](#f12-batches).
- **The picture would draw wrong:** the write is refused as a defect.
  - `overflow` for a label that does not fit ([F2.2: Labels and sublabels](F2-boxes.md#f22-labels-and-sublabels)).
  - `label-blocked` for a label with no place ([F3.6: How lines are drawn](F3-lines.md#f36-how-lines-are-drawn), [F5.5: Walls](F5-grouping.md#f55-walls) and [F5.6: Notes](F5-grouping.md#f56-notes)).
  - `title-blocked` for a group's label ([F5.1: Groups](F5-grouping.md#f51-groups)).
- **The picture draws poorly:** written, and reported as a warning ([F7.3: Warnings](F7-seeing-the-result.md#f73-warnings)).
- **A file cannot be read:** nothing is drawn from it.
  - A YAML syntax error gives its line.
  - A missing stylesheet fails every command that reads the diagram ([F8.2: The stylesheet file](F8-files.md#f82-the-stylesheet-file)).
  - A file written by a newer grafical is refused rather than guessed at ([F8.1: The diagram file](F8-files.md#f81-the-diagram-file)).
- **A command line is wrong:** a usage error prints a block and exits 2, and a command that does not exist is refused with the one it most likely means ([F7.8: Help](F7-seeing-the-result.md#f78-help)).
