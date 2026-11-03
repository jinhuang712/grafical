# grafical — Proposal

> Architecture diagrams that coding agents build in small, checked steps.

Proposed 2026-10-11, rewritten 2026-10-14.

## In short

You ask your agent how a service works, and it explains it well: the queue, the retry path, the cache, who calls whom. Then you ask it to draw that. Minutes later you get a clean picture that left out the retry path, or a complete one that is a wall of text with lines through the boxes. You ask for one fix, and the whole picture comes back different. After two rounds you keep the picture that is "all right".

**grafical lets the agent state what the diagram says, one small operation at a time, and draws it for the agent: placed, spaced, routed and the same every time.**

## Why it should exist

An agent can explain a system well and still cannot draw it well. The pains below are the moments that show it.

### Pain points

#### Every fix redraws everything

An agent draws in one shot. To fix one box, it draws the whole picture again, and parts nobody asked about move or disappear. Mermaid lays out the whole graph again on every edit. A whiteboard tool with an agent command line accepts only a full rebuild or additions on top.

#### The agent has to place every box by hand

Whatever the tool, the agent ends up computing coordinates: where each box goes, how wide it is, where each line bends. In a test on 2026-10-10, where four agents drew the same two services, each of them wrote its own script to compute positions. The results had overlapping boxes, clipped text and lines through boxes, and they get worse as the diagram grows.

#### Easy tools are rigid, and flexible tools are pixel work

Mermaid is easy for an agent, but it has few shapes, little control over the layout, and a plain look. SVG and draw.io can draw anything, but only coordinate by coordinate, which is slow, costly and error-prone.

#### Pretty or complete, not both

Tools that make diagrams look good cut content to do it. The `diagram-design` skill caps a picture at 9 nodes, and in that test it left out the retry path and the admin entry points. Without a tool, the details stayed, and the judges called the pictures walls of text.

#### A diagram costs minutes and many tokens

In that test, one diagram cost 2 to 6 minutes and 77k to 144k tokens, before any change was asked for.

#### The result depends on the model

A strong model can draw a good diagram. A cheaper one, given the same request, draws something broken, or something different each time.

#### The picture cannot be reproduced or reviewed

The result is an image or a one-off output. It cannot be diffed in a pull request, kept in step with the code, or drawn again exactly.

Together, these pains lead to one result: because every improvement is expensive, people and agents both settle for a diagram that is only "all right".

## Why now

| Before | Now |
|---|---|
| A person draws with a mouse: drag, resize, route, and get tired | An agent can understand a system and describe it in seconds |
| Tools are built for hands: a canvas, handles, snap guides | The one who draws has no hands. It thinks in sentences and calls tools |
| A diagram is drawn once and goes stale | A diagram could change with every change to the code, if changing it were cheap |

Diagram tools never made this shift. They still ask the one who draws to place every box, which is the part an agent does worst.

## The idea

**The agent states facts, and the engine does the drawing.**

The agent says what the diagram holds: this box is in that row, after that one, connected to this one, colored like this. The engine decides where everything goes: positions, sizes, spacing and routes, and it lays out the picture again after every change, like a typesetter after an edit. Deciding what the diagram says is the agent's work. Placing pixels is the engine's.

## What we want

- **A change is one small step.** An operation changes only the facts it names, and the picture re-spaces at once.
  - Nothing is drawn again from scratch.
  - This answers *Every fix redraws everything*.
- **The agent never places anything.** It states facts such as a row, an order, a column or a connection.
  - The engine places, sizes and routes.
  - This answers *The agent has to place every box by hand*.
- **Enough to say what is needed, without pixel work.** An agent can say more in fewer steps.
  - It has shapes, marks, colors, line weights, walls and notes.
  - It gets more ways to combine operations.
  - Looks may take any value.
  - Places are always facts.
  - This answers *Easy tools are rigid, and flexible tools are pixel work*.
- **Complete and clear at once.** No cap on content: a large diagram draws without a defect and without hiding anything.
  - What to cut is the agent's choice, never a limit of the tool.
  - This answers *Pretty or complete, not both*.
- **Fewer turns, less time, fewer tokens.** A first draft and each change cost little.
  - So the next improvement is always worth making.
  - This answers *A diagram costs minutes and many tokens* and the settling it causes.
- **A small model draws like a large one.** Haiku's picture looks like Opus's, because the tool does the work a model would get wrong.
  - This answers *The result depends on the model*.
- **The diagram is a file.** One YAML file in git.
  - The same file gives the same picture on any machine, and a change reads as operations in a diff.
  - This answers *The picture cannot be reproduced or reviewed*.

## What we don't want

- **A canvas where people drag boxes.** Agents draw good enough diagrams with grafical, and a person who wants a change asks for it in words.
- **Placement by coordinates, for anyone.** Coordinates are the dirty work that models fail at.
  - A free position would break the promise that a change moves only what it names.
- **grafical judging the picture.** Readers prefer different things.
  - grafical reports facts and counts, and the agent decides whether the diagram reads well.
  - It gives no readability score and no advice in prose.
- **The engine deciding content.** What the diagram says belongs to the agent. grafical never drops, merges or adds a box to make a picture tidier.
- **A new diagram language.** Drawing has always been arranging elements. grafical gives agents the best abstraction of it, and invents nothing beyond that.

## Who it is for

Coding agents first, and the engineers who ask them for diagrams. The first user is an engineer who wants an architecture diagram of the system they work on, kept in the repository beside the code, and changed with one sentence to the agent when the code changes.

## Why it should work

Three bets, each of which can be tested.

### Discrete facts are enough

An architecture diagram can be described by rows, order, groups, alignment, columns and a few size steps. If that is true, the engine can compute a good picture, and nobody has to place anything.

### Small, named operations make weak models good

Each operation asks for a few choices, and the tool checks each one at once. A weak model that only has to choose well can match a strong one.

### Stability can be built in

When the layout is computed again from the facts after every change, and an operation changes only the facts it names, the structure a reader knows survives every change.

## Risks

| Risk | What reduces it |
|---|---|
| Real diagrams need placements that rows and order cannot say, and the vocabulary grows until it is as hard as coordinates. This has started: walls, notes, columns and steps were added | Each new fact stays only if it measurably helps, and every placement stays a fact, never a position |
| Routing through the gaps is not enough for dense diagrams. The lines were the main complaint in the stage 1 round | Line work comes first, and the geometry check counts every defect |
| Many small operations cost more round trips than one rewrite | A batch applies many operations in one call, and GOALS.md, "Time" and "Cost" measure what the round trips cost |
| A small model still draws what the diagram says badly, even when the picture is tidy | The help teaches choosing what to draw, and the owner's review of each round's pictures keeps checking it |

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
