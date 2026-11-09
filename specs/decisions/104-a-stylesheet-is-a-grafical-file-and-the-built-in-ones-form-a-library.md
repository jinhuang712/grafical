# 104. A stylesheet is a .grafical file, and the built-in ones form a library

Decided: 2026-11-09

## The problem

A diagram was a `.grafical` file, while the look many diagrams share was a YAML stylesheet keyed by the engine's own structure, such as `paint.edge.main.arrow.halfWidth`. The built-in themes were values written in the code. An agent had two file forms to learn, and a look had three homes: the code, the YAML file and the types and styles of the diagram.

## The choice

- A stylesheet is a `.grafical` file of `<type>`, `<style>` and `<weight>` blocks that says every value of a look.
- The built-in stylesheets `default`, `dark` and `print` are files of that form, and together they are the library grafical ships.
- `grafical library` lists them and finds them by a word.
- A diagram takes `default` unless it names another built-in one or a stylesheet of its own.
- A stylesheet of its own starts from a built-in one and says only what it changes.
- Where it lives is the user's choice, and a diagram that names one that is missing is refused.
- No value of a look is written in the code.

## Not chosen

- A library as one file of types and styles that a diagram names, with the YAML stylesheet gone and the built-in themes in the code.
  - The background, the frames and the type sizes could not be said, and the themes would stay a second home.
- Keeping the YAML stylesheet beside the types and styles.
  - Two forms and two names for one look.

## Consequences

Every value of a look has a block and an attribute, so the built-in stylesheets read as an agent's own would. The library ships with the package. Whether an edge is solid or dashed still follows its type, so only a dashed type takes a dash.
