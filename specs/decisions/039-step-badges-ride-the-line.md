# 039. Step badges ride the line

Decided: 2026-10-16

## The problem

The owner chose numbered steps on 2026-10-15 as one of the first candidates of ROADMAP.md, "More combinations of operations", after the field study (behavior: FEATURES.md, "Numbered steps"). FEATURES.md asked for "a small badge on the line". Built on 2026-10-16.

## The choice

- **The number is the agent's fact.** A step is a whole number from 1 to 99 on a line, stated with `edge step`, and the file holds it as the line's `step`. grafical draws it and never numbers, renumbers or checks the order: two lines may share a number, for steps at the same time, and numbers may skip. A group copy keeps its lines' numbers, as it keeps their labels.
- **The look.** A ring centred on the line, in the line's colour, filled with what lies behind it, so that the line runs into it and out again, and the number inside in the labels' colour. One size, 18 px across: two digits fit, hence the limit of 99. A footnote's number is a filled circle beside what it is about ("Notes as callouts or footnotes"), so a reader tells the two apart.
- **The place.** The badge rides the straight part that carries the line's label, under the start of the label's text, and the text stands 7 px further off the line than a label without a badge, past the ring. Beside a line up or down, the badge sits on the line level with the text. A line with no label gets a slot of the badge's size. The router finds the slot as it finds any label's ("Our own gap router": along the run or in another gutter, and with no room the write is refused), keeps the badge's end of the slot over the run, and keeps the badge, on both sides of the line, clear of the gutter's other lines, labels and badges and of the line's own arrowheads. A numbered line keeps a port of its own, as a labelled line does ("Fan-outs of three bundle"): a badge on a shared trunk could not say whose step it is. Two numbered lines between the same neighbours widen the gap between them until both badges fit.
- **What it keeps clear of.** Every box, every other line, every text, every other badge, its own arrowheads, and the sides of groups and bands, as a label keeps clear of them. A lane's divider may still run under it, though not under a label since the same day (TODO.md, "A step's badge across a lane's side"). A badge that touches any of them is `step-collision`, owned by the engine ("Defects owned by who can fix them"). A badge the slot still leaves touching something slides along its own line to the nearest clear place, and two badges that leave each other no place alone move together. A line too short to hold one, where it meets a group, a row or a lane it ends at, holds it on its way into that container, past the arrowhead there. A label moved off a line cut at a container takes a place only where its text, as the badge sets it, is clear too: in 2 of 5,000 fuzz seeds the cut left the badge no room under the text in the slot, and the text, set beside the badge, lay across a lane's side or another line.
- **Measured.** No picture without a number changed: `pnpm bench diff` laid out the 306 saved drafts and the fixtures as before. With every line of the 306 saved drafts numbered, no badge touches anything; crossings went from 664 to 665, bends from 3,178 to 3,068, and the pictures grew 10.1% taller and 1.9% wider, where a one-character label on every line makes them 2.7% taller. The height is the text's 7 px past the badge and the room kept from arrowheads, in gutters that then take another track; almost all of the 16.0% more line length is lines running through those taller gutters, and 65 of the 3,475 lines gained a bend. The fuzz test numbers a share of the lines in four seeds of ten, lines to bars included: over 5,000 seeds no badge touches anything. A badge still has no clear place where its line is shorter than the badge and runs between two lines under 11 px away all the way into the container it ends at; the fuzz test met that once while this was built, and not since the router put straight lines back at their boxes' centres.

## Not chosen

- The number as text before the label ("2. read"), as in Structurizr and PlantUML. It does not stand out from the words, and a line with no label would need one only for its number.
- A badge beside the line, inside the label's slot. Beside a line it reads like a footnote's number, and in a crowded gutter like the next line's.
- A badge on the line before the text, in a slot made wider for it. It was built first: with every line of the saved drafts numbered, crossings rose 24%, because the wider slots were crossed more often and their lines stepped out of the crowd.
- A badge at the line's start, by its port. Ports sit 16 px apart, so the badges of neighbouring lines would touch, and the lines of a fan-out start as one trunk.
- Numbers the engine chooses, such as creation order. The engine never chooses a fact (PHILOSOPHY.md, "Who owns what?").
- Leaving a badge off where it finds no room, as a footnote's number may be left off. It would drop a fact the agent stated.
- Numbers past 99, or text such as "2a". Either needs a wider badge for a rare need, and the format can grow when one is needed.

## Consequences

A numbered line keeps its own port, and its label stands a little further from the line, so a picture with numbers grows a little taller.
