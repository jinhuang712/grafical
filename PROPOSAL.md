<!-- what-we-build: approved 2026-10-14 -->
# grafical — Proposal

> Architecture diagrams that coding agents build in small, checked steps.

Proposed 2026-10-11, rewritten 2026-10-14. For where the work stands today, see [ROADMAP.md](ROADMAP.md).

## In short

You ask your agent how a service works, and it explains it well: the queue, the retry path, the cache, who calls whom. Then you ask it to draw that. Minutes later you get a clean picture that left out the retry path, or a complete one that is a wall of text with lines through the boxes. You ask for one fix, and the whole picture comes back different. After two rounds you keep the picture that is "all right".

**grafical lets the agent state what the diagram says, one small operation at a time, and draws it for the agent: placed, spaced, routed and the same every time.**

## The shift

| Before | Now |
|---|---|
| A person draws with a mouse: drag, resize, route, and get tired | An agent can understand a system and describe it in seconds |
| Tools are built for hands: a canvas, handles, snap guides | The one who draws has no hands. It thinks in sentences and calls tools |
| A diagram is drawn once and goes stale | A diagram could change with every change to the code, if changing it were cheap |

Diagram tools never made this shift. They still ask the one who draws to place every box, which is the part an agent does worst.

## Pain points

1. **Every fix redraws everything.** An agent draws in one shot. To fix one box, it draws the whole picture again, and parts nobody asked about move or disappear. Mermaid lays out the whole graph again on every edit. A whiteboard tool with an agent command line accepts only a full rebuild or additions on top.

2. **The agent has to place every box by hand.** Whatever the tool, the agent ends up computing coordinates: where each box goes, how wide it is, where each line bends. In a test on 2026-10-10, where four agents drew the same two services, each of them wrote its own script to compute positions. The results had overlapping boxes, clipped text and lines through boxes, and they get worse as the diagram grows.

3. **Easy tools are rigid, and flexible tools are pixel work.** Mermaid is easy for an agent, but it has few shapes, little control over the layout, and a plain look. SVG and draw.io can draw anything, but only coordinate by coordinate, which is slow, costly and error-prone.

4. **Pretty or complete, not both.** Tools that make diagrams look good cut content to do it. The `diagram-design` skill caps a picture at 9 nodes, and in that test it left out the retry path and the admin entry points. Without a tool, the details stayed, and the judges called the pictures walls of text.

5. **A diagram costs minutes and many tokens.** In that test, one diagram cost 2 to 6 minutes and 77k to 144k tokens, before any change was asked for.

6. **The result depends on the model.** A strong model can draw a good diagram. A cheaper one, given the same request, draws something broken, or something different each time.

7. **The picture cannot be reproduced or reviewed.** The result is an image or a one-off output. It cannot be diffed in a pull request, kept in step with the code, or drawn again exactly.

Together, these pains lead to one result: because every improvement is expensive, people and agents both settle for a diagram that is only "all right".

## The idea

**The agent states facts, and the engine does the drawing.**

The agent says what the diagram holds: this box is in that row, after that one, connected to this one, colored like this. The engine decides where everything goes: positions, sizes, spacing and routes, and it lays out the picture again after every change, like a typesetter after an edit. Deciding what the diagram says is the agent's work. Placing pixels is the engine's.

## What we want

- **A change is one small step.** An operation changes only the facts it names, and the picture re-spaces at once. Nothing is drawn again from scratch. This answers pain 1.
- **The agent never places anything.** It states facts, such as a row, an order, a column or a connection, and the engine places, sizes and routes. This answers pain 2.
- **Enough to say what is needed, without pixel work.** Shapes, marks, colors, line weights, walls and notes, and more ways to combine operations, so that an agent can say more in fewer steps. Looks may take any value. Places are always facts. This answers pain 3.
- **Complete and clear at once.** No cap on content: 50 boxes draw without a defect and without hiding anything. What to cut is the agent's choice, never a limit of the tool. This answers pain 4.
- **Fewer turns, less time, fewer tokens.** A first draft and each change cost little, so the next improvement is always worth making. This answers pain 5 and the settling it causes.
- **A small model draws like a large one.** Haiku's picture looks like Opus's, because the tool does the work a model would get wrong. This answers pain 6.
- **The diagram is a file.** One YAML file in git. The same file gives the same picture on any machine, and a change reads as operations in a diff. This answers pain 7.

