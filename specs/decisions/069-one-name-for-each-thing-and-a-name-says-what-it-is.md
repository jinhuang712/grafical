# 069. One name for each thing, and a name says what it is

Decided: 2026-11-06

Replaced in part by specs/decisions, "`move` and `plug` stand above the nouns": `edge ends` became `plug`.

## The problem

The help mixed two names for one thing: row and layer, box and node, line and edge, mark and icon. An agent read one word and typed the other. One word also meant two things, such as step and footnote and dot.

## The choice

A thing has one name everywhere it appears. A name says what a thing is and not how it looks.

| Thing | Name | Gone |
|---|---|---|
| a level of a diagram | `layer` | row |
| a part of the system | `node` | box |
| a connection | `edge` | line |
| a small image on a node | `mark` | icon |
| what stands out | `emphasis` | accent |
| edges that leave as one | `bundle` | bus |
| where a bundle splits | `knot` | dot |

A command that sets a field is named for the field:

- `node label`
- `node sublabel`
- `node size`
- `node mark`
- `edge label`
- `edge number`
- `edge ends`
- `group label-at`

The picture's closing text is `diagram caption`. A step is a placement only, and a number is what an edge carries.

Built on 2026-11-06. Commands, operations, fields, refusals, records and comments use these names. A word stays where it means something else:

- A `row` of a gutter is a track's place in it, and a `line` of text is a line.
- A `Box` in the layout is a rectangle a label or a group takes.
- `diagram --lines` sets how edges are drawn, and the owner may yet name it.

## Not chosen

- Row, box and line.
  - A node need not be a box, and `node` holds no shape.
  - Row sounds flat, and `layer` leaves more room.
- A word for each audience, such as box for readers and node for commands.
  - That is the mix this replaces.
- Knot for the whole bundle.
  - A knot is the point, and a bundle is the edges.

## Consequences

The file keeps `layers`, `nodes` and `edges`, so saved drafts stay readable, and it changes only for marks and emphasis. Every document and help page changes its words once. `box` stays only as a look a layer takes. A `column` no longer pairs with a row by name, and it keeps its name since an agent reads it at once.
