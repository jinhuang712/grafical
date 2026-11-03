# 034. The legend says only what the agent named

Decided: 2026-10-15

Decided by the owner on 2026-10-15, after a field study that redrew ten published and classic diagrams with grafical. The legend printed "call" on a flowchart, a state machine and two swimlanes, and "related" on an org chart. Those are meanings the agent never stated, and they were wrong in all of those pictures. PHILOSOPHY.md, "What is a diagram?": grafical never adds a fact the agent did not state.

- **An entry needs the agent's words.** A line style or a width gets an entry only when `diagram legend` names it, as a mark already does ("A legend for widths and marks"). A diagram that names nothing draws no legend.
- **The agent sees what it left unnamed.** `show --drawn` prints a `legend` record for each style and width the picture draws, with `text=-` where the agent gave no words. A width's record also gives its `weight`, the word `diagram legend --weight` takes, since its pixels alone cannot name a `thick` line.
- **`--hide` is gone.** It left out an entry that had default words, and with none it did what naming nothing does. Chosen by the owner the same day, over keeping it. A file that still says `false` is read as no words.
- Built on 2026-10-15. Eight fixtures lost their legend: catalog-sync, its grouped version, dense, photo sharing, the two lane fixtures, nested and tiny. Nothing else in their pictures moved. The flowchart and the state machine already named theirs.

Rejected:
- Keeping the default words, "call or read", "message", "optional", "related" and "main path". They suit an architecture diagram, are wrong on a flowchart, and are the engine stating a meaning.
- Default words per diagram type. A type sets only the diagram's space ("An optional type sets the diagram's space").
