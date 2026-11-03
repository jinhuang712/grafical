# 001. Operations over whole-file rewrites

Decided: 2026-10-11

Every change is a named operation: `node.add`, `edge.add`, `node.rename`, `layer.move`. grafical applies it to the diagram file. Agents never write the file directly. People may read it, but editing it by hand is not supported in stage 1. grafical validates the file on every load, and refuses a file that fails with the same errors an operation would get.

Rejected: agents writing the whole file. That is the one-shot pattern this project exists to replace. Each rewrite can change parts nobody asked about, and a weak model rewrites more than it should.
