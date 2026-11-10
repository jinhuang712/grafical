# 064. A note is what the agent states

Decided: 2026-10-17

## The problem

A card with no room became a footnote the agent never asked for: 61% of the notes over 2,000 fuzz seeds.

## The choice

- **A note** is a card or a footnote as the agent states, no longer a card the engine turns into a footnote ("Notes as callouts or footnotes").
  - A card with no room is refused.
  - Built on 2026-10-17, and stated today as `note --set --footnote on`.
    - The file holds `footnote: true` on the note.
    - `show` prints `footnote`.
    - A note without it is a card.
  - A card with no clear place beside its target takes its first place anyway.
  - The write is refused as `label-blocked` with `is=note`.
  - The refusal names the target, then the edges and nodes in the card's way.
  - The second layout pass is gone, and so with the walls' every second pass: a diagram is laid out once.
  - No saved draft and no fixture has a note.
  - Over 2,000 fuzz seeds the engine had made 1,201 of 1,967 notes footnotes by itself: 61%.
  - Laid out by both engines, 637 diagrams changed and 1,204 cards are now refused.
  - Bends, crossings and engine-owned defects are unchanged.
  - Dense pictures seldom have room for a card, since nothing moves for one.
  - So an agent should expect to state footnotes there.

## Not chosen

- Keeping the fallback and reporting that it ran.
  - The engine would still choose the note's form for the agent.

## Consequences

Dense pictures seldom have room for a card, so an agent should expect to state footnotes there.
