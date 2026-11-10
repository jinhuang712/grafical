# How grafical answers

The reader of grafical's answers is an agent, and often a script around it. So everything grafical prints about a diagram is a record a script can read: an outcome, a block for each problem, and facts and counts. The only sentences are each code's fixed description, and the help, which is documentation. The answer says what happened and which commands can change it, and leaves the change to the agent. The command line builds every answer, from the records the other parts return. It lives in `src/cli/`.

## What it prints

Every command builds its answer from the same parts: the outcome, a block per problem, then the records the command adds. The descriptions live in one table in `src/cli/problems.ts`, and a test holds each code to one sentence of at most 140 characters. A code that is both an error and a defect has one sentence. A code with several cases has a list of commands for each, such as `label-blocked` for an edge or a wall or a note, and a test holds every name to a real command.

No block writes the change for the agent: there is no fix, and `next` names commands without ids or values. The detail carries what the agent needs to find the change itself, such as the first and last layers a group's frame covers.

A word grafical does not know is answered with the word it most likely means, as a value. `grafical help node` gives `found: help` and `likely: --help`. `grafical "node add" --help` and `grafical node.add --help` give `likely: node --add`, and `grafical nodee add --help` gives `found: nodee` and `likely: node`. A word is near a name when at most a third of its letters differ, or one.

## Where a problem comes from

The source takes one of two forms:

- The command line as typed, quoted as a shell would need it.
- `already in the file` for a problem the file had before the command.

A refused write checks the file once for all its problems. A problem the file already had is `already in the file`, and any other is the command's. A file refused for another problem cannot tell, since a whole diagram's checks stop at the first that fails and a refused diagram is not laid out. Its problem is then the command's, unless a later check refused the file after the one that finds this problem passed. A write that succeeds checks nothing more.

## Trying a change

`--try` on a command that writes runs the path of the write but does not write the file. It prints `ok changed=... written=no`, then `before`, `after` and `delta` records of the counts. A command the write would refuse is refused the same way.

## The help and the guides

The help is the agent's only reference. `grafical --help` is the entry page, `grafical <group> --help` a group's page, and `grafical <command> --help` a command's page, so every page is at most two hops from the entry page. There is no `help` command: the word `help` is answered as an unknown command with `likely: --help`. Every page is printed at 80 columns, so it is the same text on every terminal.

A command's page starts with its usage, its paragraph, its arguments and its options, named as its operation's fields. Then come the sections the page has, always in this order: When to use, Kinds, Good to know, Common mistakes, Limits, Output, See also and Example. No page says what a refusal means: the block says it. A test holds every example to name its file first, and no size limit is tested, only the 80 columns.

The guides say how common kinds of diagram are usually drawn: architecture, C4, infrastructure, dependency, data flow, event flow, flowchart, swimlane, state machine, and composition for any kind. `grafical guide` lists them and `grafical guide <name>` prints one. `cloud` and `deployment` find infrastructure, `process` finds flowchart and `states` finds state machine. An unknown name is refused as `unknown-guide` with up to two likely names, and exits 2. The entry page names `grafical guide` once, and no command page names it; a test holds both.

## Decisions

- [022. Records over prose](decisions/022-records-over-prose.md)
- [042. One entry page, help where it is used](decisions/042-one-entry-page-help-where-it-is-used.md)
- [043. Help for the tool, guides for best practice](decisions/043-help-for-the-tool-guides-for-best-practice.md)
- [044. One way to a page, and a wrong command names the right one](decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)
- [047. Refusals say what happened and which commands can change it](decisions/047-refusals-say-what-happened-and-which-commands-can-change-it.md)
- [048. Every write prints every warning](decisions/048-every-write-prints-every-warning.md)
- [105. One command is one write, and running it twice changes nothing](decisions/105-one-command-is-one-write-and-running-it-twice-changes-nothing.md)
