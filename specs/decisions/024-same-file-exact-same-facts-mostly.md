# 024. Same file exact, same facts mostly

Decided: 2026-10-13

Decided on 2026-10-13 by the owner, asked whether two agents that state the same facts must get the same picture: "mostly. but the intermediate grafical.yaml always outputs the exact same diagram."

- **The same file, the exact same picture.** This is "Output and determinism" as it stands: the same diagram file and stylesheet give the same SVG bytes and PNG pixels, on any machine.
- **The same facts, mostly the same picture.** The file keeps the order of each row's boxes, as the agent stated it ("The agent states every order"). Two agents that add the same boxes at other places get another order in a row. grafical does not reorder a diagram to one canonical form.

Rejected:
- Canonical placement, the same facts always giving the same picture. Every edit could then move boxes the agent did not touch, against the stability "Layout computed again on every change" promises.
- Canonical placement within one batch, with later edits kept stable. It was the recommendation, but "mostly" asks for no new rule, and a batch already places its boxes together, knowing all of their lines ("The engine picks a new box's slot").
