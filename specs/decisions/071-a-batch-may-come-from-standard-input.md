# 071. A batch may come from standard input

Decided: 2026-11-06

## The problem

`apply` read only a file, so an agent wrote a file and then ran the command, which is two calls for one change. That round trip counts against time and cost, the two parts of the MVP bar that are not met.

## The choice

`apply` reads its batch from standard input when the batch is named `-`.

## Not chosen

- A batch given as an argument.
  - A long batch would meet the shell's quoting.
- Dropping batch files.
  - A file can be kept and tried again, as `try` needs.

## Consequences

How many tokens and how much time this saves is not measured.
