# TODO

## ongoing

### [P1][DISCUSSION] How freely an agent can adjust a picture

- description:
  - The owner takes this one dimension at a time, and each decided one is in `specs/decisions/`.
  - Open: where a node sits beside another, where no gap has shown yet.
  - Open: where notes and step badges sit.
- created: 2026-11-05
- updated: 2026-11-06
- status: HALT
- next: the owner names the next dimension when a real picture shows a gap
- related: [055. A weak model draws well and a stronger one superbly](../specs/decisions/055-a-weak-model-draws-well-and-a-stronger-one-superbly.md)

### [P1][DISCUSSION] The legend needs a design of its own

- description:
  - The owner sees a legend as a small diagram.
  - A picture may have one or none.
  - Its entries may run across, down or in a grid.
  - It is open what goes in it and how each sample is drawn.
  - `diagram legend` explains line styles and widths and marks but not a node's fill.
  - A key of small nodes such as "Works" and "Bug" and "Fixed" is drawn as a group of plain nodes.
  - Every one of them gets `lonely-box`, six warnings for a picture that is right.
- created: 2026-10-30
- updated: 2026-11-06
- status: HALT
- next: the owner designs the legend in a talk of its own
- related: [057. A box may take a look of its own](../specs/decisions/057-a-box-may-take-a-look-of-its-own.md)

### [P2][DISCUSSION] A line that is a curve end to end

- description:
  - Lines are drawn square or round today.
  - The owner wants a third shape with no straight run.
  - A curve through a route's points cuts corners and can meet what lies beside it.
  - It is open what happens when it does.
- created: 2026-11-06
- status: HALT
- next: the owner designs it
- related: [059. Lines may be drawn square, round or smooth](../specs/decisions/059-lines-may-be-drawn-square-round-or-smooth.md)

### [P2][DISCUSSION] Small points of the .grafical file

- description:
  - A diagram's optional type and a node's `type` share a word, and the first needs a new name.
  - A colon after an attribute's name may stay or go.
  - A follower of a follower and a cycle of followers need a rule.
  - The attributes of `<style>` should grow to every look grafical can draw.
- created: 2026-11-06
- status: HALT
- next: settle each one when the file is built
- related: [The .grafical file](../specs/grafical-file.md)

### [P2][DISCUSSION] Labels sit close to the lines beside them in a crowded gutter

- description:
  - Four labelled lines out of one box run side by side in one gutter with each label 4 px from the next line.
  - The picture reads crowded though no warning fires.
  - Asking for 8 px everywhere made 421 of 500 fuzz diagrams 5.5% taller and the dispatch fixture 2 crossings worse.
  - Asking for 8 px only where a label finds room left the dispatch fixture 4 crossings worse.
  - An empty row between the two rows only lengthened the lines.
  - Neither try was landed.
- created: 2026-10-30
- status: HALT
- next: look again now that labels sit on their lines
- related: [066. A line's label sits on its line](../specs/decisions/066-a-line-s-label-sits-on-its-line.md)

### [P2][ISSUE] A label takes most of a short run

- description:
  - The `resync` label of the catalog-sync-grouped fixture sits on a run little longer than itself.
  - The line shows only two short pieces past the label, and the owner finds it less natural than the others.
  - A seat on a run keeps 8 px from each corner today.
- created: 2026-11-06
- status: OPEN
- found: the owner, looking at the catalog-sync-grouped fixture
- next: try a larger clearance, and try a label with a fill once labels mark styles
- related: [066. A line's label sits on its line](../specs/decisions/066-a-line-s-label-sits-on-its-line.md)

### [P2][ISSUE] Arrowheads land off centre and unevenly

- description:
  - The owner sees arrowheads that are sometimes far from the middle of a node's side.
  - Several arrowheads on one side are sometimes spread unevenly.
  - What should happen is not settled, and the rule for ports should be read before any change.
- created: 2026-11-06
- status: OPEN
- found: the owner, looking at the dispatch fixture drawn with `diagram --lines smooth`
- next: render the fixtures and list which sides break the even spread

### [P2][ISSUE] An arrowhead hidden at the far left of the dispatch fixture

- description:
  - The leftmost edge of the dispatch fixture, the dashed one from `push-provider` up to `rider-app`, has an arrowhead that a reader can barely see.
  - It runs up the picture's edge and turns into the node's left side at the very end.
  - The cause is not known.
- created: 2026-11-06
- status: OPEN
- found: the owner, looking at the dispatch fixture drawn with `diagram --lines smooth`
- next: render this edge with square lines to see whether `smooth` or the route hides the arrowhead
