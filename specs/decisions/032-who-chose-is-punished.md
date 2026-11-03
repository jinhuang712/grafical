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
- **A box beside every box it connects to** lies wholly left or right of them.
  - It has lines to two or more boxes whose centres lie at least its own width apart.
  - Where the engine chose the slot, the route cost counts it as a crossing.
  - The slot search then compares the whole route cost instead of crossings alone, which changes "The engine picks a new box's slot".
    - The whole route cost is crossings plus lines over two bends plus such boxes, then crossings, bends and length.
  - The 74 drafts of the last three rounds were rebuilt as one batch each with both changes.
    - The rounds were p1d-help2, p1d-help3 and p1e-records.
    - They have 656 bends instead of 684 and 90 crossings instead of 93.
    - 8 drafts have such a box instead of 11.
  - In the one of the 8 looked at, moving the box between its two users adds a crossing or two that its rows make certain.
  - Where the agent placed the box by steps, the agent chose its cell ("Steps from another box").
  - So it is the agent defect `box-aside`, which fails the write and names the boxes it connects to.
- **The staircase** of a busy box's lines is not punished yet.
  - On the public brief's draft it comes from the boxes that sit under the busy box's own column in a row its lines must pass, so that its lines step around them; the owner proposed spreading the boxes apart so that the lines have room.
  - Not yet decided.

## Not chosen

- Rows that mix stores with services or outside services.
  - Which boxes share a row is the agent's choice and a matter of taste ("Steps from another box"; the owner on 2026-10-14).
- Refusing a box beside its users in a row.
  - The file does not tell a slot the agent stated from one the engine chose, so the agent would be refused for the engine's choice.
- Drawing with no grafical at all.
  - Given the same brief and prompt with any tool, Opus 5.5 drew it with Graphviz in 65 seconds for $0.39.
  - It put every kind in a band of its own.
  - It drew curved lines that cross many times, small text and details the brief did not ask for.
  - The owner: "wayyyyyyyy worse".

## Consequences

A slot the engine chose counts against it in the route cost. Since "The agent states every order" the agent chooses every slot, so the rule rarely applies.
