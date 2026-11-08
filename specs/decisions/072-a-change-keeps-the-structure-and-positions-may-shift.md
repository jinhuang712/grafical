# 072. A change keeps the structure and positions may shift

Decided: 2026-11-06

## The problem

The guideline promised that only a fixed list of things may follow a change. The column grid is solved again after every change, so about half of all single operations moved nodes sideways in layers they did not touch, and the tests never held that list.

## The choice

A change keeps every fact it does not name:

- a layer
- an order
- a group
- a lane
- an alignment

Positions may shift. A reader learns a diagram's structure and not its pixels, as the owner confirmed on 2026-11-06.

## Not chosen

- Holding a fixed list of what may move.
  - The column grid would have to stop being solved as a whole, and only a few sideways moves would be saved.

## Consequences

A node can shift sideways after a change elsewhere, and the agent is not told. The stability tests measure that movement and do not limit it.
