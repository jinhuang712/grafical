// `grafical guide`: the reference agents read instead of the docs (DESIGN.md D17).
// It is a constant, so its bytes never change between runs. Keep it under
// 3,000 tokens (about 12,000 characters). Vocabulary lists come from FEATURES.md.

export const GUIDE = `grafical: build architecture diagrams (layered boxes and arrows) by running commands. You state facts (layer, order, connection), never coordinates. grafical lays out the picture, checks it, and refuses any change that would leave a defect.

WORKFLOW
1. grafical new <file> --title <text>
2. add layers (horizontal bands, top to bottom), then nodes, then edges
3. for many changes at once write a batch and run: grafical apply <file> <batch.yaml>
4. grafical show <file> to see the current state, grafical render <file> to draw it
Each write command reads the file, applies the change, lays out, checks, and writes the file only if there is no error and no defect. Otherwise the file is untouched and the exit code is 1. Never edit the file by hand. Name it <name>.grafical.yaml.

COMMANDS (every command accepts --json)
grafical new <file> --title <text> [--density compact|normal|airy]
grafical layer add <file> <id> --label <text> [--before <layer> | --after <layer>]
grafical node add <file> <id> --layer <layer> --label <text> [--kind <kind>] [--sublabel <text>]
    [--size s|m|l] [--first | --last | --before <node> | --after <node>] [--align <node>] [--accent]
grafical node rename <file> <id> --label <text>
grafical node move <file> <id> [--layer <layer>] [--first | --last | --before <node> | --after <node>]
grafical node remove <file> <id>
grafical edge add <file> <from> <to> [--id <id>] [--label <text>] [--kind <kind>]
grafical edge remove <file> <id>
grafical apply <file> <batch.yaml>
grafical show <file>
grafical check <file>
grafical render <file> [--svg <out>] [--png <out>] [--scale 1-4]
grafical guide

RULES
- ids: lowercase letters, digits, . _ - ; start with a letter or digit. One id space for layers, nodes and edges: no two may share an id. The id never changes. Rename changes only the label.
- A new layer goes to the bottom unless --before or --after places it.
- node add and node move without a position: grafical picks the slot with the fewest edge crossings. Add a node's edges in the same batch, so they count. Give --first, --last, --before or --after only when order matters. Give at most one.
- node move needs --layer or a position. Position words refer to nodes in the target layer.
- --align <node>: place this node directly above or below a node in another layer. The target must exist and be in another layer.
- --accent marks a node a reader should see first. At most 2 per diagram. Use it sparingly.
- node remove also removes the node's edges, and clears align on nodes aligned to it. All are listed as changed.
- Edge id defaults to <from>-><to>, with #2, #3 added when that id is taken. Edges are directed, from -> to.
- Labels: short. A long label overflows its box. Chinese text is fine. --sublabel adds a small second line, such as a port or a topic name.
- Defaults: kind service, size m, edge kind call, density normal.

VOCABULARY
node kind: service, store, queue, external, actor
edge kind: call (synchronous request), async (message or event), data (data movement)
size: s, m, l (box width and height)
density: compact, normal, airy

BATCH FILE
A YAML list. Each item has op: <noun>.<verb> and the same fields as the flags, in camelCase. Operations apply in order. If any fails, none apply, and the error names its index (counting from 0).
Ops: layer.add, node.add, node.rename, node.move, node.remove, edge.add, edge.remove.
Fields: layer.add: id label before after. node.add: id layer label kind sublabel size first last before after align accent. node.rename: id label. node.move: id layer first last before after. node.remove: id. edge.add: from to id label kind. edge.remove: id.
Booleans are true. Unknown fields are errors.

OUTPUT
Success, one line: ok changed: <ids>   (--json: {"ok":true,"changed":[...],"errors":[],"defects":[]})
Failure: failed, file unchanged, then one line per problem.
Exit codes: 0 success; 1 an operation error or a defect (file unchanged); 2 a usage error such as a missing flag.

ERRORS
error op <index> <code> <field>: found <value>; expected <what>; <suggestion>
Fix the field named, using the suggestion, and run the command again. Codes:
- unknown-node, unknown-layer, unknown-edge: the id does not exist. The suggestion lists the closest ids. Run show if unsure.
- duplicate-id: the id is taken. Choose another.
- bad-id: the id pattern is wrong. Use lowercase, digits and - . _
- bad-value: not a known kind, size or density. The suggestion lists allowed values.
- missing-field, bad-type, unknown-field, empty-value, unknown-op: the command or batch item is malformed. Use the field names above.
- conflicting-position: give only one of first, last, before, after.
- not-in-layer: before or after named a node in another layer. Use a node of the target layer.
- align-same-layer: align needs a node in a different layer.
- too-many-accents: more than 2 accented nodes.
- file-not-found, file-exists, newer-format, bad-yaml: problems with the file itself.

DEFECTS
defect <code> [<elements>]: found <what>; expected <what>; fix: <an operation>
A defect means the change would make the picture wrong, so nothing was written. Apply the fix line, or change the operation. Codes:
- overflow: a label is wider than its box. Shorten the label with node rename, or re-add the node with --size l.
- node-overlap: two nodes overlap. Move one to another layer or order.
- edge-through-node: an edge crosses a node. Move the node, or reorder the layers.
- label-collision: two labels collide. Shorten an edge label or reorder nodes.
- edge-overlap: two edges share a segment. Reorder nodes or add an edge id and label.
- missing-glyph: a character cannot be drawn. Replace it.
grafical check <file> reports defects on an existing file and exits 1 if there are any.

SHOW
grafical show prints the diagram in this vocabulary: the title, one line per layer with its nodes in order as id "label" kind (plus size=, accent, align=, sub= when set), then the edges as id [kind] label. Edge kind is shown only when it is not call. Read it instead of the file.

RENDER
grafical render <file> writes <name>.svg and <name>.png beside the file, PNG at scale 2. --svg or --png alone writes only that one, to the path given. Look at the PNG after a batch of changes.

EXAMPLE: a 3-layer diagram
grafical new shop.grafical.yaml --title "Shop checkout"
Write batch.yaml:
- op: layer.add
  id: clients
  label: Clients
- op: layer.add
  id: services
  label: Services
- op: layer.add
  id: storage
  label: Storage
- op: node.add
  id: web
  layer: clients
  label: Web app
  kind: actor
- op: node.add
  id: api
  layer: services
  label: Order API
  sublabel: ":8080"
  accent: true
- op: node.add
  id: billing
  layer: services
  label: Billing
- op: node.add
  id: orders-db
  layer: storage
  label: Orders DB
  kind: store
- op: node.add
  id: events
  layer: storage
  label: Order events
  kind: queue
- op: edge.add
  from: web
  to: api
  label: checkout
- op: edge.add
  from: api
  to: billing
- op: edge.add
  from: api
  to: orders-db
  label: write
  kind: data
- op: edge.add
  from: api
  to: events
  label: publish
  kind: async
Then:
grafical apply shop.grafical.yaml batch.yaml
grafical show shop.grafical.yaml
grafical render shop.grafical.yaml
Single commands do the same one step at a time, for example:
grafical node add shop.grafical.yaml cache --layer storage --label Redis --kind store
grafical edge add shop.grafical.yaml api cache --label read
`;
