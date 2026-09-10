# grafical

> A diagram compiler for models and humans. Proposal written 2026-09-10.

## The Problem

Drawing an architecture diagram — layers, panels, links, dependencies — and getting it into a document, a review, and git runs into the same set of problems every time. They fall into six groups, in the order they bite.

### Writing the diagram down: the diagram cannot say what we mean

- There is no first-class notion of a layer, a band, or a panel. We approximate one with extra rectangles, and the result does not read as an architecture diagram.
- Relationships stop at the node. "A calls B" is expressible; "A calls B on this interface" is not.
- Coarse placement is not expressible. There is no way to say "this block sits on the left, that one below it" short of taking over every coordinate.
- Styling is limited to picking a theme. A node carrying an icon, a title, a subtitle, and a status dot cannot be built.

### Drawing: position and routing are out of control

- Past a few dozen nodes position becomes unpredictable, and the picture on screen is not the picture in our head.
- Edges cross nodes, sit on top of labels, and run across the whole canvas.
- Intervening means owning every coordinate. There is no middle ground: constraints without coordinates.

### Editing: every step is pixel labor

- Text width has to be estimated by hand (CJK ≈ 1em, Latin ≈ 0.6em). Estimate wrong and the label overflows, so containers get padded by guess.
- Changing one label drags its position and its polyline bends along with it.
- Return edges and labels collide by default, and we move them by hand.
- Overflow becomes visible only after a render, so it is always found late.

### Iterating: a round is expensive and failure is total

- A round is write, render, check, look — minutes each, and a diagram takes a dozen rounds.
- Two rounds that fail to clear the same defect mean discarding the diagram and starting over.
- Feedback says "overflow here, overlap there". It does not say whether the relationships are wrong or the placement is.
- The target format has unstated limits — certain SVG features, text elements specifically. Violating one silently degrades the output to a flat image.

### Handing over: the path is long and brittle

- Delivery means creating a document, writing the diagram into it, exporting, converting the format, and deleting the document — network round trips and version-specific branches.
- Human edits and model regeneration overwrite each other. There is no way to say "leave this part alone".

### Keeping it: nothing accumulates

- The artifact is an image. It cannot be diffed, reviewed in a pull request, or regression-tested.
- Styling and structure are redone for every diagram. Nothing is reusable as a template or a preset.