## How it works

An agent draws a service and its database, then adds a cache. Each line is one operation, and grafical answers each with what changed:

```sh
grafical new arch.grafical.yaml --title "Order flow"
grafical layer add arch.grafical.yaml app --label App
grafical layer add arch.grafical.yaml data --label Data
grafical node add arch.grafical.yaml api --label "Order API" --kind service --layer app
grafical node add arch.grafical.yaml db --label Postgres --kind store --layer data
grafical edge add arch.grafical.yaml api db --label writes
```

Adding the cache later is two more steps. The API and Postgres stay where they were:

```sh
grafical node add arch.grafical.yaml cache --label Redis --kind store --layer data --after db
grafical edge add arch.grafical.yaml api cache --label reads
grafical render arch.grafical.yaml --png arch.png
```

```text
ok changed=cache
ok changed=api->cache
counts nodes=3 lines=2 crossings=0 bends=1 length=224 width=368 height=280 ...
```

An agent learns all of this from `grafical --help`. [FEATURES.md](FEATURES.md) lists every command.

## What we don't want

- **A canvas where people drag boxes.** Agents draw good enough diagrams with grafical, and a person who wants a change asks for it in words.
- **Placement by coordinates, for anyone.** Coordinates are the dirty work that models fail at, and a free position would break the promise that a change moves only what it names.
- **grafical judging the picture.** Readers prefer different things, so grafical reports facts and counts, and the agent decides whether the diagram reads well. It gives no readability score and no advice in prose.
- **The engine deciding content.** What the diagram says belongs to the agent. grafical never drops, merges or adds a box to make a picture tidier.
- **A new diagram language.** Drawing has always been arranging elements. grafical gives agents the best abstraction of it, and invents nothing beyond that.

The full list, with what was considered and dropped, is in [FEATURES.md](FEATURES.md).

## Who it is for

Coding agents first, and the engineers who ask them for diagrams. The first user is an engineer who wants an architecture diagram of the system they work on, kept in the repository beside the code, and changed with one sentence to the agent when the code changes.

## Approach

- **A command-line tool,** because every agent and every shell script can call one. An MCP server can wrap the same operations later.
- **TypeScript on Node,** with fonts bundled, so that the same file gives the same SVG and PNG on macOS and Linux.
- **A layered model:** rows, order, groups, columns, walls and steps from another box. The engine lays out from these facts after every change.
- **Its own router and checker.** Lines route through the gaps between boxes, and every write is checked for defects at once.

[DESIGN.md](DESIGN.md) has each decision and what it beat.

## Why it should work

Three bets, each of which can be tested.

1. **Discrete facts are enough.** An architecture diagram can be described by rows, order, groups, alignment, columns and a few size steps. If that is true, the engine can compute a good picture, and nobody has to place anything.
2. **Small, named operations make weak models good.** Each operation asks for a few choices, and the tool checks each one at once. A weak model that only has to choose well can match a strong one.
3. **Stability can be built in.** When the layout is computed again from the facts after every change, and an operation changes only the facts it names, the structure a reader knows survives every change.

## Risks

| Risk | What reduces it |
|---|---|
| Real diagrams need placements that rows and order cannot say, and the vocabulary grows until it is as hard as coordinates. This has started: walls, notes, columns and steps came in phase 1e | Each new fact stays only if it measurably helps, and every placement stays a fact, never a position |
| Routing through the gaps is not enough for dense diagrams. The lines were the main complaint in the stage 1 round | Line work comes first in phases 1d and 1e, and the geometry check counts every defect |
| Many small operations cost more round trips than one rewrite | A batch applies many operations in one call, and benchmark 1 measures tool calls |
| A small model still draws what the diagram says badly, even when the picture is tidy | The help teaches choosing what to draw, and the judged score keeps measuring it |

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

## How we know it works

[GOALS.md](GOALS.md) holds every check. The headline is the MVP bar: Haiku, using only the command line and its help, meets the targets for changes, stability, the gap between models, operation errors, and determinism and speed, with zero mechanical defects. Beside it, Haiku's picture of a private reference brief scores at least 42 of 50 in blind judging, which is what the `diagram-design` skill scored with Opus and Sonnet.
