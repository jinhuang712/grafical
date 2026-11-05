# 085. A diagram is objects with attributes and relations

Decided: 2026-11-06

Replaced in part by specs/decisions, "A type holds attributes, and a group may follow a group": a type holds no structure.

## The problem

The diagram file was a YAML tree, so one relation, a node in its layer, held the shape of the file and every other relation was a field or a list at the end. grafical is the file's only writer, and a model reads the file through `show`. The owner sees a diagram as objects with attributes and relations.

## The choice

A diagram is objects with attributes and relations, and a place is a relation. Classes hold looks and structure and may inherit, and instances hold identity and place and may override. The root holds global looks, style rules and constraints. An instance beats a class, a class beats a rule, and a rule beats the theme. The model and the file's form are designed together, since each shapes the other.

## Not chosen

- YAML as it is.
  - A tree gives one relation a place above the others.
- A model with no classes.
  - `kind`, a named look and `group copy` are already classes in part.
- Designing the model first and the form later.
  - The owner holds that each shapes the other.
- Defaults in the file.
  - They are the model's edge.

## Consequences

grafical owns a parser, its version and the tools around the file, and editors know nothing of the form. A batch stays what a model can write. Saved drafts and fixtures must move, and the format freezes at the first release, so this comes before it. The gain is not measured until it is built. If the form proves no better than YAML, the file goes back to YAML with one element on each line.
