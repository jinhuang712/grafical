# F7: Help

```
F7: Help
├── F7.1: Help — the agent's whole reference
└── F7.2: Guides — how common diagrams are usually drawn
    └── F7.2.1: A check before stopping — look at the picture and check it against a list
```

How an agent learns grafical from the command line alone: help for the tool and guides for common kinds of diagram.

## F7.1: Help

How to use grafical: the agent's whole reference for the tool.

- **Commands:** [Global flags](../CLI.md#global-flags)

The entry page and one page per command hold everything an agent needs to use grafical.

- `--help` says what grafical is and what it does not draw.
- It says how to work and lists every way to draw, one line each by the story it tells.
  - Examples: a node beside a node and one path in order and two parts kept apart.
- Each command's help adds its options and its line in a batch and when to use it and what it draws and common mistakes and limits and an example.
- A command's arguments are named as its batch fields.
- No page says what a refusal means, since the refusal's block says it.
- The help does not say how a kind of diagram is drawn, since the guides do.
- `--help` is the one way to a page, and there is no `grafical help <command>`.
- A command grafical does not have is refused with the word it most likely means.
  - `grafical help apply` gives `error: unknown-command` with `found: help` and `likely: --help`.
  - `grafical node.add --help` gives `found: node.add` and `likely: node --add`.

- **Stance:** [How does an agent learn grafical?](../PHILOSOPHY.md#how-does-an-agent-learn-grafical)
- **Design:** [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:**
  - [021. The help as the reference](../specs/decisions/021-the-help-as-the-reference.md)
  - [042. One entry page, help where it is used](../specs/decisions/042-one-entry-page-help-where-it-is-used.md)
  - [044. One way to a page, and a wrong command names the right one](../specs/decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)

**Stories:**

- An agent learns grafical from `--help`, to start without being told how.

## F7.2: Guides

How common kinds of diagram are usually drawn: best practice, for an agent that wants it.

- **Commands:** [`guide`](../CLI.md#guide)

`grafical guide` lists the guides by what a diagram is about:

| About | Guides |
|---|---|
| what exists | architecture · C4 · infrastructure · dependency |
| what moves | data flow · event flow |
| a process | flowchart · swimlane |
| one thing's states | state machine |
| any kind | composition |

- Composition says what makes a diagram good and what to change when a picture looks wrong.
- `grafical guide <name>` prints one guide.
  - `cloud` and `deployment` and `process` and `states` find theirs too.
- A name that is no guide is refused as `unknown-guide` with the likely ones.
- The entry page names `grafical guide` once, and no command page names it.

- **Design:** [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:**
  - [043. Help for the tool, guides for best practice](../specs/decisions/043-help-for-the-tool-guides-for-best-practice.md)

**Stories:**

- An agent reads a guide, to draw a kind of diagram the usual way.

### F7.2.1: A check before stopping

An agent looks at its picture and checks it against a list before it stops.

- **Commands:** [`guide`](../CLI.md#guide)

- Composition lists the points of a good picture, written for an agent.
- The last step of the entry page's way of working tells an agent to look at the picture and check it against composition before it stops.

- **Why:** [099. An agent checks its own picture against a list](../specs/decisions/099-an-agent-checks-its-own-picture-against-a-list.md)

**Stories:**

- An agent checks its picture against a list before it stops, to catch more than one fault.
