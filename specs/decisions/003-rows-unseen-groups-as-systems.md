# 003. Rows unseen, groups as systems

Decided: 2026-10-11

A layered architecture diagram reads from top to bottom: callers, entry points, services, messaging, storage. Each layer is a row, and the nodes in a layer sit side by side in their order. Rows are not drawn: no band, no row label in the picture. A layer's label stays in the file and in `show`, for agents. The one exception is a layer an edge ends at, drawn as a band ("Lines that end at containers").

A group is a system, such as "catalog-sync" around its relay, topics and pipelines. Its members may sit in several rows. The engine draws the group as one box around them, with its label at the top left, and keeps every non-member out of the box. Groups do not nest in stage 1.

Changed on 2026-10-12 (owner's decision): a group's members no longer need neighbouring rows. A row between two of its rows that holds no member, such as a row an agent adds inside a system for a write buffer, used to be refused (`group-gap`); now the box stretches over it, and that row's nodes sit wholly left or right of the box, each on the side the nodes it connects to are, and on the right when nothing says otherwise. In stage 1, the one grafical change step that failed on its own merits was this refusal.

Changed on 2026-10-16: a group's label sits in its head at the leftmost seat that leaves the centre of every first-row member free that a line enters or leaves by its top, so those lines run straight through the centres; it is at the top left only when nothing enters there. Until then, when no seat did, a line was pushed off centre instead: in a booking C4 diagram, "Booking app  software system" was wider than the room between the lines into the group's three first-row boxes, and the traveller's line met the web app at its left edge, where the owner drew it through the centre. Now the first two such members move apart until the label fits between their lines, and only a label with no seat at all still grows the box to the right. Over the 306 saved drafts, eight changed, each 24 to 48 px wider, with bends and crossings unchanged; straight lines between boxes that share a centre but run off it fell from 169 to 162. The big-bank fixture's "visits bigbank.com/ib" now meets the web application at its centre, 32 px wider. Over 2,000 fuzz seeds, three diagrams changed.

Changed on 2026-10-17 ("The dirty work has edges"): no box and no line moves for a group's label. The engine seats a label the agent did not place once the lines are drawn, at the leftmost seat in the head that no line and no line's label comes near; where none is, the write is refused as `title-blocked`, and the agent states a place ("The agent states where a group's label sits").

Changed on 2026-10-18 ("A row with a look is drawn"): a row the agent gives a look is drawn too, with its label, though no line ends at it. A row with neither is still not drawn.

This decision changed on 2026-10-11, after blind judging. The first version drew each layer as a labelled band and kept groups within one row. Two Opus judges scored a hand-drawn grouped target 57 of 60, and the engine's banded output 22 ("A target picture with measured rules").

Rejected:
- Labelled bands for every row. They frame the picture by row, which is rarely what a reader needs, and they use a column of width on labels.
- Groups within one row only. A system almost always spans rows, so this could not draw the systems that make an architecture diagram readable.
- Nested groups, for stage 1.

Reversed in part on 2026-10-12: groups nest, up to three levels, for deployment diagrams ("Every layered diagram type").
