# 068. A command names its file with a flag

Decided: 2026-11-06

## The problem

The diagram file sat between a command and its arguments, as in `grafical edge add a.grafical x y`. The owner found that it reads badly. Nothing had chosen that place: it was only a habit.

## The choice

A command names its file with `-f` or `--file` before the command, as in `grafical -f a.grafical edge --set x-y --from x --to y`. The flag is required, and the same holds for `diagram --set`, which makes the file.

## Not chosen

- A file that grafical remembers.
  - It needs a hidden state on disk, and a line could go into the wrong diagram with no error.
- Keeping the file after the command.
  - It costs nothing in tokens, but the owner finds that it reads badly.
- `--load`.
  - It sounds as if the file stays loaded, and each command is its own process.
- A file found in the current folder.
  - The command would no longer say what it changes.

## Consequences

Every command, help page, example and benchmark prompt changes at once, so a round after it is not fully comparable with those before.
