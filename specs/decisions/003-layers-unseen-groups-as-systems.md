# 003. Layers unseen, groups as systems

Decided: 2026-10-11

## The problem

A layered diagram needs layers to place its nodes and a way to show which nodes form one system, without a band and a label drawn for every layer.

## The choice

A layered architecture diagram reads from top to bottom: callers, entry points, services, messaging, storage. Each layer is a layer, and the nodes in a layer sit side by side in their order. Layers are not drawn: no band, no layer label in the picture. A layer's label stays in the file and in `show`, for agents. The one exception is a layer an edge ends at, drawn as a band ("Edges that end at containers").

A group is a system, such as "catalog-sync" around its relay, topics and pipelines. Its members may sit in several layers. The engine draws the group as one frame around them, and keeps every non-member out of the frame. Groups nest up to three levels.

## Not chosen

- Labelled bands for every layer.
  - They frame the picture by layer, which is rarely what a reader needs.
  - They use a column of width on labels.
- Groups within one layer only.
  - A system almost always spans layers, so this could not draw the systems that make an architecture diagram readable.

## Consequences

A group's frame stretches over a layer between two of its layers that holds no member, and that layer's nodes sit wholly left or right of the frame. A layer is drawn only when an edge ends at it or it has a look. Blind judges scored a hand-drawn grouped target 57 of 60, and the engine's banded output 22.
