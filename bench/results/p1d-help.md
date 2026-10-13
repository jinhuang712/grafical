# The help alone, 2026-10-12

After `grafical guide` was removed (DESIGN.md D36), this round asks whether an agent finds and learns grafical from its help with no instruction to read anything: the prompt names only the `grafical` command. The tasks are those of the type guide round (`p1d-guides.md`): a loose prompt per diagram type and the public brief, plus the 25-component brief. Haiku, 3 runs each, 33 drafts, $0.33 (`stage1 --part help`).

## Measured

| | Guides, prompt says read the guide (`p1d-guides`) | Help alone (`p1d-help`) |
|---|---|---|
| First grafical call is a help or guide read | 30 of 30 | 33 of 33 |
| Help pages read before the first write | — | 9.8 a draft (1 to 15) |
| Type conventions met (27 type drafts) | 62 of 63 | 63 of 63 |
| Conventions only the guides taught | 38 of 42 | 27 of 42 |
| Problem lines in the type drafts | 0 | 1 |
| Writes refused (help and guide reads left out) | 4 of 58 (7%) | 45 of 157 (29%) |
| Cost per type draft | $0.006 | $0.009 |
| Problem lines, public brief | 8, 1, 0 | 17, 14, 6 |
| Problem lines, 25-component brief | — | 16, 16, 15 (stage 1 rerun: 14, 16, 13) |

## What it shows

- **Agents find the help.** Every draft ran `grafical --help` first, then the pages of the commands it was about to use, before writing anything. The most read: `render`, `apply`, the command groups (`node`, `edge`), `new`, `edge add` and `node add`. Three drafts tried a diagram type as a command (`grafical deployment --help`).
- **The help teaches the types.** Every type convention was met, one more than with the guides: the right kind for Start and End, labelled transitions, lanes, nested groups.
- **But more writes were refused**, for three reasons:
  - 15 gave the legend an edge kind or a phrase as its line (`line: async`, `line: data`, `line: "solid: request"`); the line is a style, solid, dashed, dotted or plain. The guides had shown the call; the help names the legend without its syntax, except on `diagram legend --help`, which four drafts read.
  - 11 gave a node the id of its own row (`placed`, `users`, `start`), though the help says so three times. A state machine or a cloud diagram with one box per row invites it.
  - 4 left a colon or comma in unquoted text, 4 had a label too long for its box.
- **The legend and the main path were set less often** (27 of 42 against 38): their per-type wording lives on `diagram legend --help` and `edge emphasize --help`, which few drafts opened.
- **Reading costs.** About ten pages before the first write make a type draft half as dear again.
- **The public brief drew worse**, in three drafts, so not settled. In the worst, a message row sits between the services and the store they share, and the outside services sit below the store, so lines cross rows they do not connect (13 crossings). grafical offered a move that takes the crossings from 13 to 3; no draft in this round ran a hint. The 25-component drafts drew as before.

## The public brief again, six drafts (`stage1 --part brief`, round `p1d-brief`)

Six more drafts of the public brief, after the refusals learned to say how to fix the usual mistakes (and before the legend's field became `style`), $0.10:

| | Guides (3) | Help, first three | Help, six more |
|---|---|---|---|
| Problem lines | 8, 1, 0 | 17, 14, 6 | 2, 0, 4, 4, 4, 3 |
| Nodes | 13 to 15 | 15 to 19 | 15 to 20 |
| Hints run | 1 of 14 shown | 0 of 12 | 0 of 17 |

- **The lines were bad luck in three drafts.** The six new drafts average 2.8 problem lines, as the guide round's three did (3.0).
- **The drafts are a little larger**, and none of the nine help drafts ran a hint.
- **Writes are still refused often**, 11 of 25. Five of them were a sublabel that wrapped to a second line: the help said detail goes in the sublabel, but not that a sublabel holds one line, which the guide had said ("sublabels short"). Three were a node given its row's id, which the refusal now answers with a free id.
