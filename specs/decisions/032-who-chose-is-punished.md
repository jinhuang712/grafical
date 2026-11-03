# 032. Who chose is punished

Decided: 2026-10-14

## The problem

Asked for by the owner on 2026-10-14, on the public brief's draft with steps: "we should punish things like this". The owner named a box placed far from the two boxes it connects to, "making so unncessarily long edges"; two lines between a box and the box right under it "bent for no reason"; and the staircase of a busy box's lines. A rule against rows that hold stores and services together was rejected: "thats a taste problem". Who punishes follows who chose ("Defects owned by who can fix them", "Steps from another box"): what the engine chose, it must avoid; what the agent stated, refuses the write.

## The choice

- **A line bent for no reason** is an engine defect, `needless-bend`: a line between boxes in neighbouring rows, from the upper one's bottom into the lower one's top, that bends although each of its ports lies within the other box's side. The router places bottom sides before top sides, and a busy box's ports can be pushed off the middle by their neighbours; a line that can run straight down now meets the port its upper box took. On the public brief's draft, catalog-sync's two lines to and from the retry topic right under it ran straight, and the draft lost 4 of its 27 bends. 3,000 fuzz seeds show none.
- **A box beside every box it connects to**, with lines to two or more boxes whose centres lie at least its own width apart, wholly left or right of them. Where the engine chose the slot, the route cost counts it as a crossing, and the slot search compares the whole route cost (crossings plus lines over two bends plus such boxes, then crossings, bends and length) instead of crossings alone, which changes "The engine picks a new box's slot". The 74 drafts of the last three rounds (p1d-help2, p1d-help3, p1e-records), rebuilt as one batch each with both changes, have 656 bends instead of 684, 90 crossings instead of 93, and 8 drafts with such a box instead of 11. In the one of the 8 looked at, moving the box between its two users adds a crossing or two that its rows make certain. Where the agent placed the box by steps ("Steps from another box"), the agent chose its cell, so it is an agent defect, `box-aside`, that fails the write and names the boxes it connects to.
- **The staircase** of a busy box's lines is not punished yet. On the public brief's draft it comes from the boxes that sit under the busy box's own column in a row its lines must pass, so that its lines step around them; the owner proposed spreading the boxes apart so that the lines have room. Not yet decided.

## Not chosen

- Rows that mix stores with services or outside services. Which boxes share a row is the agent's choice, a matter of taste ("Steps from another box", the owner on 2026-10-14).
- Refusing a box beside its users in a row. The file does not tell a slot the agent stated from one the engine chose, so the agent would be refused for the engine's choice.
- Drawing with no grafical at all. Opus 5.5, given the same brief and prompt with any tool, drew it with Graphviz in 65 seconds for $0.39: every kind in a band of its own, but curved lines that cross many times, small text and details the brief did not ask for. The owner: "wayyyyyyyy worse".

## Consequences

A slot the engine chose counts against it in the route cost. Since "The agent states every order" the agent chooses every slot, so the rule rarely applies.
