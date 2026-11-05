# 053. Success rests on cost, time, model gap and copying

Decided: 2026-11-05

Replaced in part by specs/decisions, "A weak model draws well and a stronger one superbly": a strong model copies the pictures.

## The problem

Twenty goals stood side by side, and a release waited on all of them. Some could no longer be scored, since the judges ended on 2026-10-18. Others measured a cause of a result and not the result. The owner put success in plain words: lower cost, more speed, no need for a strong model and better pictures.

## The choice

- **The MVP bar rests on four goals:** cost and time below the same model drawing directly, a small gap between Haiku and Opus and a picture copied and beaten.
- **Better pictures are watched and have no line:** each round is held against the round before, by the owner's blind rating.
- **The constraints must always hold:** stability, mechanical defects and determinism.
- **Every other goal is recorded to find causes:** it holds no release.
- **Three goals are dropped:**
  - Faithfulness had no scorer left.
  - A loose prompt had already passed.
  - The command line has no way to state a position.

## Not chosen

- Every goal holds the release.
  - A release would wait on causes and on checks nobody can score.
- Beating Opus at xhigh effort as the bar.
  - The owner's blind rating already shows it, and the next pictures should beat the last ones.
- A checklist per brief with a script for faithfulness.
  - The content is the agent's, so the check measures the model and not grafical.

## Consequences

Operation errors no longer hold a release by themselves, though refused calls still raise cost and time. Better pictures rest on one person's rating. Copying a picture needs a fixed set of pictures, and the harness cannot hand an agent a picture yet.
