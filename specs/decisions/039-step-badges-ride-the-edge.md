# 039. Step badges ride the edge

Decided: 2026-10-16

## The problem

The owner chose numbered steps on 2026-10-15 as one of the first candidates for more combinations of operations, after the field study. The plan asked for "a small badge on the line". Built on 2026-10-16.

## The choice

- **The number is the agent's fact.** A step is a whole number from 1 to 99 on an edge, stated with `edge step`.
  - grafical draws it and never numbers, renumbers or checks the order.
  - Two edges may share a number for steps at the same time, and numbers may skip.
- **The look is a ring on the edge** in the edge's colour, with the number inside.
  - Two digits fit, hence the limit of 99.
  - A footnote's number is a filled circle beside what it is about, so a reader tells the two apart ("Notes as callouts or footnotes").
- **The place is the label's.** The badge rides the run that carries the edge's label, and the router finds its slot as it finds any label's ("Our own gap router").
  - A numbered edge keeps a port of its own, as a labelled edge does ("Fan-outs of three bundle"): a badge on a shared trunk could not say whose step it is.
- **It keeps clear of what a label keeps clear of**, and a badge that touches anything is `step-collision` owned by the engine ("Defects owned by who can fix them").
  - A lane's divider may still run under it.
- **Measured.** No picture without a number changed: `pnpm bench diff` laid out the 306 saved drafts and the fixtures as before.
  - With every edge of the 306 saved drafts numbered, no badge touches anything.
    - Crossings went from 664 to 665 and bends from 3,178 to 3,068.
    - The pictures grew 10.1% taller and 1.9% wider, where a one-character label on every edge makes them 2.7% taller.
    - 65 of the 3,475 edges gained a bend.
  - The fuzz test numbers a share of the edges in four seeds of ten; over 5,000 seeds no badge touches anything.

## Not chosen

- The number as text before the label ("2. read"), as in Structurizr and PlantUML.
  - It does not stand out from the words, and an edge with no label would need one only for its number.
- A badge beside the edge, inside the label's slot.
  - Beside an edge it reads like a footnote's number, and in a crowded gutter like the next edge's.
- A badge on the edge before the text, in a slot made wider for it.
  - It was built first, and with every edge of the saved drafts numbered crossings rose 24%.
  - The wider slots were crossed more often and their edges stepped out of the crowd.
- A badge at the edge's start, by its port.
  - Ports sit 16 px apart, so the badges of neighbouring edges would touch.
  - The edges of a fan-out start as one trunk.
- Numbers the engine chooses, such as creation order.
  - The engine never chooses a fact.
- Leaving a badge off where it finds no room, as a footnote's number may be left off.
  - It would drop a fact the agent stated.
- Numbers past 99, or text such as "2a".
  - Either needs a wider badge for a rare need, and the format can grow when one is needed.

## Consequences

A numbered edge keeps its own port, and its label stands a little further from the edge, so a picture with numbers grows a little taller.
