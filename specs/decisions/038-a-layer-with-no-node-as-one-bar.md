# 038. A layer with no node as one bar

Decided: 2026-10-16

## The problem

Decided by the owner on 2026-10-16. Redrawing the dispatch diagram, the owner said "gateway becomes a horizontal long layer". An edge could already end at a layer, drawn as a band across the content ("Edges that end at containers"), but a layer with no node was refused as `empty-container`. So a gateway or a message bus had to keep a node inside its band, and the picture said "gateway" twice: once as the band and once as the node.

## The choice

Now a layer with no node may be an edge end when the edge's other end holds a node, and it is drawn as one bar across the content with its label in it. A layer with no node that no edge ends at is drawn as before, and a layer that holds nodes is still a band.

- **One bar, 40 px high** with its label in it at the left.
  - No edge runs over the label, and none moves for it ("Unreadable is refused and costly is reported").
  - Until 2026-10-19 the label was seated before the edges and clear only of the edges that end at the bar.
  - The router kept every edge that passes the bar off it.
  - Redrawing a microservices diagram, an edge from a service to its database went round the bar's name with four bends.
  - Seating the label after the edges changed 103 of 2,000 fuzz seeds:
    - Bends went from 146,809 to 146,643.
    - `label-blocked` went from 7 to 0.
    - `title-blocked` went from 3 to 1.
    - The engine-owned `needless-bend` went from 334 to 332.
  - None of the 329 saved drafts changed.
- **Edges meet it straight past their other ends.** The engine adds no node to the file or the picture.
- **Edges that pass it say so.** An edge from a layer above the bar to a layer below it that does not end at it is refused as `bar-crossed` unless it says it may, with `edge add --pass` or `edge pass`.
  - The owner chose this on 2026-10-16 when asked why a passing edge never touched the bar.
  - A reader takes an edge drawn over a gateway for an edge through it, so the agent states each edge that goes past.
  - The flag is named for its records: `across` was already the count of edges through a stranger's group ("Composition counts").
- **Its look is the agent's.** `layer look <row> box|band` draws it as a box or a band.
  - A box is a service node's paint with a dark label: the bar is the gateway or the bus itself, not a container.
  - On 2026-10-16 the owner asked for both to be chosen through the command line, since looks are the agent's.
- **What cannot hold is refused.** An edge between two layers with no node is refused as `bar-to-bar`: neither end says where the edge goes across.
- **Tested.** The fuzz test puts a bar in three seeds of ten; over 500 seeds, 89 diagrams have a bar.
  - None of the 306 saved drafts and none of the 15 fixtures changed, since an edge to a layer with no node was refused until now.
  - While it was built the fuzz test found two ways an edge from a bar crossed a group's label, both fixed.

## Not chosen

- An edge that passes the bar drawn over it with no fact.
  - The prototype did this; the owner asked why such an edge never touched the bar.
- An opening cut in the bar where an edge passes, as a hop marks a crossing.
  - Shown to the owner, not chosen; many passing edges would draw the bar in pieces.
- Charging a pass like a crossing, so that the router goes round the bar's end when it can.
  - It hides the question of whether the edge goes through the gateway instead of asking it.
- Passing edges only round the bar's ends.
  - Long edges with more bends, for the reason "Walls as space" left routing round a partial obstacle for later.
- An allow list on the layer, as a wall has.
  - The owner asked for a flag on the edge.
- One look for every bar, set only in a stylesheet.
  - A gateway and a layer in one picture may want different looks.
- A node's height for the bar, 56 px at medium.
  - It would read as one very wide node.
- A band's head and padding around an empty layer, about 104 px with the label above the layer.
  - Most of it would be empty.
- The label centred in the bar.
  - Groups, bands and walls put their labels at the left.

## Consequences

A bar takes 40 px instead of a band's head and padding. An edge that passes a bar is refused unless the agent lets it.
