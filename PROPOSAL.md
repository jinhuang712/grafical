# grafical

> A diagram compiler. Proposal written 2026-09-10.

## The Problem

Getting an architecture diagram into a document, through a review, and into git goes wrong in the same six ways every time, in this order.

### Writing it down: the diagram cannot say what we mean

- There is no first-class notion of a layer, a band, or a panel. We fake one with extra rectangles, and the result does not read as an architecture diagram.
- Relationships stop at the node. "A calls B" can be said. "A calls B on this interface" cannot.
- Coarse placement cannot be said either. There is no way to state "this block sits on the left, that one below it" short of taking over every coordinate.
- Styling means picking a theme. A node with an icon, a title, a subtitle, and a status dot cannot be built.

### Drawing: position and routing are out of control

- Past a few dozen nodes, position becomes unpredictable. The picture on screen is not the picture in our head.
- Edges cross nodes, sit on labels, and run across the whole canvas.
- Intervening means owning every coordinate. There is no middle ground of constraints without coordinates.

### Editing: every step is pixel labor

- Text width is estimated by hand (CJK ≈ 1em, Latin ≈ 0.6em). Estimate wrong and the label overflows, so containers get padded by guess.
- Changing one label drags its position and its polyline bends along with it.
- Return edges and labels collide by default, and we move them by hand.
- Overflow shows up only after a render, so it is always found late.

### Iterating: a round is expensive and failure is total

- A round is write, render, check, look. Each takes minutes, and a diagram takes a dozen rounds.
- Two rounds that fail to clear the same defect mean throwing the diagram away and starting over.
- Feedback says "overflow here, overlap there". It does not say whether the relationships are wrong or the placement is.
- The target format has unstated limits, certain SVG features and text elements in particular. Break one and the output silently degrades to a flat image.

### Handing over: the path is long and brittle

- Delivery means creating a document, writing the diagram into it, exporting, converting the format, and deleting the document. Network round trips and version-specific branches at every step.
- Human edits and regeneration overwrite each other. There is no way to say "leave this part alone".

### Keeping it: nothing accumulates

- The artifact is an image. It cannot be diffed, reviewed in a pull request, or regression-tested.
- Styling and structure are redone for every diagram. Nothing survives as a template or a preset.

## The Idea

> **A diagram is structure made visible. State the structure, and the picture follows.**

A layered architecture diagram is not a graph. It is a structure of layers, bands, panels, and boundaries that uses space to say what belongs where. A graph layout engine does not know that, so it answers with a graph. A canvas tool knows it, and makes you say it by hand. Nothing occupies the middle.

grafical occupies the middle. It is three things, and each has one job.

| | Job | Never |
|---|---|---|
| **grafical** | Computes every pixel: layout, size, text wrapping, routing, spacing, alignment | Invents meaning |
| **the file** | Carries the structure, the human's decisions, the computed layout, and whatever it needs to look the same elsewhere | Depends on anything that did not travel |
| **the human** | Reads the result and adjusts it | Lays anything out |

The structure is usually written by a model, and it says three things: what exists, what belongs with what, what connects to what. It reads like this (the syntax is illustrative):

```yaml
title: 商品数据同步链路
layers: [接入, 传输, 平台, 存储]
nodes:
  - { id: ttd,  label: TTD,   layer: 平台, kind: service }
  - { id: mq,   label: Kafka, layer: 传输, kind: queue }
  - { id: ods,  label: ODS,   layer: 存储, kind: store }
edges:
  - { from: ttd, to: mq,  kind: async, label: 事件 }
  - { from: mq,  to: ods, kind: write }
```

Six lines carry what a hand-drawn version spends an afternoon on. There is no fourth kind of statement: no coordinate, no size, no color, no bend.

Two surfaces read the same source. The caller's surface is a shell: text in, files out, no picture. The human's surface is a page: the picture, and gestures that resolve into decisions. Both read the same computed layout, so what the human adjusts is exactly what gets published.

## Why It Should Work

Three bets, each falsifiable.

**1. Structure decides the picture.** Architects already draw layered diagrams the same way: rows for layers, columns for subsystems, boxes for units, lines for relations. That mapping is a convention, not a talent. If it can be written down, and it can, the picture can be computed, and nobody has to place anything.

**2. Choices are the error surface.** Every distinction the caller has to make is a chance to get it wrong. So the vocabulary is small and fixed, and every word means one thing. Fewer choices is not an aesthetic. It is the mechanism by which a diagram comes out right the first time.

**3. An adjustment that survives is an adjustment worth making.** If changing a diagram means re-placing things, the human is the layout engine again. So an adjustment is recorded as a decision about the diagram, and it holds when everything else is recomputed.

Where this could fail: if the shape of an architecture diagram genuinely cannot be derived from its structure, then the middle does not exist, and everyone belongs on one side or the other. That is the first thing to test.

## What Ships

One command, one file, one page.

| | |
|---|---|
| `grafical render <file>` | Produces the picture: PNG and SVG. Same file, same bytes, anywhere |
| `grafical check <file>` | Reports every defect with its location and what was expected, in a form a caller can act on |
| `grafical review <file>` | Opens the page where a human adjusts the diagram, with the adjustments landing back in the file |
| `.grf` | The file. Self-contained: structure, decisions, computed layout. Send it and it renders the same |

One install command. No account, no server, no browser in the path from structure to picture.

## How We Will Know

A correct compiler is necessary and not sufficient. The project succeeds only if a diagram comes out right the first time, so the targets are rates.

| Measure | Target | Kill threshold |
|---|---|---|
| First version usable without an adjustment | 70% | Below 50%: the vocabulary cannot carry real diagrams |
| Human minutes per diagram | under 2 | Above 10: the human is still drawing |
| Mechanical defects: overflow, overlap, edges crossing nodes | zero | Any: the compiler is not doing its job |
| Render time from the file | under 300 ms | Above 3 s: the loop is too slow to work in |

The third row is a gate, not a target. A diagram with a mechanical defect is not shipped. It is an error.

## Plan

Four phases, in order. The loop comes first, so every later feature is exercised through the real path.

1. **The loop.** Structure → layout → picture → page → an adjustment that survives. Nothing else.
2. **The vocabulary.** Kinds, layers, relations, one theme, and a checker that makes mechanical defects impossible.
3. **The page.** Adjustments as decisions, a view of what changed, undo.
4. **Real documents.** Run it against the architecture documents we actually write, and let the numbers recalibrate the targets above.

## Status

Nothing is built. The problem, the criteria, and the design decisions are written down. The next step is phase 0, and its only question is whether such a diagram comes out right the first time.

## Where to Look Next

PHILOSOPHY.md holds what we believe. DESIGN.md holds the decisions those beliefs produced, and what was rejected.
