# grafical Design Decisions

> Established 2026-09-10.

How the statements in PHILOSOPHY.md become a working design: what was chosen, why, and what was rejected. The rejected alternatives carry as much weight as the choices. They are usually the reason a current shape looks odd.

Decision IDs are permanent. A reversed decision keeps its ID and gains a note pointing at its replacement.

## Index

| ID | Decision | From |
|---|---|---|
| D1 | Three parts: a command, a document, an engine | — |
| D2 | Two surfaces over one source | — |
| D3 | The input is structure, and nothing else | Structure decides the picture |
| D4 | Layers are first-class, and they are why the picture is not a graph | Structure decides the picture |
| D5 | Kinds are enumerated; appearance is not part of the input | Less is more |
| D6 | No coordinate exists, anywhere | Moving pixels is banned |
| D7 | One file carries everything | — |
| D8 | The computed layout travels inside the file | Structure decides the picture |
| D9 | A human's adjustments are decisions, stored in the file | Drawing is a series of discrete actions |
| D10 | grafical computes the layout; the renderer only draws | — |
| D11 | X6 draws. It does not lay out | — |
| D12 | SVG-native shapes only | — |
| D13 | Rendering is headless | — |
| D14 | PNG comes from rasterizing the SVG | — |
| D15 | Three commands | Less is more |
| D16 | A gesture resolves to a decision, or it does not happen | Drawing is a series of discrete actions |
| D17 | Defects never reach the human | Errors are not for the human |
| D18 | Valid output or an error; nothing in between | Less is more |
| D19 | Same source, same bytes | — |
| D20 | Stability starts at the first release | Less is more |

## The Shape

A `.grf` file says what a system is made of and how the parts relate. One command turns it into a picture. Another turns it into a page a human can adjust. Every pixel of the result is computed.

There are two parties. grafical holds the structure, computes the layout, and draws. The human looks at the result and adjusts it. Whoever wrote the structure is not a party: the design is the same whether it came from a model, a script, or a hand.

```text
        ┌─────────────── grafical ───────────────┐
structure ──▶  layout  ──▶  drawing  ──▶  picture / page
   ▲                                          │
   └───────────── human's decisions ──────────┘

everything travels in one file
```

## Product Shape

### D1 Three parts: a command, a document, an engine

The product is a command (`grafical`), a document (`.grf`), and the engine that turns one into the other. The command is the only reader and writer of the document. The document is the only thing that travels. The engine is what makes the same document look the same anywhere.

Rejected: a service, because nothing should have to be running for a diagram to exist. A library, because structure is written from a shell, not against an API. A browser application, because a browser in the loop costs a round trip, and the writer could not see the result anyway.

### D2 Two surfaces over one source

grafical's surface is the shell: text in, files out, no picture. The human's surface is a page: the picture, with gestures. Both read the same computed layout, so what the human adjusts is exactly what will be published.

Rejected: one surface for both, because a machine cannot use a page and a human should not need a shell. A preview that approximates the export, because a human reviewing something other than the artifact is not reviewing.

## What Goes In

### D3 The input is structure, and nothing else

Three statements, and no fourth: what exists, what belongs with what, what connects to what. Each is a statement about the system. Everything the picture shows beyond that is grafical's to compute.

Rejected: allowing a coordinate "just in case", because one escape hatch becomes the normal path, and that is the situation this project exists to leave. Style values, because an invented value carries no convention and the reader pays for it. Layout hints beyond coarse placement, because each one hands back a decision the engine should be making.

### D4 Layers are first-class, and they are why the picture is not a graph

A layer is a named band that things belong to. Groups nest inside it. The picture is built from the layers outward, which is why it reads as an architecture diagram and not as a node-link graph.

Rejected: deriving bands from the graph, because that is what a graph layout does, and it is why its output is a graph rather than an architecture. Rows and columns as free-form containers, because they hand out a placement decision without giving it a name.

### D5 Kinds are enumerated; appearance is not part of the input

A kind says what a thing is, and therefore how it is drawn: a service, a store, a queue, an outside system, an actor. The list is short and does not grow casually. Themes are chosen, not composed.

Rejected: free-form appearance attributes, because an invented color is a convention the reader has to learn at the moment they read. Per-diagram themes, because the same system drawn twice should look the same.

### D6 No coordinate exists, anywhere

Not in the source, not in the decisions, not in any operation. There is nothing to store and nothing to read back. This is not a restriction placed on an existing capability. The capability is absent.

Rejected: a nudge mode, a manual-override field, and a repair step after rendering. Each is the same escape hatch under a different name, and each turns a gap in the vocabulary into a pixel nobody can explain later.

## The File

