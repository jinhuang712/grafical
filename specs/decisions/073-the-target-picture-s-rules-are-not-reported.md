# 073. The target picture's rules are not reported

Decided: 2026-11-06

## The problem

The rules of the target picture were to be reported by `grafical check --all`. The code that measured them stayed, but no command called it, and only the limit of two bends was used.

## The choice

The measurement goes, and the limit of two bends stays with the warning on bent edges. The rules stay as a record of what the target picture was.

## Not chosen

- Reporting all the rules.
  - A limit such as at most 40% of edges labelled reads as a score of the picture, and readers differ.

## Consequences

An agent hears of bent edges, crossings and crowded text from the warnings, and of nothing else these rules measured.
