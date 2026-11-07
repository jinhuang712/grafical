# 003. Rows unseen, groups as systems

Decided: 2026-10-11

## The problem

A layered diagram needs rows to place its boxes and a way to show which boxes form one system, without a band and a label drawn for every row.

## The choice

A layered architecture diagram reads from top to bottom: callers, entry points, services, messaging, storage. Each layer is a row, and the nodes in a layer sit side by side in their order. Rows are not drawn: no band, no row label in the picture. A layer's label stays in the file and in `show`, for agents. The one exception is a layer an edge ends at, drawn as a band ("Lines that end at containers").

A group is a system, such as "catalog-sync" around its relay, topics and pipelines. Its members may sit in several rows. The engine draws the group as one box around them, and keeps every non-member out of the box. Groups nest up to three levels.

## Not chosen

- Labelled bands for every row.
  - They frame the picture by row, which is rarely what a reader needs.
  - They use a column of width on labels.
- Groups within one row only.
  - A system almost always spans rows, so this could not draw the systems that make an architecture diagram readable.

## Consequences

A group's box stretches over a row between two of its rows that holds no member, and that row's nodes sit wholly left or right of the box. A row is drawn only when a line ends at it or it has a look. Blind judges scored a hand-drawn grouped target 57 of 60, and the engine's banded output 22.
