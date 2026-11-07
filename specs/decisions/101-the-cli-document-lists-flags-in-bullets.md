# 101. The CLI document lists flags in bullets

Decided: 2026-11-08

## The problem

The skill's guide for `CLI.md` writes flags and exit codes in tables. The owner wants that document to use tables as little as it can.

## The choice

`CLI.md` lists flags and exit codes in bullets, each with its meaning and its default.

## Not chosen

- Tables, as the guide's skeleton has them.
  - The owner rejected them for this document.

## Consequences

This is an exception to the skill's guide for `CLI.md`. A default sits in brackets at the end of a bullet, so scanning one column of defaults is no longer possible.
