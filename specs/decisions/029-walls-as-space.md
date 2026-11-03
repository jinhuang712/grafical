# 029. Walls as space

Decided: 2026-10-14

Decided by the owner on 2026-10-14. On 2026-10-13 the owner asked for "breaks" and "invisible walls that anything cannot be put into", and chose "dividers and walls" for phase 1e. Shown a wall drawn as a line with gates, the owner answered "walls can have thickness", then "a space! not a layer, not a line, not a thick line", that it "doesn't have to be entirely across the whole image, could be partial", and that lines cross it "only when the wall allows". The model below was then approved as shown (behavior: FEATURES.md, "Walls").

A wall is empty space between two named sides. The agent names what it separates. Which way the wall runs, how long it is and how thick are the engine's. A wall with a label draws a dashed divider through its middle, so dividers are walls with labels, not a second fact.

How the engine keeps it:
- Across, a wall adds a fixed space to the gutter just below the upper side's lowest row, after the gutter's tracks. Up and down, it takes the boundary between two blocks of grid columns, as a column lane does, and no line runs down through its space in its rows. Rows and columns are shared by the whole picture, so the gap is as long as the picture, but the wall, its rule and its drawing are only as long as the sides.
- A line between the sides is refused before layout unless the wall allows it. Any other line whose route passes through the wall's space is an agent-owned defect, since the boxes the agent placed lead it there.
- No line may cross text, so a wall's label takes the first place along the wall that no crossing line comes within 8 px of. Failing that, it took a place across the picture at that height, and failing that, a place left of every box and line, which a second layout pass made room for; the fuzz test found the last two cases on 2026-10-14. Since 2026-10-17 ("The dirty work has edges") a label with no place along its wall stays at the wall's start, or an up-and-down wall's top, where it no longer steps above or below the wall either, and the write is refused as `label-blocked`.
- Walls across were built first, on 2026-10-14, and walls up and down the same day.

Rejected:
- A line between two rows, with gates. The owner: a wall is "a space", "not a line".
- A row drawn as a band, whose boxes are the gates. The owner: "not a layer".
- A thick line. The owner: "not a thick line".
- A wall across the whole picture only. The owner: "could be partial".
- Lines that cross freely, and a sealed wall. The owner: lines cross "only when the wall allows".
- A wall placed by coordinates or by size. Where it goes and how thick it is are the engine's ("Facts over coordinates").
- Rerouting a line round a wall. Routing round a partial obstacle is left for later.
