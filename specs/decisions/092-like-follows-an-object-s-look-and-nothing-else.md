# 092. `like` follows an object's look and nothing else

Decided: 2026-11-06

## The problem

`like` was to make a group hold what another group holds, with paths into it and overrides on those paths. The owner holds that `like` speaks of looks and not of structure or place. Objects are to bind looks of their own later, and then they need a way to inherit them.

## The choice

A node, an edge, a group or a lane may name another object with `like`, and it then takes that object's look and changes with it. It takes no members, no place and no shape. A follower may itself be followed, and a cycle is refused. The object it names is of its own sort. What it follows sits under its own styles and over its type, so the order is object, style, `like`, type, theme.

## Not chosen

- A group that holds what another holds.
  - It mixes structure into a word about looks, and it needs paths and overrides.
- `like` on groups only.
  - Every object that marks a style would then wait for a second round.
- `like` above the styles.
  - A style marked on a follower would change nothing that `like` brought.
- `like` below the type.
  - A type speaks of a whole sort, and `like` of one object.
- Leaving `like` out and marking the same styles.
  - It holds only until an object has a look of its own.

## Consequences

`group --copy` stays, as the way to build a second zone. An agent places a follower where it wants, as any other object.
