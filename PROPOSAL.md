# Proposal

> Written 2026-10-11.

## The problem

A coding agent can read a codebase and explain how a system fits together. Turning that explanation into a diagram is where the work goes wrong. These are the problems, roughly in the order you hit them.

### Every fix redraws everything

Agents draw a diagram in one shot: they write the whole picture, render it, and hand it over. When something is wrong, the only way to fix it is to ask again, and the agent produces a new picture. Parts nobody asked about move or disappear. After a few rounds the diagram is often still wrong, and the rounds have cost minutes and many tokens each.

### The result depends on the model

A strong model can produce a good diagram. A weaker, cheaper model given the same request produces something broken, or something completely different each time. The quality comes from the model, so cheap models are not an option.

### The model places every box by hand

Whatever the tool, the model ends up computing coordinates: where each box goes, how wide it is, where each line bends. Models are bad at this. The result has overlapping boxes, clipped text and lines through nodes. It also gets worse as the diagram grows, which is why tools that look good cap the number of nodes.

### Pretty or complete, not both

Tools that make diagrams look good do it by cutting content, and engineers lose the details they need. Tools that keep every detail produce boxes full of paragraphs that nobody can read at a glance.

### Nothing can be adjusted after it is drawn

Most tools draw once and stop. The Lark board, for example, accepts an agent's changes only as a full rebuild or as additions on top. There is no way to change one node and keep the rest.

### The diagram cannot be reviewed

The result is an image. It cannot be diffed in a pull request, kept in step with the code, or checked automatically. Mermaid can be diffed, but its look and its automatic layout are hard to control.

## What we measured

On 2026-10-10 we ran a blind test. Four agents drew the same two services from the same fact brief. Two used the `diagram-design` agent skill and two used no tool. Two Opus judges scored the results without knowing which was which. There was one run per arm, so treat the numbers as a first signal.

| Arm | Score (of 50) | Tokens | Time |
|---|---|---|---|
| Opus, with the skill | 42 | 143.6k | 374 s |
| Sonnet, with the skill | 42 | 142.8k | 314 s |
| Opus, no tool | 34 | 77.1k | 151 s |
| Sonnet, no tool | 32 | 83.4k | 131 s |

- Every run wrote its own script to compute coordinates.
- The skill runs looked clean but hid details engineers need, such as the retry path and the admin entry points.
- The no-tool runs kept the details, but the judges called them walls of text.
- Two of the four runs contained a factual error.
- One diagram cost two to six minutes and 77k to 144k tokens, before any change was requested.

## What we want

- Change a diagram the way a person would: one small step at a time, where only what you named changes, and the picture re-spaces itself at once.
- Get a diagram that looks like the architecture diagrams of large engineering teams: aligned, evenly spaced, consistent type sizes, without asking for it.
- Draw big diagrams without the tool hiding information.
- Make it cheap enough that a small model like Haiku can do it well.
- Keep the diagram in git and review changes to it like code.

## What we do not try to do

grafical does not try to make every diagram look good to every reader. Readers prefer different things, and so do the agents that draw: one draws every dependency as its own line, another one line to a group of them. No score settles that for everyone. The problem grafical solves is narrower: agents need a tool that is easy to use and draws consistent diagrams (owner, 2026-10-13).

- **Easy:** an agent learns the tool from `grafical --help` and from the replies to its own commands, and reaches a finished picture in a few steps.
- **Consistent:** the same facts give the same picture, a change moves only what it names, and different models given the same facts get pictures that look alike.

## What we need

| Need | Meaning |
|---|---|
| Atomic | Every change is one named operation that succeeds completely or not at all |
| Stable | An operation changes only the facts it names. The picture re-spaces around the change, but layers, order and groups stay as you know them |
| Rebuildable | The same file always renders the same picture |
| Versioned | The file lives in git, and changes read as operations |
| Fast | A change takes seconds, not a regeneration |
| Cheap | A first draft and each change use few tokens |
| Model-tolerant | A weak model gets a good result, because the tool decides what the model would get wrong |
| Discrete | Positions, sizes and spacing come from a small set of allowed values, never free pixels |

## How it should feel

You ask for a change, such as "put a cache between the API and the database". A few seconds later the cache is there, everything else is where you expect it, and the picture still looks finished. It should feel like editing a LaTeX document in Overleaf: you change the content, and the layout follows at once. It should not feel like waiting to see what comes out this time.

## The idea

**A diagram is a set of discrete facts, built one step at a time.**

Diagrams from large engineering teams look consistent because they use few values: nodes sit in rows, they align, they share a spacing scale and a type scale. All of that can be written down as facts: this node is in that layer, after that node, aligned under this one. None of it needs a coordinate.

grafical gives agents a command-line tool whose operations state those facts. The engine owns everything else: measuring text, placing nodes, routing edges, and re-spacing the picture after every change so it stays tidy. After each step, it validates the change and checks the picture for defects, and reports any problem to the agent at once. [DESIGN.md](DESIGN.md) shows the full shape.

## Why it should work

Three bets, each of which can be tested.

1. **Discrete facts are enough.** A layered architecture diagram can be fully described by layers, order, groups, alignment and a few size and spacing steps. If that is true, the engine can compute a good picture and nobody has to place anything.
2. **Small, named operations make weak models good.** Each operation asks the model for a few choices from a short list. The tool validates each choice immediately. A weak model that only has to choose well from short lists can match a strong one.
3. **Stability can be built in.** If the layout is recomputed from the facts after every change, and an operation can change only the facts it names, the structure a reader knows survives every change. Stability is then a property of the design, not something we tune for.

## Where it could fail

- Real architecture diagrams might need placements that layers, order and alignment cannot express. Then the vocabulary grows until it is as hard to use as coordinates.
- Routing edges through the gaps between layers might not be enough for dense diagrams.
- Many small operations might cost more round trips than one large rewrite. Batches are meant to prevent this, and benchmark 1 in [GOALS.md](GOALS.md) measures it.

## Prior art

Checked on 2026-10-10. Nothing combines operations that state facts, a layout the engine owns, stability under change, and a file that can be reviewed.

| Tool | Has | Missing |
|---|---|---|
| LikeC4 | A text model, a layout engine, manual positions kept beside the text | Agents edit whole files, and its MCP server is read-only |
| draw.io MCP servers | Atomic operations, ELK layout, a mature editor | Operations take coordinates, and ELK lays out everything again |
| `mcp_excalidraw` | Atomic operations, browser edits synced back | No layout engine |
| Lark board CLI | Dagre and flexbox layout | Agents can only rebuild or append, and edits never return to the source |
| `diagram-design` skill | A strong visual style | The model computes coordinates, and the skill caps nodes at 9 |

Sources: the projects' READMEs and documentation, including [LikeC4's documentation](https://likec4.dev/llms-full.txt), [jgraph/drawio-mcp](https://github.com/jgraph/drawio-mcp), [lgazo/drawio-mcp-server](https://github.com/lgazo/drawio-mcp-server), [yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw), the `@larksuite/whiteboard-cli` package on npm, and the complexity budget in the `diagram-design` skill's `SKILL.md`.

## Scope

Stage 1 is the MVP, for agents. [ROADMAP.md](ROADMAP.md) has the phases, and [FEATURES.md](FEATURES.md) has what they contain. A board where people edit the diagram was planned as stage 2 and dropped on 2026-10-14 (FEATURES.md, "Considered and dropped").
