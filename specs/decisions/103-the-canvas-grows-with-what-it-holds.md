# 103. The canvas grows with what it holds

Decided: 2026-11-09

## The problem

Layout sizes the canvas to what it holds, and the steps that run after routing do not. `--stretch` stops at the canvas, so a detour that reaches past it is refused as `stretch-blocked`. The target picture also kept a rule that the canvas is at most 1024 px wide. A write could fail for room that the picture could simply take.

## The choice

- The canvas grows with what it holds, every step after routing included.
- No write is refused for the canvas.
- No width caps a picture.

## Not chosen

- Steps after routing that keep the canvas they find.
  - A detour the agent asked for fails for room the picture could take.
- A canvas at most 1024 px wide.
  - It was a rule of one target picture.

## Consequences

`--with` · `--bend` · `--stretch` grow the canvas once this is built, and until then a detour past the canvas is refused.