### D7 One file carries everything

A `.grf` holds what the diagram says, what the human decided about it, the layout that was computed, and whatever it needs to look the same elsewhere. Send it, and the recipient renders the same picture.

Rejected: a source plus a sidecar plus a cache, because three files where one will do is three chances to lose the human's work by losing one of them. External theme files, because then the picture depends on something that did not travel.

### D8 The computed layout travels inside the file

The layout is derived, so it can always be discarded and recomputed. When it is present, it wins. This is what makes the picture independent of the recipient's engine version, fonts, and platform: if the metrics differ, nothing moves.

Rejected: pinning an engine version, because a version pin is a promise to render old layouts forever. Shipping fonts as a second artifact, because it is one more thing to send and one more thing to lose.

### D9 A human's adjustments are decisions, stored in the file

An adjustment is recorded as a decision about the diagram: this belongs to that layer, these two swap order, this relation is asynchronous. It travels with the file and survives every later regeneration.

Rejected: a separate override file, because whatever holds the human's work should be the thing they were sent. Session-only state, because work that disappears is work nobody will do.

## grafical

### D10 grafical computes the layout; the renderer only draws

Layout happens before rendering, once, outside any renderer. Both surfaces consume the result, so the command's output and the page are the same picture.

Rejected: letting the renderer lay out, because two renderers would produce two pictures, and anything the human adjusted would stop meaning anything.

### D11 X6 draws. It does not lay out

X6 supplies the parts that are hard to get right and already are: orthogonal and obstacle-avoiding routing, connectors, ports and anchors, text measurement and wrapping, and a registry of shapes. It has no layout engine, so the layered layout is ours to write.

Rejected: writing a router, because X6's is better than anything we would write, and routing is not where our value is. Using X6's editing plugins while writing structure, because they exist to serve a hand on a canvas.

### D12 SVG-native shapes only

A node is drawn from SVG primitives. HTML and foreign-object content is excluded: it cannot be measured without a real layout engine, and it does not rasterize.

Rejected: HTML nodes and framework-rendered nodes, because they work only in the one environment we are deliberately not depending on.

### D13 Rendering is headless

The command renders in-process: a DOM shim plus a canvas for text measurement. X6's own test suite already exercises exactly this path and asserts the SVG it produces, so the capability is proven rather than hoped for.

Rejected: a headless browser, because it costs hundreds of megabytes and seconds per render to produce a picture we can produce in-process.

### D14 PNG comes from rasterizing the SVG

One renderer, one picture. The rasterizer's only job is to turn vectors into pixels.

Rejected: X6's own image export in Node, because it wants an image loader that a headless document does not have. A second renderer, for the same reason as D10.

## The Interfaces

### D15 Three commands

`render` produces the picture. `check` produces diagnostics for whoever wrote the structure. `review` opens the page for the human. Nothing else is needed to do the work.

Rejected: a subcommand for every action, because a large surface is a large error surface. A long-running server, because the writing loop must not depend on one.

### D16 A gesture resolves to a decision, or it does not happen

Dragging a box in the page means one of the things the vocabulary can say: this belongs to that layer, this aligns with that, this comes before that. A gesture that resolves to nothing is not performed, and the box returns to where the diagram puts it.

Rejected: free positioning with a silent side effect, because an adjustment that cannot be named cannot be stored, reviewed, or kept.

### D17 Defects never reach the human

A diagnostic names the location, what was observed, and what was expected, in a form that whoever wrote the structure can act on without guessing. The page never shows one.

Rejected: warnings for the human to resolve, because the human did not produce the defect and fixing it is not their job. Prose messages, because a message that has to be interpreted costs a round.

### D18 Valid output or an error; nothing in between

If the diagram would render wrong, it is refused. There is no partial, approximate, or degraded result.

Rejected: emitting an image that mostly works, because it looks like success and removes the reason to fix anything.

### D19 Same source, same bytes

Identical input produces identical output, on any machine.

Rejected: timestamps in output, unordered collections, and defaults that depend on the host.

### D20 Stability starts at the first release

Before the first release, the format and the vocabulary are free to move. After it, adding is allowed and changing is a breaking change. A file that cannot be read is refused, never guessed at.

Rejected: promising compatibility from day one, because it would freeze the design before it is known to work. Reading an old file leniently, because a half-read diagram is worse than an absent one.

## Not Yet Decided

- The syntax of the file: one line per statement, or a nested structure.
- The layout algorithm, and what it guarantees about crossings and spacing.
- The contents of the vocabulary: which kinds, which relations.
- How the page reaches the human: a single file that opens, or a command that serves it.
- Whether a layer can vary along two axes at once, which is what a swimlane asks for.
