# Glossary

The words grafical uses, one name for each thing. Each entry gives the meaning, the names that lost (so a search still finds them), and the name in code or on the command line when it differs.

## Who does what

- **Agent:** the coding agent that draws with grafical.
- **Engine:** the part of grafical that does the dirty work of placing and routing and checking and drawing.
- **Owner:** the person who decides what grafical is.

## The picture

- **Layer:** a region of nodes with an order.
  - A layer is not drawn unless it has a look or an edge ends at it.
  - Lost names: *row* · *slot*, which now names only a mark's place.
- **Node:** an element of the picture with a type, a label and an optional sublabel.
  - Lost name: *box*, since a node need not be a box.
- **Edge:** a connection between two ends.
  - Each end is a node or a group or a layer or a lane.
  - Lost names: *line*, *connection*.
- **Group:** a system drawn as one frame around its members.
  - Its members may sit in several layers, and groups may nest.
- **Lane:** a labelled band that says who owns what.
  - All lanes of a diagram run one way, as layers or as columns.
  - Lost name: *swimlane*.
- **Column:** a second placement fact beside layers.
  - Nothing is drawn for it.
- **Wall:** empty space between two parts of the picture.
  - Edges cross it only where it allows.
- **Note:** a short text attached to a node, an edge or a group.
  - It is drawn as a card or as a footnote.
- **Bar:** a layer with no node that an edge ends at.
  - It is drawn as one 40 px bar across the picture, such as a gateway.
- **Band:** a layer with nodes that an edge ends at, drawn as one band around them.
- **Choice:** a small diamond with no text, where an edge splits into several.
  - Not the same as `decision`, a diamond with text inside.

## What a node or an edge carries

- **Type:** says what a node or an edge is, and decides how it is drawn.
  - Lost name: *kind*.
- **Style:** a named look and spacing that an object marks.
  - Where two styles say the same thing, the one defined later in the file wins.
- **Like:** one object follows the look of another of its sort.
- **Region:** a diagram · a group · a layer · a lane · a column.
- **Margin:** the room a style gives one side of an object, in pixels.
  - On the command line: `--margin-top` · `--margin-right` · `--margin-bottom` · `--margin-left`.
- **Magnified:** how many times its default a size is, such as 1.5.
  - Lost names: *times*, *multiple* as a flag.
- **Knot:** the point where a bundle splits.
- **Mark:** a small image on a node: an emoji or a short text or a file.
  - At most five, one in each slot.
  - Lost name: *icon*.
- **Slot:** one of the five places a mark takes on a node: a corner or `left`.
  - On the command line: `--slot`.
- **Weight:** how thick an edge is, a level or a width in pixels.
- **Emphasis:** at most two nodes that stand out.
  - Lost name: *accent*.
- **Legend:** the key in the top right.
  - It says only what the agent named.

## How edges are drawn

Checked against `src/layout/` and `src/render/` on 2026-11-04.

- **Gutter:** the space between two neighbouring layers, where edges run across.
  - It is at least the diagram's `row-gap` high.
- **Gap:** the space between two neighbouring nodes of one layer.
  - It is at least the diagram's `column-gap` wide.
- **Run:** one straight horizontal or vertical piece of an edge.
  - Lost names: *stretch* and *segment* and *part*.
- **End run:** the run at either end of an edge, from its node to its first bend.
  - It is at least 16 px, and 24 px at ease.
- **Track:** one of the rows of a gutter or one of the columns of a gap that a run takes.
- **Jog:** a sideways shift in the middle of a long run of an edge.
- **Corridor:** a column of the grid empty in every layer an edge passes, which the edge runs down.
- **Port:** the place where an edge meets a side of a node.
- **Bundle:** edges of one style and weight that leave one side of a node through one port and split near their targets.
  - Lost name: *bus*.
- **Fan-in:** edges that enter one crowded side of a node through one port.
- **Stand-in:** the node that an edge to a group, a layer or a lane is routed to before it is cut at the container.
- **Hop:** the small arc where one edge passes over another.
- **Seat:** a place a text outside a node may take, such as an edge's label or a group's title.
  - In code: `slot`.

## Operations and files

- **Operation:** a named change to a diagram, such as `node.set`.
  - The only way a diagram changes.
- **Diagram file:** `<name>.grafical`.
  - It holds facts and never a coordinate.
- **Stylesheet:** a `.grafical` file of `<type>`, `<style>` and `<weight>` blocks that sets every value of a diagram's look.
  - A built-in one is `default`, `dark` or `print`, and one of the agent's starts from a built-in one.
  - A diagram names it with `--stylesheet`.
  - Lost name: *theme*, which the code still uses for the look a stylesheet gives.
- **Library:** the built-in stylesheets, which `grafical library` lists and searches.
- **Step:** a node is placed some steps from another node.
- **Number:** what an edge carries as part of a process.

## The benchmarks

- **Routing case:** a small diagram in `bench/routes/` that tests one standard of a good route.
- **Brief:** a description of a system that an agent draws from.
  - A public brief is fictional, and a private brief describes a real system.
- **Arm:** what an agent draws with in a benchmark, such as grafical or nothing.
  - **Drawing directly** is the arm with no tool.
- **Chain:** one agent session, from a first draft through its change requests.
- **Round:** a set of chains run and reported together.
- **Fresh tokens:** uncached input plus cache writes plus output.
- **Stage 1:** everything an agent needs to draw with grafical alone.
- **MVP bar:** what the checkpoint that says whether grafical succeeds must meet.

## What grafical answers

- **Refusal:** an operation that grafical will not apply.
  - Nothing is written, and the answer says what happened and which commands can change it.
- **Defect:** a problem that would draw wrong.
  - The write is refused.
- **Warning:** a problem in a picture that is written and drawn poorly.
  - It is reported and never refused.
- **Counts:** one record of facts about how the picture is drawn, such as crossings and bends.
  - Counts carry no threshold and no advice.
