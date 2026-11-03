# 017. A viewer that only shows

Decided: 2026-10-11

`grafical view` shows the diagram as it is now while an agent draws it, and redraws within a moment of every change to the file, from any process (behavior: FEATURES.md, "Live viewer"). It only shows: nobody edits on it. It keeps no log, because the file and git hold the history. The owner asked on 2026-10-12, after seeing the window run, for a list of changes beside the picture, because the picture alone does not say what an agent just did.

As built: the page is served on 127.0.0.1 and receives each new picture over server-sent events. The viewer watches the diagram's folder, because a write replaces the file by renaming over it, and redraws when the file or a stylesheet changes. The picture is the same SVG that `render` writes. What changed is found by comparing the last good file with the new one, so a box that only moved because the layout re-flowed is not marked. The list of changes holds the operations `grafical diff` finds between the two files, and keeps the last 200 for a window opened later.

Rejected:
- Opening the viewer on every `new`. Benchmarks and scripts would open windows nobody watches.
- A log of operations beside the file. The owner wants the live picture, and git already holds the history.
