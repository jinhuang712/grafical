# 082. A command's verb is a flag

Decided: 2026-11-06

## The problem

A command ran three levels deep, as in `grafical edge look <file> <id> --color <color>`. The owner found that too many levels.

## The choice

A command is a noun and flags: `grafical -f <file> edge --look <id> --color <color>`. A verb is a flag that takes the ID, and the other flags are its values. A call holds one verb.

## Not chosen

- An ID in place of a verb, as in `edge <id> --label read --color <color>`, with verbs only for actions.
  - It would set several fields in one call, and it was offered and not chosen.
- Keeping the levels.
  - The owner finds them too many.

## Consequences

The help of a noun holds every verb on one page. A flag that needs a verb beside it must say so, and a value flag without its verb is refused. The operations in a batch and in `diff` stay `noun.verb`.
