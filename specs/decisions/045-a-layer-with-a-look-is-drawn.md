# 045. A layer with a look is drawn

Decided: 2026-10-18

## The problem

Decided by the owner on 2026-10-18. In round p1g (bench/results/p1g-stage1.md), 8 of the 49 chains' reflections said the names they gave layers never appeared in the picture. A layer was drawn only when an edge ended at it ("Layers unseen, groups as systems", "Edges that end at containers"), and `layer look` chose only between a box and a band for such a layer, so an agent had no way to show one. The owner's rule: unseen is the default, not always. A layer with something visible is drawn; a layer with nothing visible is not.

## The choice

- **When a layer is drawn.** When an edge ends at it as before, or when the agent gives it a look with `layer look <row> box|band`.
  - A layer with neither is not drawn, so a diagram with no look draws as it did byte for byte.
- **How it is drawn.** As a layer an edge ends at ("A layer with no node as one bar"):
  - One with nodes as a band around them, with its name in the band's head.
  - One with no nodes as one bar, with its name in it.
  - The look chooses a box's paint or the band's.
- **A bar for its look alone.** A layer with no nodes and a look is a bar like one an edge ends at, and is checked as one.
  - An edge that passes it is refused as `bar-crossed` unless `edge pass` lets it, since "A layer with no node as one bar" refused a gateway drawn under edges that run over it without saying so.
  - A bar between the first and last layers of a group is refused as `bar-in-group` on the layer's look.
  - `layer look` takes the look away and is among the commands that can change it ("Refusals say what happened and which commands can change it").
- **Measured.** None of the 329 saved drafts and none of the 17 fixtures sets a look, and none changed.
  - Neither did any of the 2,000 fuzz seeds.
  - The fuzz test now gives a layer with nodes a look in two seeds of ten.
  - It adds a bar with a look and no edge in one seed of ten, on a stream of its own.
  - With it, 480 of 2,000 seeds changed with no engine-owned defect added.
    - Bends rose from 146,792 to 146,820 and crossings fell from 166,128 to 166,095.
  - The most bends came from a band's name in its head where no edge runs down: seed 919, 15 more.
  - The most crossings came from a bar between two layers: seed 795, 15 more.
  - The fixture clinic-rows draws an undrawn layer and a bar an edge ends at.
  - It also draws a band and a bar drawn for their looks alone.

## Not chosen

- Every layer's name drawn at the left of its layer.
  - "Layers unseen, groups as systems" rejected a label column for every layer: it frames the picture by layer and takes a column of width.
  - It would also change every picture, where a look changes only the layers the agent wants seen.
- A look that counts only once an edge ends at the layer, as until now.
  - The agent who names a layer and wants it seen has no way to say so.

## Consequences

A layer with neither an edge ending at it nor a look stays unseen, and `label` stays optional.
