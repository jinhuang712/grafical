# F3: Editing

```
F3: Editing
├── F3.1: Operations — one named command per change
├── F3.2: Trying a change — see counts before writing
├── F3.3: IDs — the caller names every element
├── F3.4: Refusals — a wrong operation is refused with facts
├── F3.5: Merging and swapping — merge, swap and remove nodes
├── F3.6: More combinations of operations — one operation for a common edit
└── F3.7: Move and plug — one verb to move things and one to change connections
```

An agent changes a diagram only through named operations, and grafical checks each one before it writes anything. The agent sends one command at a time, can try a change before making it, and names every element itself. When something is wrong, the write is refused, the file stays as it was, and the refusal says what happened and which commands can change it.

Every failure leaves the file as it was and says what happened, in the block described under [F3.4: Refusals](#f34-refusals).

- **An operation is wrong:** refused with a code, the facts and the commands that can change it ([F3.4: Refusals](#f34-refusals)).
  - The ones about names are in [F3.3: IDs](#f33-ids).
- **The picture would draw wrong:** the write is refused as a defect.
  - `overflow` for a label that does not fit ([F1.1.2: Labels and sublabels](F1-elements.md#f112-labels-and-sublabels)).
  - `label-blocked` for a label with no place ([F2.7: How edges are drawn](F2-layout.md#f27-how-edges-are-drawn), [F1.3.6: Walls](F1-elements.md#f136-walls) and [F1.3.7: Notes](F1-elements.md#f137-notes)).
  - `title-blocked` for a group's label ([F1.3.1: Groups](F1-elements.md#f131-groups)).
- **The picture draws poorly:** written, and reported as a warning ([F5.3: Warnings](F5-checking.md#f53-warnings)).
- **A file cannot be read:** nothing is drawn from it.
  - A line grafical cannot read is `bad-line` with its number.
  - A missing stylesheet fails every command that reads the diagram ([F4.4: A stylesheet of your own](F4-look.md#f44-a-stylesheet-of-your-own)).
  - A file written by a newer grafical is refused rather than guessed at ([F6.1: The diagram file](F6-output.md#f61-the-diagram-file)).
- **A command line is wrong:** a usage error prints a block, and a command that does not exist is refused with the one it most likely means ([F7.1: Help](F7-help.md#f71-help)).

## F3.1: Operations

Every change to a diagram is one named operation, run as a command. The diagram file is `<name>.grafical` by convention.

- **Commands:**
  - [`new`](../CLI.md#new)
  - [`node`](../CLI.md#node)

- On the command line an operation is `grafical -f <file> <noun> --<verb> …`.
  - Every other value is a flag, such as `--label`.
- One command is one write, and a shell chains many commands in one call.
- Every write reports the IDs it changed, then one block for each problem.
  - A block says what the write is refused for, or what the picture draws poorly ([F3.4: Refusals](#f34-refusals) and [F5.3: Warnings](F5-checking.md#f53-warnings)).
  - A refused write changes nothing.
- Every command takes `--json`, which prints the same report as JSON.
- The parser refuses an unknown option, a missing argument and an unknown command.
  - Its refusals print `failed changed=-` and a block on standard error, such as `error: unknown-option` with `found: --bogus`.
  - With `--json` they print the same object as any refusal on standard output.

- **Stance:** [What does a change do?](../PHILOSOPHY.md#what-does-a-change-do)
- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **How it works:**
  - [The command line](../specs/ARCHITECTURE.md#the-command-line)
  - [The model](../specs/model.md)
- **Why:**
  - [001. Operations over whole-file rewrites](../specs/decisions/001-operations-over-whole-file-rewrites.md)
  - [068. A command names its file with a flag](../specs/decisions/068-a-command-names-its-file-with-a-flag.md)
  - [069. One name for each thing, and a name says what it is](../specs/decisions/069-one-name-for-each-thing-and-a-name-says-what-it-is.md)
  - [082. A command's verb is a flag](../specs/decisions/082-a-command-s-verb-is-a-flag.md)
  - [105. One command is one write, and running it twice changes nothing](../specs/decisions/105-one-command-is-one-write-and-running-it-twice-changes-nothing.md)

**Stories:**

- An agent changes a diagram with one named command, to move only what it named.

## F3.2: Trying a change

See what a command would do before making it.

- **Commands:** [Global flags](../CLI.md#global-flags)

Every command that writes takes `--try`, except `new`. It runs the command without writing, and prints the drawing's counts before and after it and a `delta` record of the change in each. The agent decides what to try, and grafical measures.

- A command that the write would refuse is refused the same way.
- With `--json` it prints `{ok, changed, before, after, delta}`.

- **Design:**
  - [3. The engine never chooses for the agent](../DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
  - [8. Answers are data a script can read](../DESIGNS.md#8-answers-are-data-a-script-can-read)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:**
  - [022. Records over prose](../specs/decisions/022-records-over-prose.md)
  - [033. The agent states every order](../specs/decisions/033-the-agent-states-every-order.md)
  - [105. One command is one write, and running it twice changes nothing](../specs/decisions/105-one-command-is-one-write-and-running-it-twice-changes-nothing.md)

**Stories:**

- An agent tries a move with `--try`, to see whether crossings fall before it writes the move.

## F3.3: IDs

The caller names every layer, group, lane, column, wall, node and edge, and a name never changes while the element exists.

- A rename changes the label, never the ID.
- An edge's ID defaults to `<from>-><to>`, with a suffix when the same pair is connected twice.
  - A reversed edge keeps its ID.
- A taken ID is refused, with a free one suggested.

- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **How it works:** [The model](../specs/model.md)
- **Why:** [001. Operations over whole-file rewrites](../specs/decisions/001-operations-over-whole-file-rewrites.md)

**Stories:**

- An agent names every element, to refer to it later without it ever changing.

## F3.4: Refusals

A wrong operation is refused at once, and nothing is written. Each problem is a block: what happened, what caused it, the facts, and the commands that can change it, by name ([047. Refusals say what happened and which commands can change it](../specs/decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md)).

```text
failed changed=-

error: unknown-type
description: No type has the name, or it is a type of another sort of object.
source: grafical -f arch.grafical node --add db --layer storage --label DB --type database
detail:
  field: type
  found: database
  likely: store
  near: -
  allowed: service, store, queue, external, actor, state, terminal, decision, initial, final, choice
next: type --add
```

- The kind is one of three:
  - `error`: the operation could not be read or applied.
  - `defect`: the picture would draw wrong.
  - `warning`: the picture is written but drawn poorly.
- The description is one fixed sentence per code, which says what happened and never what to do.
- The source is one of two:
  - The command line as typed.
  - `already in the file`, for a problem the file had before the command.
- A warning has no source.
- The detail gives the facts, one per line:
  - `near`: the closest IDs.
  - `likely`: the value it most likely meant.
  - `allowed` and `free` and `count` and `edges` and `min` and `max`.
  - The element it concerns: `node` and `layer` and `group` and `edge` and `lane`.
  - `line`: the line of the file that grafical could not read.
- The detail carries what the agent needs to find the change itself, such as the first and last layers a group's frame covers.
  - No refusal writes the change for it.
- `next` names the commands that can change it in the order the help lists them, or `-` when none can.

- **Design:** [7. A refusal gives the facts, and the agent writes the fix](../DESIGNS.md#7-a-refusal-gives-the-facts-and-the-agent-writes-the-fix)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:**
  - [044. One way to a page, and a wrong command names the right one](../specs/decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)
  - [047. Refusals say what happened and which commands can change it](../specs/decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md)

**Stories:**

- An agent that asks for something wrong gets what happened and which commands can change it, to fix it alone.

## F3.5: Merging and swapping

Three operations change which nodes a diagram has or where two of them sit.

- **Commands:** [`node`](../CLI.md#node)

- `merge` replaces nodes with one new node where the first one was.
  - It keeps each of their edges once and drops the edges between them.
  - It may reuse a merged node's ID.
  - Nodes aligned to a merged node lose the alignment.
- `swap` trades the places of two nodes: their layer and place.
- `remove` takes the node's edges with it and reports their IDs.
  - A node that others are placed by steps from stays while they are (`step-anchor`).

- **Design:**
  - [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
  - [3. The engine never chooses for the agent](../DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
- **How it works:** [The model](../specs/model.md)
- **Why:** [013. Curation stays with the agent](../specs/decisions/013-curation-stays-with-the-agent.md)

**Stories:**

- An agent merges nodes or swaps two, to change the picture without redrawing it.

## F3.6: More combinations of operations

One operation for a common edit or a common shape, such as "put a cache between the API and the database".

- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)

**Stories:**

- An agent makes a common edit in one operation, to spend fewer steps.

## F3.7: Move and plug

Two verbs stand above the nouns and take IDs. `move` changes where things sit, and `plug` changes what an edge connects.

- **Commands:**
  - [`move`](../CLI.md#move)
  - [`plug`](../CLI.md#plug)

- `move` takes nodes · layers · groups, and later lanes and columns.
  - Several objects keep their order among themselves.
  - One that cannot move refuses them all.
  - An option that does not fit an object is refused.
- `move` replaces `node --move`, `layer --move` and `group --order`.
- `plug` replaces `edge --ends`, and other objects may take it later.

- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **Why:** [094. `move` and `plug` stand above the nouns](../specs/decisions/094-move-and-plug-stand-above-the-nouns.md)

**Stories:**

- An agent moves several nodes in one command, to rearrange a picture in one step.
