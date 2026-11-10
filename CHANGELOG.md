# Changelog

What changed in each release of grafical, from the side of the agent that draws and the person who asks.

## Unreleased

grafical has not been released; the first release will be 0.1.0, and it holds what follows.

### The command line

- Every command reads `grafical -f <file> <noun> --<verb> <ids>`, as in `grafical -f a.grafical edge --set a-b --from a --to b`.
- Every noun takes `--set` to make or change an object, `--move` to place it and `--remove` to remove it.
- One command is one write, and a shell chains many commands in one call.
- `--try` on a command that writes shows the counts it would give, and writes nothing.
- `--help` on every command is the whole reference, and a wrong command names the right one.

### Drawing

- An agent states facts and never a coordinate: a node's layer and its order, an alignment, a column, steps from another node, a group, a lane.
- grafical places every node, routes every edge through the gaps and draws the picture again after every change.
- A change keeps every fact it does not name.
- Groups nest, lanes say who owns what, walls keep edges apart, and notes sit on a node, an edge or a group.
- An edge may take a side, a weight, a step's number, arrowheads at both ends and a label that sits on it.
- An agent steers an edge with facts: where it passes, that it runs straight, which trunk it shares, where it bends and how far it reaches.
- Edges are drawn square or round with `diagram --set --lines`.

### Looks

- Three built-in stylesheets that `grafical library` lists, and a stylesheet of your own is a `.grafical` file that starts from one and changes any color, width or type size.
- Any object may mark named styles, and where two say the same thing the later one in the file wins.
- A style sets margins on each side, and the diagram's style sets the room between layers and between nodes, as CSS does.
- A legend names what each line style, width and mark means.

### What the agent reads back

- Every answer starts with one keyword such as `WRITTEN` or `REFUSED`, and its records follow in sections in tags.
- A refused write says what happened and which commands can change it.
- A write says what it made, changed and removed, and the warnings it brought or cleared, such as crossings and crowded labels.
- `show` prints the diagram as facts, `diff` prints a change as command lines a shell replays, and `check --all` reports defects and counts.

### Output

- One `.grafical` file of objects, types and styles holds a diagram.
- `render` writes an SVG and a PNG that are the same on macOS and Linux.
- `view` opens a window that redraws on every change.
