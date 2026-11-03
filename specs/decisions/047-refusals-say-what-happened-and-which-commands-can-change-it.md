# 047. Refusals say what happened and which commands can change it

Decided: 2026-10-18

## The problem

Decided by the owner on 2026-10-18, after round p1g (`bench/results/p1g-stage1.md`). Refusals are the target furthest from met (GOALS.md, "Operation errors"): the scale drafts were refused 19% to 26% of their calls, and two drafts of the private brief 55%. The agents got stuck where a record did not say clearly what had happened or which command could act. One change step met `title-blocked` for 15 calls: the record named the places clear of lines but no command, and the line in the way came from another batch line than the one the agent changed. Others met `missing-field` for a second box in a row and `unquoted-text` with nothing to say what to give, and read `group-conflict` as asking them to join a node of another group.

## The choice

grafical reports what happened and never teaches. A record gives the facts and the names of the commands that can change them, never a command line with ids or values filled in.

- **One block per problem.** A command prints in this order:
  - Its outcome, `ok changed=<ids>` or `failed changed=-`, which a usage error prints too.
  - A block for each problem, with a blank line between.
  - On a write, the counts as before.
  - A block looks like this:
  ```text
  <kind>: <code>
  description: <the code's one sentence>
  source: <what caused it>
  detail:
    <key>: <value>
  next: <command names>
  ```
- **Three kinds.** An `error` could not be read or applied, and nothing is written.
  - It exits 2 for the command line and 1 for an operation.
  - A `defect` would draw wrong ("Defects owned by who can fix them").
    - One the agent owns refuses the write with exit 1.
    - One the engine owns is grafical's bug: it is written and shown only by `check --all`.
  - A `warning` is written with exit 0 and says what draws poorly ("The dirty work has edges").
    - An example is `warning: bent-line` for a line with more than two bends.
    - The warnings are in "Every write prints every warning".
- **A description per code.** One fixed sentence for each code in one table, which says what happened and not what to do.
  - It is never made for the case at hand.
  - A test holds every error, defect and warning code to one short sentence.
- **The source.** A warning has none ("Every write prints every warning").
  - For a single command, the command line as typed.
  - For an operation of a batch, `<batch file> line <n>: <the operation as written>`.
    - `<n>` is the file's line the operation starts on, from 1.
    - `--json` keeps the operation's index as well.
    - It gives none for an error no operation caused, such as one already in the file or a file or a batch that cannot be read.
  - A stylesheet that cannot be read has the index of the operation that names it.
  - For a defect found after layout, the batch line after the last prefix of the batch that lacks the problem.
    - Every longer prefix must have the problem.
    - The same holds for an error of the whole diagram found only once the whole batch is applied.
  - Before, such an error named the batch's last operation even though it may have done nothing wrong.
  - `already in the file` for what was in the file before the command and in every prefix of the batch.
- **How the line is found** (decided the same day, after two reviews).
  - On a refused write only, grafical tries ever shorter prefixes of the batch back towards the file.
    - So a write that succeeds costs nothing more.
    - It tries each prefix once for all the problems of the write.
    - It lays the prefix out where a defect is asked about.
  - A problem's line is the one after the first prefix in that order without it.
  - A prefix refused for another problem cannot tell whether this one is there.
    - A whole diagram's checks stop at the first set that fails, and a refused diagram is not laid out.
    - The scan stops there, and the source is the batch file with no line.
    - So it is too once the prefixes a refused write may try are spent.
  - Only a prefix refused by a later check than the one that finds the problem can tell.
    - The checks run in turn, so it passed that one and is without the problem.
  - It may lay out 400 boxes and lines in all, shared by all its problems.
    - It counts at the size of the larger of the file's diagram and the one the batch would make.
    - When the batch is refused for an error it counts the file's alone, since the batch then makes none.
    - So it tries 3 prefixes at 113 boxes and lines and 10 at 37, with at most 12 and at least 1.
  - `--json` then gives no index.
  - So the line is never wrong, and a problem caused early in a long batch has the batch file as its source.
  - Both of these stay within GOALS.md, "Speed":
    - A `try` of 80 operations with 10 labels too long takes 0.33 to 0.37 s, with 2 prefixes at 193.
    - A refused 123-operation draft of a scale-50 brief takes 0.29 to 0.31 s, with 3 prefixes.
  - The first took 1.15 s when every line was searched for.
  - Round p1g's title-blocked keeps its line, caused on line 5 of 8 in a diagram of 37 boxes and lines.

  Rejected:
  - Halving the range of prefixes, which assumed that a problem stays once it appears.
    - A label too long that a rename shortens and a later rename lengthens again was blamed on the line that added it.
    - A problem the file had that the batch took away and brought back was blamed on the file.
  - Trying first the operations that name what the problem is about.
    - It saved prefixes, but it rested on the same assumption.
  - Reading a prefix refused for another problem as one without this problem.
    - A batch that passed through a refused state had its overflow blamed on the line that left that state.
