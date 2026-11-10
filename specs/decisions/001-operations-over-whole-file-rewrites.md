# 001. Operations over whole-file rewrites

Decided: 2026-10-11

## The problem

An agent that changes a diagram by writing the whole file again changes parts nobody asked about, and a weak model rewrites more than it should.

## The choice

Every change is a named operation: `node.set`, `edge.set`, `node.move`, `layer.remove`. grafical applies it to the diagram file. Agents never write the file directly. grafical validates the file on every load, and refuses a file that fails with the same errors an operation would get.

## Not chosen

Agents writing the whole file. That is the one-shot pattern this project exists to replace. Each rewrite can change parts nobody asked about, and a weak model rewrites more than it should.

## Consequences

Every new ability needs an operation. A file written by hand is read with the same checks an operation gets.
