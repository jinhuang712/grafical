# F6: Output

```
F6: Output
├── F6.1: The diagram file — one YAML file of facts
│   └── F6.1.1: The object model — objects, types and styles in a file of their own form
├── F6.2: Render — SVG and PNG, the same everywhere
├── F6.3: Live viewer — a window that redraws as the agent draws
└── F6.4: Diff — a change as operations
```

What a diagram leaves behind: one file in git, the pictures drawn from it, a window that shows them, and a change read as operations.

## F6.1: The diagram file

One YAML file, `<name>.grafical`, holds the whole diagram as facts: layers and nodes in order and groups and lanes and columns and walls and notes and lines. The picture on the front page of the README is drawn from [docs/images/pipeline.grafical](../docs/images/pipeline.grafical).

- grafical writes it in a fixed key order, so the same facts give the same bytes and a change reads as a small diff in git.
- It holds no coordinate.
  - A field that holds its default is left out.
- A file of a newer format or with a field grafical does not know is refused, never half read.

- **Design:**
  - [9. The same file gives the same picture on any machine](../DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)
  - [10. What grafical cannot fully read, it refuses](../DESIGNS.md#10-what-grafical-cannot-fully-read-it-refuses)
- **How it works:**
  - [The model](../specs/model.md)
  - [The .grafical file](../specs/grafical-file.md)
- **Why:**
  - [001. Operations over whole-file rewrites](../specs/decisions/001-operations-over-whole-file-rewrites.md)
  - [009. Git as the history](../specs/decisions/009-git-as-the-history.md)
  - [024. Same file exact, same facts mostly](../specs/decisions/024-same-file-exact-same-facts-mostly.md)

**Stories:**

- An engineer keeps one YAML file in git, to review and reproduce the picture.

### F6.1.1: The object model

A diagram becomes objects with attributes and relations, with types an agent can define and styles that objects mark. The file takes a form of its own, and a change still reads well in a diff.

- **How it works:** [The .grafical file](../specs/grafical-file.md)
- **Why:** [085. A diagram is objects with attributes and relations](../specs/decisions/085-a-diagram-is-objects-with-attributes-and-relations.md)

## F6.2: Render

`render` draws a diagram file as an SVG and a PNG.

```sh
grafical -f <file> render [--svg [<out>]] [--png [<out>]] [--scale 1-4]
```

- With neither flag, `render` writes `<name>.svg` and `<name>.png` beside the file.
  - One flag writes only that one.
- The SVG carries the title and a description for screen readers.
- The PNG is drawn with no browser, at a scale from 1 to 4.
- The same file gives the same SVG and the same PNG pixels on macOS and Linux.

- **Design:** [9. The same file gives the same picture on any machine](../DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)
- **How it works:** [The renderer](../specs/rendering.md)
- **Why:**
  - [007. Our own SVG writer](../specs/decisions/007-our-own-svg-writer.md)
  - [024. Same file exact, same facts mostly](../specs/decisions/024-same-file-exact-same-facts-mostly.md)

**Stories:**

- An agent renders the file, to hand a reader a picture.

## F6.3: Live viewer

A window that shows the diagram as it is now, while an agent draws it.

```sh
grafical -f <file> view [--port <n>] [--no-open]
```

- The window redraws within a moment of every change to the file from any process.
  - It briefly marks what changed.
- Beside the picture, a list says what each change did as operations.
  - The newest change comes first.
- The window opens at the picture's size and follows it.
  - It serves on 127.0.0.1 only, and only shows: nobody edits on it.
- While the file cannot be read, it keeps the last good picture and shows the errors.
- Ctrl-C stops it.

- **Stance:** [Who draws?](../PHILOSOPHY.md#who-draws)
- **How it works:** [The command line](../specs/ARCHITECTURE.md#the-command-line)
- **Why:** [017. A viewer that only shows](../specs/decisions/017-a-viewer-that-only-shows.md)

**Stories:**

- The owner watches a window that redraws, to see the work as it happens.

## F6.4: Diff

`diff` reports how the file differs from a git revision, `HEAD` by default, as a batch of operations that `apply` replays on the revision's file. Outside git it fails with `not-in-git`.

```sh
grafical -f <file> diff [<git-rev>]
```

- **Design:**
  - [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
  - [4. A change keeps every fact it does not name](../DESIGNS.md#4-a-change-keeps-every-fact-it-does-not-name)
- **How it works:** [The model](../specs/model.md)
- **Why:** [009. Git as the history](../specs/decisions/009-git-as-the-history.md)

**Stories:**

- A reviewer reads how a file differs from a revision, to review a diagram change like code.
