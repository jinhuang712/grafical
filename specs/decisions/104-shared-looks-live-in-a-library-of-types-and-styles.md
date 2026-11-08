# 104. Shared looks live in a library of types and styles

Decided: 2026-11-09

## The problem

The form of the `.grafical` file names a `library`: a `.grafical` file of types and styles that a diagram shares. The code reads a stylesheet instead, a `.grafical-style.yaml` file that tunes colors, widths and type sizes. Two ways held one thing, and an agent had two file forms to learn.

## The choice

- Looks a team shares live in a library: a `.grafical` file of `<type>` and `<style>` blocks that a diagram names with `library`.
- A theme stays a built-in look.
- The stylesheet goes once the library is built.

## Not chosen

- Keeping the stylesheet and dropping `library` from the file.
  - A shared look would keep a form of its own beside the objects, types and styles of the file.
- Both.
  - Two ways to share a look are one choice too many.

## Consequences

What a stylesheet tunes today must be said with types and styles, such as the width of every edge or a new level of weight. Until the library is built the stylesheet stays, and the documents that describe it describe the code as it is.
