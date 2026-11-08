# 085. A diagram is objects with attributes and relations

Decided: 2026-11-06

## The problem

The diagram file was a YAML tree, so one relation, a node in its layer, held the shape of the file and every other relation was a field or a list at the end. grafical is the file's only writer, and a model reads the file through `show`. The owner sees a diagram as objects with attributes and relations.

## The choice

A diagram is objects with attributes and relations, and a place is a relation. Types hold looks and may inherit, and objects hold identity and place and may override. The root holds global looks, style rules and constraints. An object beats a type, and a type beats the theme. The model and the file's form are designed together, since each shapes the other.

## Not chosen

- YAML as it is.
  - A tree gives one relation a place above the others.
- A model with no classes.
  - `kind`, a named look and `group --copy` are already classes in part.
- Designing the model first and the form later.
  - The owner holds that each shapes the other.
- Defaults in the file.
  - They are the model's edge.

## Consequences

grafical owns a parser, its version and the tools around the file, and editors know nothing of the form. A batch stays what a model can write. Saved drafts and fixtures must move, and the format freezes at the first release, so this comes before it. On 2026-11-06 the form touched more lines and more characters a change than YAML, and the owner kept it, since it also serves strictness and plain objects. It is built first and tuned after.
