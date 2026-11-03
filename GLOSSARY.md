# Glossary

The words grafical uses, one name for each thing. Each entry gives the meaning, the names that lost (so a search still finds them), and the name in code or on the command line when it differs. Behavior is in [FEATURES.md](FEATURES.md).

## The picture

- **Row:** a line of boxes with an order. A row is not drawn unless it has a look or a line ends at it. Lost names: *layer*, and *slot* for a place in a row. In code and on the command line: `layer`.
- **Box:** an element of the picture, with a kind, a label and an optional sublabel. Lost name: *node*. In code and on the command line: `node`.
- **Line:** a connection between two ends, each a box, a group, a row or a lane. Lost names: *edge*, *connection*. In code and on the command line: `edge`.
- **Group:** a system, drawn as one frame around its members, which may sit in several rows and may nest.
- **Lane:** a labelled band that says who owns what. All lanes of a diagram run one way, as rows or as columns. Lost name: *swimlane*.
- **Column:** a second placement fact beside rows. Nothing is drawn for it.
- **Wall:** empty space between two parts of the picture. Lines cross it only where it allows.
- **Note:** a short text attached to a box, a line or a group, drawn as a card or as a footnote.
- **Bar:** a row with no box that a line ends at, drawn as one 40 px bar across the picture, such as a gateway.
- **Band:** a row with boxes that a line ends at, drawn as one band around them.
- **Choice:** a small diamond with no text, where a line splits into several. Not the same as `decision`, a diamond with text inside.

## What a box or a line carries

- **Kind:** says what a box or a line is, and decides how it is drawn.
- **Mark:** a small image on a box: an emoji, a short text or a file. At most five. Lost name: *icon*. In code and on the command line: `icon`.
- **Weight:** how thick a line is, a level or a width in pixels.
- **Emphasis:** at most two boxes that stand out. Lost name: *accent*. In code: `accent`.
- **Legend:** the key in the top right. It says only what the agent named.

## How lines are drawn

These four are taken from how the documents use them, and are not yet checked against the code.

- **Gutter:** the gap between two neighbouring rows, where lines run sideways.
- **Port:** the place where a line meets a side of a box.
- **Bundle:** three or more unlabelled lines of one style that leave one side of a box as one line, and split near their targets.
- **Hop:** the small arc where one line passes over another.

## Operations and files

- **Operation:** a named change to a diagram, such as `node.add`. The only way a diagram changes.
- **Batch:** many operations applied together, all or nothing.
- **Diagram file:** `<name>.grafical.yaml`. It holds facts and never a coordinate.
- **Stylesheet:** `<name>.grafical-style.yaml`, which overrides a theme's colors, widths and type sizes.
- **Theme:** a built-in look: `default`, `dark` or `print`.
- **Step:** two meanings today. A box is placed some *steps* from another box, which is placement, and a line carries a numbered *step*, which is a process. Neither has won yet (TODO.md, "One word, two steps").

## What grafical answers

- **Refusal:** an operation that grafical will not apply. Nothing is written, and the answer says what happened and which commands can change it.
- **Defect:** a problem that would draw wrong. The write is refused.
- **Warning:** a problem in a picture that is written and drawn poorly. It is reported and never refused.
- **Counts:** one record of facts about how the picture is drawn, such as crossings and bends, with no threshold and no advice.
