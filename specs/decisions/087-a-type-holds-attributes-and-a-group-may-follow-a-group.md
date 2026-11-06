# 087. A type holds attributes, and a group may follow a group

Decided: 2026-11-06

Replaced in part by specs/decisions, "`like` follows an object's look and nothing else": a follower holds no members, and `group copy` stays.

## The problem

A class that held nodes and edges drew two zones from one template, and the owner saw that this is only a group. A second idea of structure was not needed.

## The choice

What a node or an edge is called its type, written `type` on the object and declared with `<type>`. A type holds attributes only. A group may follow another group with `like`, and it then holds what that group holds and changes with it. A node inside a follower is reached by a path, such as `@zone-b.web`.

## Not chosen

- A class that holds structure, with instances.
  - It is a group under a second name.
- Copying a group and leaving the copy alone.
  - The two drift apart, as `group copy` does.
- Giving each copy its own IDs.
  - It loses the link.

## Consequences

`group copy` gives way to `like`. How an agent overrides one node inside a follower is by its path. A follower of a follower, and a cycle of followers, need a rule when it is built.
