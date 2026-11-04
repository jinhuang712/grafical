# grafical — Proposal

> Architecture diagrams that coding agents build in small, checked steps.

## In short

You ask your agent how a service works, and it explains it well: the queue, the retry path, the cache, who calls whom. Then you ask it to draw that. Minutes later you get a clean picture that left out the retry path, or a complete one that is a wall of text with lines through the boxes. You ask for one fix, and the whole picture comes back different. After two rounds you keep the picture that is "all right".

**grafical lets the agent state what the diagram says, one small operation at a time, and draws it for the agent: placed, spaced, routed and the same every time.**

## Why it should exist

An agent can explain a system well and still cannot draw it well. Every improvement to its picture is expensive, so people and agents both settle for a diagram that is only "all right". The pains below are the moments that show it.

No tool closes the gap. On 2026-10-10 we checked five, and none combines operations that state facts with a layout the engine owns, stability under change and a file that can be reviewed:

| Tool | Has | Lacks |
|---|---|---|
| LikeC4 | a text model with a layout engine | agents edit whole files · a read-only MCP server |
| draw.io MCP servers | atomic operations · ELK layout | operations take coordinates · ELK lays out everything again |
| `mcp_excalidraw` | atomic operations · browser edits synced back | a layout engine |
| Lark board CLI | Dagre and flexbox layout | agents only rebuild or append |
| `diagram-design` skill | a strong visual style | the model computes coordinates · a cap of 9 nodes |

Sources: [LikeC4's documentation](https://likec4.dev/llms-full.txt), [jgraph/drawio-mcp](https://github.com/jgraph/drawio-mcp), [lgazo/drawio-mcp-server](https://github.com/lgazo/drawio-mcp-server), [yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw), the `@larksuite/whiteboard-cli` package on npm and the `SKILL.md` of the `diagram-design` skill.

### Pain points

#### Every fix redraws everything

An agent draws in one shot. To fix one box it draws the whole picture again, and parts nobody asked about move or disappear. Mermaid lays out the whole graph again on every edit. A whiteboard tool with an agent command line accepts only a full rebuild or additions on top.

#### The agent has to place every box by hand

Whatever the tool, the agent ends up computing coordinates: where each box goes, how wide it is and where each line bends. In a test on 2026-10-10, four agents drew the same two services, and each wrote its own script to compute positions. The results had overlapping boxes, clipped text and lines through boxes, and they get worse as the diagram grows.

#### Easy tools are rigid, and flexible tools are pixel work

Mermaid is easy for an agent, but it has few shapes, little control over the layout and a plain look. SVG and draw.io can draw anything, but only coordinate by coordinate, which is slow, costly and error-prone.

#### Pretty or complete, not both

Tools that make diagrams look good cut content to do it. The `diagram-design` skill caps a picture at 9 nodes, and in the test of 2026-10-10 it left out the retry path and the admin entry points. Without a tool the details stayed, and the judges called the pictures walls of text.

#### A diagram costs minutes and many tokens

In the same test one diagram cost 2 to 6 minutes and 77k to 144k tokens, before any change was asked for.

#### The result depends on the model

A strong model can draw a good diagram. A cheaper one, given the same request, draws something broken, or something different each time.

#### The picture cannot be reproduced or reviewed

The result is an image or a one-off output. It cannot be diffed in a pull request, kept in step with the code or drawn again exactly.

## Why now

Diagram tools were built for a person with a mouse. The one who draws now is often an agent, and diagram tools never made that shift: they still ask it to place every box, which is the part an agent does worst.

| Before | Now |
|---|---|
| a person drags, resizes and routes by hand | an agent describes a system in seconds |
| tools built for hands: a canvas and handles | the one who draws thinks in sentences and calls tools |
| a diagram drawn once that goes stale | a diagram that could change with every change to the code |

## The idea

**The agent states facts, and the engine does the drawing.**

The agent says what the diagram holds: this box is in that row, after that one, connected to this one, colored like this. The engine decides where everything goes, and lays the picture out again after every change, like a typesetter after an edit. Deciding what the diagram says is the agent's work. Placing pixels is the engine's.

The idea rests on three bets, each of which a test can settle:

- **Discrete facts are enough:** an architecture diagram can be described by rows · order · groups · alignment · columns · size steps.
- **Small named operations make weak models good:** a model that only has to choose well can match a strong one.
- **Stability can be built in:** a layout computed again from facts keeps the structure a reader already knows.

## What we want

- **Fix one thing without losing the rest:** an operation changes only the facts it names, and the picture re-spaces at once.
- **Never place a box by hand:** the agent states a row or an order or a connection, and the engine places and routes everything.
- **Say what is needed without pixel work:** shapes · marks · colors · line weights · walls · notes let an agent say more in fewer steps.
- **A picture that is complete and clear at once:** a large diagram draws without a defect and without hiding anything, and what to cut stays the agent's choice.
- **Make the next improvement worth it:** a first draft and each change cost few turns, little time and few tokens.
- **Get a good picture from a small model:** Haiku's picture looks like Opus's, because the tool does the work a model would get wrong.
- **Keep the diagram beside the code:** one YAML file in git gives the same picture on any machine, and a change reads as operations in a diff.

## What we don't want

- **A canvas where people drag boxes:** agents draw good enough diagrams with grafical, and a person who wants a change asks for it in words.
- **Placement by coordinates for anyone:** coordinates are the work models fail at, and a free position would break the promise that a change moves only what it names.
- **grafical judging the picture:** readers prefer different things, so grafical reports facts and counts and the agent decides whether the diagram reads well.
- **The engine deciding content:** what the diagram says belongs to the agent, so grafical never drops or merges or adds a box to make a picture tidier.
- **A new diagram language:** drawing has always been arranging elements, so grafical gives agents the best abstraction of that and invents nothing beyond it.

## Who it is for

Coding agents first, and the engineers who ask them for diagrams.

- **The agent** gets a tool it can learn from the command line, which draws what it states and tells it facts back.
- **The engineer** gets an architecture diagram of the system they work on, kept in the repository beside the code and changed with one sentence to the agent.

## Risks

- **The vocabulary grows until it is as hard as coordinates:** walls and notes and columns were already added, so each new fact stays only if it measurably helps.
- **Routing through the gaps is not enough for dense diagrams:** the lines were the main complaint of the first full benchmark round, so line work comes first and a geometry check counts every defect.
- **Many small operations cost more round trips than one rewrite:** a batch applies many operations in one call, and the round trips are measured in time and cost.
- **A small model draws what the diagram says badly even when the picture is tidy:** the help teaches choosing what to draw, and the owner reviews each round's pictures.
