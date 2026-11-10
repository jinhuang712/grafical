# 108. An answer says what happened, and a write reports only what it changed

Decided: 2026-11-10

## The problem

An answer could mislead an agent, and an agent builds every later step on what it read. The outcome line `ok changed=<ids>` named a new object and a changed one alike, so `--set` on a mistyped ID made an object the agent never saw. Making a file printed `ok`, as nothing changing did. An edge removed with its node was not named. Every write printed every warning again: 173 to 232 blocks at 50 nodes in round p1g, where a new one was easy to miss.

## The choice

An answer meets seven conditions:

- It says what happened to each object: made, changed, removed or nothing.
- It says whether the file was written.
- It names what grafical changed as a consequence and what caused it.
- It tells a problem this command caused from one the file already had.
- Its length follows what changed and not the size of the diagram.
- Every command answers in one grammar, in one fixed order.
- It gives facts and the commands that can act, and never advice ("Records over prose").

The form that meets them:

- The first line is one uppercase word: `WRITTEN` · `UNCHANGED` · `TRIED` · `REFUSED`, or `OK` for a command that only reads.
- Sections follow in a fixed order, each in `<name>` and `</name>` tags and left out when empty.
  - `<changes>` gives one line per object: `MADE` · `CHANGED` with the fields that changed · `REMOVED`, and `by=` names the cause of a consequence.
  - `<warnings>` gives how many warnings the write brought, cleared and left, and a `CLEARED` line for each one gone.
  - `<problems>` gives one block per problem, headed `ERROR` · `DEFECT` · `WARNING`.
  - `--try` adds `<before>` · `<after>` · `<delta>`, and `check` and `render` add `<counts>`.
- A write prints only the warnings it brought, with the command as their source.
  - `check` and `render` print every warning, with `already in the file` as the source.
- A section's content is indented two spaces, and each level inside it two more.
- `--json` gives the same answer, one key per section.

## Not chosen

- Every warning on every write, as chosen on 2026-10-18.
  - A new warning drowned among the old ones, and the answer grew with the diagram.
- Refusing a new ID that is near an existing one.
  - It guesses what the agent meant, and `MADE` already tells it.
- An emoji beside each keyword.
  - One fact would have two spellings, and a terminal draws an emoji at no fixed width.
- Tab characters for the indentation.
  - Their width differs from one terminal to the next.

## Consequences

- A write lays out the diagram as it was before, to tell a new warning from an old one.
  - On 2026-10-18 that took one operation at 50 nodes from 33.9 ms to 67.1 ms at worst, against a target of 50 ms.
- A script reads an answer by its sections, and one that read the old outcome line must change.
