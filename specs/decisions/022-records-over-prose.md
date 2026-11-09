# 022. Records over prose

Decided: 2026-10-13

## The problem

Decided on 2026-10-13 by the owner. grafical had begun to judge and advise in prose: warnings that a diagram has too many nodes "for one story", hints that pick moves by grafical's own idea of better, refusals that explain in sentences. Understanding a diagram is the coding agent's job; grafical gives it the facts to do it.

## The choice

- **What the diagram is:** `show` as now, with layers and nodes in order and groups and lanes and edges.
- **How it is drawn:** a discrete report of each node, each edge and the totals.
  - The agent judges the drawing from it without opening the picture.
- **What a change would do:** `grafical try` measures a batch without writing it.
  - The agent decides what to try; grafical measures.
  - It replaces hints, which chose the moves themselves.
  - On 2026-10-12 the engine searched for rearrangements and printed the best as commands.
  - For a day `diagram improve` ran them.
- **Counts** carry no threshold and no advice:
  - The number of nodes and the picture's width.
  - The nodes in a layer and the edges passing a layer.
- **The help is documentation, not output about a diagram:** its principles and examples stay.
- **The form is records**, added on 2026-10-13 after the owner turned down phrases such as "most lines at a box 10 (sync)".
  - Each record is one line: a word that names it, then `key=value` fields in the logfmt style.
  - The fields are the JSON's, under the same names.
- **How long the edges are**, added the same day.
  - The owner had found a node with one edge put in the top layer while its partner sat four layers down.
  - The edge ran 964 px round the right edge, and nothing in the output said so.
  - Each edge now gives its length, the shortest it could be and the layers it skips.
  - Each node and the totals give the length of their edges together.
  - On that draft: `length=964 direct=480 detour=2.01 skip=3`, and `grafical try` with the node moved down to its partner's layer prints `delta ... bends=-4 length=-1380`.
- **Which edges are bundled**, added on 2026-10-14 after dogfooding.
  - An agent saw three edges leave a node as one trunk and could not tell from the output which edges those were.
  - It could not tell either that a label would keep an edge on its own.
  - Each edge now names the edges it leaves or arrives with through one port ("Fan-outs of three bundle").
  - It is read from the picture: edges whose ends meet one node at one point.

## Not chosen

- Phrases with the numbers in them ("most nodes in a row 4 (outside)").
  - They read well to a person, but the agent has to parse English to get the number.
  - Each phrase is worded its own way.
- A table with a header row.
  - A column is read by its position, so an agent that reads one row alone cannot tell which number is which.
- Advice in the output, however helpful.
  - It decides for the agent, and one reader's advice is not another's.
- Hints as discrete commands with numbers.
  - The numbers are facts, but which moves to try is a judgement that is the agent's.

## Consequences

Counts, `show --drawn` and `try` are records. A refusal, a defect and a warning are blocks with one fixed sentence per code.
