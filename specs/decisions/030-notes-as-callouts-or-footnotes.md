# 030. Notes as callouts or footnotes

Decided: 2026-10-14

## The problem

Decided by the owner on 2026-10-14. The phase planned notes: a short text that keeps detail out of extra boxes, attached to what it is about and placed by the engine. Asked whether a note should be a card beside its target or a numbered footnote, the owner chose "both, grafical picks" (behavior: FEATURES.md, "Notes").

## The choice

A card keeps clear of every box, line, text and other card, and stays inside the picture. Nothing is moved to make room for it, so a note never breaks stability ("Layout computed again on every change"). A card that found no room in the first layout became a footnote, and a second layout made room for the list. Changed on 2026-10-17 ("The dirty work has edges"): the agent states a footnote, `note add --footnote`, held as the note's `footnote: true`; without it a note is a card, and a card with no room takes its first place anyway and refuses the write as `label-blocked` with `is=note`, so that the agent shortens it or makes it a footnote. Each footnote entry starts with its target's name, so that a reader finds it even where no clear place for the number was found: the fuzz test found such lines among dense random ones. Footnotes are numbered in reading order of their targets.

How a card and a footnote find their places is in [text placement](../labels.md#notes).

## Not chosen

- Callouts only.
  - A dense picture has no room, and moving boxes to make room would break stability.
- Footnotes only.
  - A reader looks away from what the note is about, even when there is room beside it.
- A note that the agent places.
  - Where it goes is the engine's ("Facts over coordinates").
- Several notes on one target.
  - One note holds a sentence or two, and more is a box or a second diagram.

## Consequences

A note never moves anything, so it never breaks stability. A card with no room is refused, and the agent shortens it or makes it a footnote.
