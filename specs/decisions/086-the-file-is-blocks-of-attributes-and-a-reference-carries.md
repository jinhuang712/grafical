# 086. The file is blocks of attributes, and a reference carries @

Decided: 2026-11-06

## The problem

A form that reads like sentences needs many reserved words, and an ID such as `after` would collide with them. Length is no concern, while a change must stay local and every reference must be checked.

## The choice

An object is a block in braces with one attribute on each line, and it opens with its sort in angle brackets, such as `<node>`. A value that names another object carries `@`. A sort reads as a word and neither form can meet an ID, so no word is reserved. A node states its own memberships, as attributes. Nobody searches the file as text: `show` with an ID gives an object's definition and what refers to it.

## Not chosen

- Sentences with no symbols.
  - They need reserved words.
- `@` on every name with `:` and `<` in place of a sort.
  - It has no reserved word, but it reads less well than the sort's own word.
- One line per object with symbols for common relations.
  - A change to one attribute would change the whole line.
- Containers that list their members.
  - Two branches that add to one layer would conflict on one line.

## Consequences

The file is long, and length is no concern. An `@` that names no object is refused. Whether a colon or a semicolon stays is small and open.
