# 047. Refusals say what happened and which commands can change it

Decided: 2026-10-18

## The problem

Decided by the owner on 2026-10-18, after round p1g (`bench/results/p1g-stage1.md`). Refusals are the target furthest from met: the scale drafts were refused 19% to 26% of their calls, and two drafts of the private brief 55%. The agents got stuck where a record did not say clearly what had happened or which command could act. One change step met `title-blocked` for 15 calls: the record named the places clear of lines but no command, and the line in the way came from another batch line than the one the agent changed. Others met `missing-field` for a second box in a row and `unquoted-text` with nothing to say what to give, and read `group-conflict` as asking them to join a node of another group.

## The choice

grafical reports what happened and never teaches. A record gives the facts and the names of the commands that can change them, never a command line with ids or values filled in.

- **One block per problem**, after the outcome and before the counts.
  - It holds its kind and code and its description and its source and its detail and its next.
- **Three kinds.** An `error` could not be read or applied; a `defect` would draw wrong ("Defects owned by who can fix them"); a `warning` is written and says what draws poorly ("Every write prints every warning").
- **A description per code.** One fixed sentence for each code says what happened and not what to do, and it is never made for the case at hand.
- **The source** says what caused the problem.
  - For a problem of the whole batch it names the operation that caused it, never a guess.
  - Before, such an error named the batch's last operation even though it may have done nothing wrong.
- **The detail** gives one fact per line, under the names the facts had.
  - Found by review the same day: a defect's ids had been lists even of one and an error's and a warning's not, so the rule became one for all.
- **Next** names the commands that can change it and never ids or values or options.
- **Enough to find the change.** The detail carries what the agent needs to find the change itself, and the help and the guides state no rule for it; decided by the owner the same day.
  - In round p1g two agents put a bar between rows a group's box covers and were refused with `bar-in-group`.
    - They could not tell why: the record named the group and the row.
    - It did not say that the box covers every row from its top member's to its bottom member's.
  - The same question was then asked of every refusal, and each gained the facts it lacked.
- **`likely` as a value only.** A word grafical does not know is answered with the word it most likely means, never with a command.
- **No "When refused" in the help.** Decided by the owner later the same day: every command page's "When refused" section goes, `apply --help`'s too.
  - A help page says how to use a command, and a refusal explains itself through its block.
  - A second hand-written copy of what the record says can go stale, as `edge add`'s did when it described a fix wrongly.
  - It states a rule in words before the agent makes the mistake, against the stance that an agent learns grafical from the command line and not from rules in words.

How the line is found was decided the same day, after two reviews: on a refused write only, grafical tries ever shorter prefixes of the batch back towards the file, within a fixed budget, so that the line is never wrong. Both of these stay within the limit of 400 ms a command: a `try` of 80 operations with 10 labels too long takes 0.33 to 0.37 s, and a refused 123-operation draft of a scale-50 brief 0.29 to 0.31 s. The first took 1.15 s when every line was searched for. Round p1g's title-blocked keeps its line, caused on line 5 of 8 in a diagram of 37 boxes and lines.

## Not chosen

- Halving the range of prefixes, which assumed that a problem stays once it appears.
  - A label too long that a rename shortens and a later rename lengthens again was blamed on the line that added it.
  - A problem the file had that the batch took away and brought back was blamed on the file.
- Trying first the operations that name what the problem is about.
  - It saved prefixes, but it rested on the same assumption.
- Reading a prefix refused for another problem as one without this problem.
  - A batch that passed through a refused state had its overflow blamed on the line that left that state.
- Generated fix commands, the `fix` facts of 2026-10-17.
  - They choose for the agent and teach a form that the agent copies without reading.
  - Each is engine work that a test must keep right: the fix test applied every one.
- A sentence made for each case, such as "move pricing-svc out of row-upstream".
  - It reads well, but it is advice in prose worded its own way each time ("Records over prose").
  - The agent has to parse English to find the ids.
- One-line records for refusals, as before.
  - A record of a dozen `key=value` fields said what was there, but not what had happened or which command could act.
  - `elements=` mixed boxes, lines and groups in one list.
- Generating each page's "When refused" section from the description table.
  - It would stay right, but it is still a copy of what the block says.
  - It is read before any mistake, as a rule in words.
- Keeping the "When refused" sections hand-written, made correct for the blocks.
  - A second copy goes stale, as `edge add`'s did.

## Consequences

It replaces two earlier choices. In "Records over prose" (2026-10-13), a refusal was one record of `key=value` fields with no sentence; it is now a block with its code's one sentence, while the counts, `show --drawn` and `try` stay records. In "One entry page, help where it is used" (2026-10-17), "A refusal carries its own fix": the generated `fix` facts are gone, about 45 of them, and with them the search for the size of a box at which a line's label fits, which laid the diagram out at each larger size ("A line never moves for its label"). The agent still widens the box itself, and `next` names `node resize`.
