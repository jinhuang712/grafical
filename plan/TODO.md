# TODO

## ongoing

### [P1][DISCUSSION] Whether a region's size multiple reaches its nodes

- description: Decision 080 lets a multiple set on a region reach every node in it, while decision 111 says an attribute means the same on every object and no margin reaches what lies inside its object. A region's `width` would then mean the width of its nodes and not its own.
- created: 2026-11-10
- blocks: CP2.5 "Size multiples"
- related: [080. A node's width and height take a multiple of its size](../specs/decisions/080-a-node-s-width-and-height-take-a-multiple-of-its-size.md) · [111. An attribute means the same on every object it fits](../specs/decisions/111-an-attribute-means-the-same-on-every-object-it-fits.md)

### [P2][DISCUSSION] Whether `show` gives each value's source

- description: Decision 089 and the file spec say `show` gives each value's source, and the code never did. `show <id>` lists the object's own values and the styles it marks.
- created: 2026-11-10
- found: building the attributes set on the object, 2026-11-10.
- next: the owner chooses between dropping the claim and building it.

### [P2][DISCUSSION] A step's badge keeps its edge type's color

- description: An edge with a color of its own, set on it or through a style, draws its line and arrowhead in that color, and its step badge in its type's.
- created: 2026-11-10
- found: building the attributes set on the object, 2026-11-10.
- next: the owner says whether a badge is part of the edge's ink.

### [P2][ISSUE] `--border-width` takes 0 where the help says 0.5 to 8

- description: `style --set` and every `--set` that takes `--border-width` accept 0, and the help and CLI.md say from 0.5 to 8.
- created: 2026-11-10
- found: building the attributes set on the object, 2026-11-10.
- next: refuse 0 or say that 0 draws no border.

### [P2][ISSUE] A style on a label that is not an edge's is dropped when read

- description: A `style:` in a `<label>` block whose owner is not an edge is dropped when the file is read, where DESIGNS "10. What grafical cannot fully read, it refuses" asks for a refusal.
- created: 2026-11-10
- found: building the attributes set on the object, 2026-11-10.
- next: refuse it as an unknown field, as a look on such a label already is.

### [P2][DISCUSSION] How fast one operation must be once a write lays out the diagram twice

- description: T2: Speed asks 50 ms an operation at 50 nodes, and one now takes up to 87.3 ms, since a write lays out the diagram as it was before to tell new warnings from old. A command takes 206 to 211 ms against its 400 ms.
- created: 2026-11-10
- status: HALT
- found: `pnpm bench speed` on the branch that built decision 108, against main: median 11.0 to 19.8 ms, worst 43.9 to 87.3 ms.
- next: the owner takes it up later, with options such as a target that counts both layouts or laying out the old diagram only when a warning could change.
- related: [T2: Speed](GOALS.md#t2-speed)

### [P2][ISSUE] The entry help's descriptions do not start at one column

- description: `grafical --help` prints the description of `show` · `diff` · `check` · `render` · `view` right after the name, and every other command's at one column further right. All of them should start at one column.
- created: 2026-11-10
- status: OPEN
- found: reading `grafical --help` while checking CLI.md, on main too.
- updated: 2026-11-10
- next: find where the commands with no verb get their padding.
