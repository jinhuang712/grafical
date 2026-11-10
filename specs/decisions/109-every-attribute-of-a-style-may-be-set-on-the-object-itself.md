# 109. Every attribute of a style may be set on the object itself

Decided: 2026-11-10

## The problem

A look, the room around an object and a node's size came only from the styles an object marked. Coloring or widening one node took two commands: a style, then its mark. The first form of "A node may take a look of its own" let a node hold its colors itself, and a later rewrite of the documents left only styles.

## The choice

- Every attribute a style holds may also be set on an object it fits, with a flag of the same name, such as `node --set api --fill "#fdd"`.
- An object's own value beats its styles, its styles beat what it follows with `like`, that beats its type, and the type beats the stylesheet.
- `-` gives the attribute back to the styles.
- Each way serves its own situation:
  - One object: set it on the object.
  - Many objects or a look a team shares: a style.

## Not chosen

- Styles only.
  - One colored node took two commands.
- The object only.
  - A team could not change one look in one place.
- Both ways for sizes only.
  - An agent would have to remember which attributes take which way.

## Consequences

Every noun's `--set` takes the flags of the style attributes that fit it, so its help grows. "One shortest way for each situation" holds, since each way is the shortest in its own situation.
