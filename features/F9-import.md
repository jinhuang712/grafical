# F9: Import

```
F9: Import
├── F9.1: Mermaid files — start from a Mermaid file
├── F9.2: draw.io files — start from a draw.io file
├── F9.3: Excalidraw files — start from an Excalidraw file
└── F9.4: Someone else's picture — redraw a picture that has no source
```

A diagram started from an existing file instead of from nothing.

## F9.1: Mermaid files

A diagram started from a Mermaid file.

- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)

**Stories:**

- An agent imports a Mermaid file, to carry on from an existing diagram.

## F9.2: draw.io files

A diagram started from a draw.io file.

- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)

**Stories:**

- An agent imports a draw.io file, to carry on from an existing diagram.

## F9.3: Excalidraw files

A diagram started from an Excalidraw file.

- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)

**Stories:**

- An agent imports an Excalidraw file, to carry on from an existing diagram.

## F9.4: Someone else's picture

An agent given a picture someone else drew redraws the same content with grafical's operations, and grafical reads no image.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)

**Stories:**

- An agent redraws a picture, to carry on from a diagram that has no source file and improve its look.
