# 008. Defects owned by who can fix them

Decided: 2026-10-11

## The problem

Some defects only the agent can fix and others only the engine can avoid. A write refused for the engine's mistake leaves the agent retrying in vain.

## The choice

After each operation or batch, grafical lays out the diagram and checks it. Each defect has an owner: whoever can fix it.

| Defect | Owner |
|---|---|
| Text that overflows its box | Agent: shorten the label or take a larger size step |
| A character the bundled fonts cannot draw | Agent: replace it |
| Two nodes that overlap | Engine |
| An edge that crosses a node | Engine |
| Two labels that collide | Engine |
| Two edges that share a segment, so a reader cannot tell them apart | Engine |
| A line that crosses text: a node's or an edge's label. The side of a group, a lane or a band counts as a line across an edge's label | Engine |
| A line across a group's label ("The agent states where a group's label sits") | Agent: take a place the refusal names clear |
| A line's label, or a step's badge, that no gutter of its path holds clear of the other lines, a wall's label that no place along its wall holds clear, or a note's card with no place beside its target ("The dirty work has edges") | Agent: shorten or drop the text, change rows, or make the note a footnote |
| A non-member inside a group's box | Engine |
| A line that bends between two boxes that one x would have joined straight ("Who chose is punished") | Engine |
| A box placed by steps beside every box it connects to ("Who chose is punished") | Agent: place it between them |
| A step's badge that touches a box, another line, a text or another badge ("Step badges ride the line") | Engine |

A write that leaves an agent-owned defect fails and changes nothing. The defect names its elements, the field and the text at fault, and facts: the lines the text takes and the most it may, and the characters no font can draw; and the commands that can change it ("Refusals say what happened and which commands can change it").

Engine-owned defects are about where lines and boxes go, which no operation controls ("Facts over coordinates"). The engine must avoid them itself, with the room "Layout computed again on every change" allows: the next gutter step, more track or port separation, another label slot. If it still leaves one, that is an engine bug. The write goes ahead, the agent is never told, and `grafical check --all` reports it so that benchmarks and tests count it. The checker does not count the shared trunk of a bus as an overlap. A bus is a fan-out of unlabelled edges in one line style from one node ("Our own gap router").

Text is checked against its line box, which includes the fonts' full ascent and descent. The box must stay 8 px from the node's sides and 4 px from its top and bottom.

## Not chosen

- Warnings for agent-owned defects, because a picture with a known defect looks like success.
- Checking only at render time, because the error then surfaces long after the operation that caused it.
- Failing the write on engine-owned defects, as this decision first said. The phase 1 measuring run showed the cost: Haiku met an edge overlap and a label collision that only the router could fix, retried 11 times, and gave up.

## Consequences

An engine bug can reach a picture without the agent knowing, so the fuzz test keeps looking for engine-owned defects.
