# 022. Records over prose

Decided: 2026-10-13

## The problem

Decided on 2026-10-13 by the owner (PHILOSOPHY.md, "Who owns what?"). grafical had begun to judge and advise in prose: warnings that a diagram has too many nodes "for one story", hints that pick moves by grafical's own idea of better, refusals that explain in sentences. Understanding a diagram is the coding agent's job; grafical gives it the facts to do it.

## The choice

- **What the diagram is:** `show` as now, with rows, nodes in order, groups, lanes and edges.
- **How it is drawn:** a discrete report of each box, each line and the totals (FEATURES.md, "Show").
  - The agent judges the drawing from it without opening the picture.
- **What a change would do:** `grafical try` measures a batch without writing it (FEATURES.md, "Trying a change").
  - The agent decides what to try; grafical measures.
  - It replaces hints, which chose the moves themselves.
  - On 2026-10-12 the engine searched for rearrangements and printed the best as commands.
  - For a day `diagram improve` ran them.
- **Warnings become counts** with no threshold and no advice:
  - The number of nodes and the picture's width.
  - The nodes in a row and the lines passing a row.
- **Refusals stay terse:** a code that says what is wrong and a fixed set of facts about what is there, with no sentences (FEATURES.md, "Refusals").
  - Since 2026-10-13 they are records too.
- **The help is documentation, not output about a diagram:** its principles and examples stay.
- **The form is records**, added on 2026-10-13 after the owner turned down phrases such as "most lines at a box 10 (sync)".
  - Each record is one line: a word that names it, then `key=value` fields in the logfmt style.
  - An example is `line id=a->b from=a to=b leaves=bottom enters=top bends=2 length=372 crosses=- passes=-`.
  - The fields are the JSON's, under the same names.
- **How long the lines are**, added the same day.
  - The owner had found a box with one line put in the top row while its partner sat four rows down.
  - The line ran 964 px round the right edge, and nothing in the output said so.
  - Each line now gives its length, the shortest it could be and the rows it skips (FEATURES.md, "Show").
  - Each box and the totals give the length of their lines together.
  - On that draft: `length=964 direct=480 detour=2.01 skip=3`, and `grafical try` with the box moved down to its partner's row prints `delta ... bends=-4 length=-1380`.
- **Which lines are bundled**, added on 2026-10-14 after dogfooding.
  - An agent saw three lines leave a box as one trunk and could not tell from the output which lines those were.
  - It could not tell either that a label would keep a line on its own.
  - Each line now names the lines it leaves or arrives with through one port ("Fan-outs of three bundle").
  - It is read from the picture: lines whose ends meet one box at one point.

How records are written today is in [how grafical answers](../answers.md#records).

## Not chosen

- Phrases with the numbers in them ("most nodes in a row 4 (outside)").
  - They read well to a person, but the agent has to parse English to get the number.
  - Each phrase is worded its own way.
- A table with a header row.
  - A column is read by its position, so an agent that reads one row alone cannot tell which number is which.
- Advice in the output, however helpful.
  - It decides for the agent, and one reader's advice is not another's (PHILOSOPHY.md, "What makes grafical good?").
- Hints as discrete commands with numbers.
  - The numbers are facts, but which moves to try is a judgement that is the agent's.

## Consequences

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it": a refusal, a defect and a warning are blocks with a fixed sentence per code, the source and the commands that can change them; the rest of the output stays records.
