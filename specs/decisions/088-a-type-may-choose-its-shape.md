# 088. A type may choose its shape

Decided: 2026-11-06

## The problem

A node's shape came with its type, so an agent that wanted one look had to take a shape it did not mean.

## The choice

`shape` is an attribute of a type, chosen from the shapes grafical draws. The built-in types keep their shapes. One node cannot change its shape, so one type has one shape and a reader can trust it.

## Not chosen

- A shape on one node.
  - A reader could no longer trust a shape.

## Consequences

A shape no longer says one thing across diagrams, so a type with its own shape needs the legend to say what it means.
