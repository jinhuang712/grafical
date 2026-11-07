# 087. A type holds attributes

Decided: 2026-11-06

## The problem

A class that held nodes and edges drew two zones from one template, and the owner saw that this is only a group. A second idea of structure was not needed.

## The choice

What a node or an edge is called its type, written `type` on the object and declared with `<type>`. A type holds attributes only.

## Not chosen

- A class that holds structure, with instances.
  - It is a group under a second name.

## Consequences

A second zone stays the work of `group --copy` ("`like` follows an object's look and nothing else").
