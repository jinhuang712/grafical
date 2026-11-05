# Glossary

The words grafical uses, one name for each thing. Each entry gives the meaning, the names that lost (so a search still finds them), and the name in code or on the command line when it differs.

## The picture

- **Row:** a line of boxes with an order.
  - A row is not drawn unless it has a look or a line ends at it.
  - Lost names: *layer* and *slot* for a place in a row, which now names only a mark's place.
  - In code and on the command line: `layer`.
- **Box:** an element of the picture with a kind, a label and an optional sublabel.
  - Lost name: *node*.
  - In code and on the command line: `node`.
- **Line:** a connection between two ends.
  - Each end is a box or a group or a row or a lane.
  - Lost names: *edge*, *connection*.
  - In code and on the command line: `edge`.
- **Group:** a system drawn as one frame around its members.
  - Its members may sit in several rows, and groups may nest.
- **Lane:** a labelled band that says who owns what.
  - All lanes of a diagram run one way, as rows or as columns.
  - Lost name: *swimlane*.
- **Column:** a second placement fact beside rows.
  - Nothing is drawn for it.
- **Wall:** empty space between two parts of the picture.
  - Lines cross it only where it allows.
- **Note:** a short text attached to a box, a line or a group.
  - It is drawn as a card or as a footnote.
- **Bar:** a row with no box that a line ends at.
  - It is drawn as one 40 px bar across the picture, such as a gateway.
- **Band:** a row with boxes that a line ends at, drawn as one band around them.
- **Choice:** a small diamond with no text, where a line splits into several.
  - Not the same as `decision`, a diamond with text inside.

## What a box or a line carries

- **Kind:** says what a box or a line is, and decides how it is drawn.
- **Mark:** a small image on a box: an emoji or a short text or a file.
  - At most five, one in each slot.
  - Lost name: *icon*.
  - In code and on the command line: `icon`.
- **Slot:** one of the five places a mark takes on a box: a corner or `left`.
  - On the command line: `--slot`.
- **Weight:** how thick a line is, a level or a width in pixels.
- **Emphasis:** at most two boxes that stand out.
  - Lost name: *accent*.
  - In code: `accent`.
- **Legend:** the key in the top right.
  - It says only what the agent named.

## How lines are drawn

Checked against `src/layout/` and `src/render/` on 2026-11-04.

- **Gutter:** the space between two neighbouring rows, where lines run across.
- **Gap:** the space between two neighbouring boxes of one row.
- **Run:** one straight horizontal or vertical piece of a line.
  - Lost names: *stretch* and *segment* and *part*.
- **Track:** one of the rows of a gutter or one of the columns of a gap that a run takes.
- **Corridor:** a column of the grid empty in every row a line passes, which the line runs down.
- **Port:** the place where a line meets a side of a box.
- **Bundle:** lines of one style and weight that leave one side of a box through one port and split near their targets.
  - Lost name: *bus*.
  - In code: `bus`.
- **Fan-in:** lines that enter one crowded side of a box through one port.
- **Stand-in:** the box that a line to a group, a row or a lane is routed to before it is cut at the container.
- **Hop:** the small arc where one line passes over another.
- **Seat:** a place a text outside a box may take, such as a line's label or a group's title.
  - In code: `slot`.

## Operations and files

- **Operation:** a named change to a diagram, such as `node.add`.
  - The only way a diagram changes.
- **Batch:** many operations applied together, all or nothing.
- **Diagram file:** `<name>.grafical.yaml`.
  - It holds facts and never a coordinate.
- **Stylesheet:** the file `<name>.grafical-style.yaml` that overrides a theme's colors, widths and type sizes.
- **Theme:** a built-in look: `default`, `dark` or `print`.
- **Step:** two meanings today.
  - A box is placed some *steps* from another box, which is placement.
  - A line carries a numbered *step*, which is part of a process.
  - Neither has won yet.

## The benchmarks

- **Brief:** a description of a system that an agent draws from.
  - A public brief is fictional, and a private brief describes a real system.
- **Arm:** what an agent draws with in a benchmark, such as grafical or nothing.
  - **Drawing directly** is the arm with no tool.
- **Chain:** one agent session, from a first draft through its change requests.
- **Round:** a set of chains run and reported together.

## What grafical answers

- **Refusal:** an operation that grafical will not apply.
  - Nothing is written, and the answer says what happened and which commands can change it.
- **Defect:** a problem that would draw wrong.
  - The write is refused.
- **Warning:** a problem in a picture that is written and drawn poorly.
  - It is reported and never refused.
- **Counts:** one record of facts about how the picture is drawn, such as crossings and bends.
  - Counts carry no threshold and no advice.
