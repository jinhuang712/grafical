# 032. Who chose is punished

Decided: 2026-10-14

## The problem

Asked for by the owner on 2026-10-14, on the public brief's draft with steps: "we should punish things like this". The owner named a box placed far from the two boxes it connects to, "making so unncessarily long edges"; two lines between a box and the box right under it "bent for no reason"; and the staircase of a busy box's lines. A rule against rows that hold stores and services together was rejected: "thats a taste problem". Who punishes follows who chose ("Defects owned by who can fix them", "Steps from another box"): what the engine chose, it must avoid; what the agent stated, refuses the write.

## The choice

- **A line bent for no reason** is an engine defect, `needless-bend`.
  - It is a line from the bottom of a box into the top of a box in the next row down.
  - It bends although each of its ports lies within the other box's side.
  - The router places bottom sides before top sides, and a busy box's ports can be pushed off the middle by their neighbours; a line that can run straight down now meets the port its upper box took.
  - On the public brief's draft, catalog-sync's two lines to and from the retry topic right under it ran straight.
  - The draft lost 4 of its 27 bends.
  - 3,000 fuzz seeds show none.
- **A box beside every box it connects to** lies wholly left or right of them, with lines to two or more boxes whose centres lie at least its own width apart.
  - It costs longer lines, and every write warns of it as `node-aside` ("A box beside its neighbours is a warning").
- **The staircase** of a busy box's lines is not punished yet.
  - On the public brief's draft it comes from the boxes that sit under the busy box's own column in a row its lines must pass, so that its lines step around them; the owner proposed spreading the boxes apart so that the lines have room.
  - Not yet decided.

## Not chosen

- Rows that mix stores with services or outside services.
  - Which boxes share a row is the agent's choice and a matter of taste ("Steps from another box"; the owner on 2026-10-14).
- Drawing with no grafical at all.
  - Given the same brief and prompt with any tool, Opus 5.5 drew it with Graphviz in 65 seconds for $0.39.
  - It put every kind in a band of its own.
  - It drew curved lines that cross many times, small text and details the brief did not ask for.
  - The owner: "wayyyyyyyy worse".

## Consequences

An agent hears of such a box on every write and decides.
