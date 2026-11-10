# 107. Every noun is changed by `--set`, `--move` and `--remove`

Decided: 2026-11-10

## The problem

Each noun had a verb for each attribute, `--add` stood beside them, and `move` and `plug` stood above the nouns. The command line held 87 verbs on 2026-11-10. A membership could be stated on the group and on the member, and the help of each noun grew with every attribute.

## The choice

- Every noun takes three verbs.
  - `--set <ids>` makes an object or changes the attributes it names ("One command is one write, and running it twice changes nothing").
  - `--move <ids>` changes only a place.
  - `--remove <ids>` removes.
- Several IDs given to `--move` keep the order given, so one command states a whole layer's order.
- Three acts are no attribute and keep a verb: `layer --split` · `node --merge` · `group --copy`.
- One flag sets one attribute, named as the file names it.
  - `-` gives an attribute back its default.
  - A switch takes `on` or `off`, and a list is comma separated.
- A new object takes its place on `--set`.
  - A place given to an object that exists must already hold, or the command is refused.
- A membership is set on the member, such as `node --set a --group pay`.
- An object with no ID of its own is named by what it sits on.
  - A note by its target and a label by its owner.
  - A mark by `<node>:<slot>`.
  - A legend entry by `style:<id>` · `weight:<level>` · `mark:<text>`.
- An edge's ID follows the rule of every other ID, with no `->` form and no `#<n>` ending.
- `diagram --set` makes the file, and `new` goes.
- Swapping, reversing and plugging give way to stating the result.

## Not chosen

- `move` and `plug` above the nouns, as chosen on 2026-11-07.
  - A move took options that fit only some objects, and plugging is setting an edge's ends.
- A verb for each attribute.
  - Every new attribute needed a verb of its own.
- An ID in place of a verb, as in `node api --label X`.
  - A command would not say whether it makes, moves or removes.
- Members listed on their group.
  - One fact would have two homes.
- Keeping `->` and `#<n>` in edge IDs.
  - They served the IDs grafical once made, and an unquoted `->` makes a shell write a file.

## Consequences

- The command line holds 34 verbs in place of 87.
- An agent states a draft as `--set` lines, and running them again changes nothing.