- **The detail.** One fact per line under the names the facts had, in one fixed order.
  - `-` stands for an empty value, and absent keys are left out.
  - A list is comma separated.
  - The ids that a defect named in the one list `elements` are split by what each one is.
    - Each is a `node`, `edge`, `group`, `row`, `lane` or `wall`.
  - A key named for one thing holds one value.
  - A key named for several things holds a list even of one, in `--json` as in text.
    - Such keys are `nodes`, `edges` and `ends`.
  - Two boxes a defect names go under `nodes`.
  - Found by review the same day: a defect's ids had been lists even of one, an error's and a warning's not.
- **Next.** The names of the commands that can change it, in the order the help lists commands.
  - `-` where none can, such as for a batch's syntax error or an engine bug.
  - Never ids, values or options.
  - A test holds every name to a real command.
- **Enough to find the change.** The detail carries what the agent needs to find the change itself, and the help and the guides state no rule for it (PHILOSOPHY.md, "How does an agent learn grafical?"); decided by the owner the same day.
  - In round p1g two agents put a bar between rows a group's box covers and were refused with `bar-in-group`.
    - They could not tell why: the record named the group and the row.
    - It did not say that the box covers every row from its top member's to its bottom member's.
  - It now names the bar's row, the group, the line and the group's `top` and `bottom` rows.
  - A bar drawn for its look alone is named the same way with no line ("A row with a look is drawn").
    - Its `next` names `layer look` in place of `edge remove`.
  - The same question was asked of every refusal:
    - `group-conflict` names the group's `top` and `bottom` rows too.
    - `alignment-conflict` names the boxes in the way.
      - Those are the boxes of the other column in the same row or those the order of the rows puts between the two.
    - `align-same-layer` found in the file names its box.
    - `edge-inside`, `edge-blocked`, `bar-to-bar` and `bar-crossed` name the line's two `ends`.
    - `group-across-lanes` names the group's first box in another lane than its first box's, and that lane.
- **`likely` as a value only.** A word grafical does not know is answered with the word it most likely means, never with a command: `grafical help apply` gives `found: help` and `likely: --help`.
- **`--json` says the same:** each problem as `{kind, code, description, source, detail, next}`, beside the outcome and the counts.
- **No "When refused" in the help.** Decided by the owner later the same day: every command page's "When refused" section goes, `apply --help`'s too.
  - A help page says how to use a command, and a refusal explains itself through its block.
  - A second hand-written copy of what the record says can go stale, as `edge add`'s did when it described a fix wrongly.
  - It states a rule in words before the agent makes the mistake, against PHILOSOPHY.md, "How does an agent learn grafical?".
  - `apply --help`'s "Output" stays and takes the outcome of a refusal and the exit codes from the section that went.
  - It describes what the tool prints and not a rule.

## Not chosen

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

It replaces two earlier choices. In "Records over prose" (2026-10-13), a refusal was one record of `key=value` fields with no sentence; it is now a block with its code's one sentence, while the counts, `show --drawn` and `try` stay records. In "One entry page, help where it is used" (2026-10-17), "A refusal carries its own fix": the generated `fix` facts are gone, about 45 of them, and with them the search for the size of a box at which a line's label fits, which laid the diagram out at each larger size ("The dirty work has edges"). The agent still widens the box itself, and `next` names `node resize`.
