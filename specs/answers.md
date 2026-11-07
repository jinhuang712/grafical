# How grafical answers

The reader of grafical's answers is an agent, and often a script around it. So everything grafical prints about a diagram is a record a script can read: an outcome, a block for each problem, and facts and counts. The only sentences are each code's fixed description, and the help, which is documentation. The answer says what happened and which commands can change it, and leaves the change to the agent. The command line builds every answer, from the records the other parts return. It lives in `src/cli/`.

## What it prints

Every command builds its answer from the same parts: the outcome, a block per problem, then the records the command adds. The descriptions live in one table in `src/cli/problems.ts`, and a test holds each code to one sentence of at most 140 characters. A code that is both an error and a defect has one sentence. A code with several cases has a list of commands for each, such as `label-blocked` for an edge or a wall or a note, and a test holds every name to a real command.

No block writes the change for the agent: there is no fix, and `next` names commands without ids or values. The detail carries what the agent needs to find the change itself, such as the first and last layers a group's frame covers.

A word grafical does not know is answered with the word it most likely means, as a value. `grafical help apply` gives `found: help` and `likely: --help`. `grafical "node add" --help` and `grafical node.add --help` give `likely: node --add`, and `grafical nodee add --help` gives `found: nodee` and `likely: node`. A word is near a name when at most a third of its letters differ, or one.

## Where a problem comes from

The source takes one of four forms:

- The command line as typed for a single command, quoted as a shell would need it.
- `<batch file> line <n>: <the operation as written>` for an operation of a batch, with `<n>` the line it starts on from 1.
  - A YAML error gives the text of its line instead.
- `already in the file` for a problem the file had before the command.
- The batch file alone where the line cannot be known, or the command line when there is no batch.

With `--json`, a problem that an operation caused carries the operation's index as `detail.op`.

An error of one operation knows its operation. Some problems are found only in the diagram the whole batch makes: an error of the whole diagram, which the model's checks find once every operation has run, and a defect the agent owns. For those, a refused write or a refused `try` looks for the operation that caused the problem. It tries ever shorter prefixes of the batch, back towards the file, each prefix once for all the problems. A problem's edge is the one after the longest prefix that does not have it, and when every prefix has it, the source is `already in the file`.

```text
batch  op1 op2 op3 op4 op5
                       ▲ problem first appears with op4 → source: edge of op4
prefixes tried:  1..4  1..3  1..2  1  (none)
```

A prefix that is refused for another problem cannot tell whether this one is there: a whole diagram's checks stop at the first that fails, and a refused diagram is not laid out. So the scan stops there, and the source is the batch file alone. There is one exception for errors: the checks of the whole diagram run in turn, so a prefix refused by a later check than the one that finds the problem passed that one, and is without the problem.

The scan may lay out at most 400 nodes and edges in all. It counts each prefix at the size of the file's diagram for an error, and at the larger of the file's and the batch's for a defect. So it tries `min(12, max(1, floor(400 / size)))` prefixes: 3 for a diagram of 113 nodes and edges, 10 for 37. A new file's empty prefix costs nothing. A write that succeeds runs no scan.

## Trying a change

`grafical try` runs the path of a write but does not write the file. With one batch it prints `ok changed=... written=no`, then `before`, `after` and `delta` records of the counts. With several it prints one `before`, from the first batch that succeeds, then for each batch either `ok`, `after` and `delta` records keyed by `batch=<file>`, or `failed batch=<file> changed=-` and its blocks. Every batch is tried, and the exit code is 1 when any is refused.

## The help and the guides

The help is the agent's only reference. `grafical --help` is the entry page, `grafical <group> --help` a group's page, and `grafical <command> --help` a command's page, so every page is at most two hops from the entry page. There is no `help` command: the word `help` is answered as an unknown command with `likely: --help`. Every page is printed at 80 columns, so it is the same text on every terminal.

A command's page starts with its usage, its paragraph, its arguments and its options. A command that is an operation then shows its line in a batch, built from the operation's schema, so the page and the batch cannot disagree. Then come the sections the page has, always in this order: When to use, Kinds, Good to know, Common mistakes, Limits, Batch file, Output, See also and Example. No page says what a refusal means: the block says it. A test applies the example of `apply --help` as printed, and no size limit is tested, only the 80 columns.

The guides say how common kinds of diagram are usually drawn: architecture, C4, infrastructure, dependency, data flow, event flow, flowchart, swimlane, state machine, and composition for any kind. `grafical guide` lists them and `grafical guide <name>` prints one. `cloud` and `deployment` find infrastructure, `process` finds flowchart and `states` finds state machine. An unknown name is refused as `unknown-guide` with up to two likely names, and exits 2. The entry page names `grafical guide` once, and no command page names it; a test holds both.

## Decisions

- [022. Records over prose](decisions/022-records-over-prose.md)
- [042. One entry page, help where it is used](decisions/042-one-entry-page-help-where-it-is-used.md)
- [043. Help for the tool, guides for best practice](decisions/043-help-for-the-tool-guides-for-best-practice.md)
- [044. One way to a page, and a wrong command names the right one](decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)
- [047. Refusals say what happened and which commands can change it](decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md)
- [048. Every write prints every warning](decisions/048-every-write-prints-every-warning.md)
