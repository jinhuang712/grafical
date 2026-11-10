# 083. A group or a lane may take a look of its own

Decided: 2026-11-06

## The problem

Every group drew alike and every lane drew alike, so color could not tell one system from a third party's.

## The choice

A group or a lane takes its fill and border from itself or from the styles it marks, as a node does ("A node may take a look of its own").

## Not chosen

- One look for all containers.
  - Nodes and edges already take their own, and an agent should learn one way.

## Consequences

A fill under a node can hide what the node's own colors say, and grafical does not judge that. The need rests on a guess that was not checked against agents' reports.
