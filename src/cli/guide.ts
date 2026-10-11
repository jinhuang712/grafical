// `grafical guide`: the reference agents read instead of the docs (DESIGN.md D17, D26).
// It is a constant, so its bytes never change between runs. Keep it under
// 3,000 tokens (about 12,000 characters). Vocabulary lists come from FEATURES.md.

export const GUIDE = `grafical: build architecture diagrams by running commands. You state facts (row, order, system, connection), never coordinates. grafical lays out the picture, checks it, and refuses any change that would leave a label too long or a character it cannot draw.

HOW TO DRAW A GOOD DIAGRAM (read this first)
- One story per diagram, 12 to 16 nodes. 30 boxes is a dump, not a diagram.
- Group nodes into systems. A group is one box around the nodes that belong to one service or team, such as "catalog-sync". Its members may sit in neighbouring rows. Put each node in a group unless it is a caller or an outside dependency. A group needs two or more nodes: never wrap one node in a group of its own name.
- Merge what a reader does not need apart: six topics become one node "upstream topics" with sublabel "6 broker topics"; five callers become one actor "API callers" with sublabel "storefront, promotions"; ten pipelines become one node.
- An edge may end at a group or a layer: one edge from callers to the group "catalog-api" replaces an edge to each part. An edge to a layer draws that row as a labelled band.
- Merge only nodes with the same edges. A merged box claims every edge of every member: merge geo-svc, which only A calls, with i18n-svc, which B calls too, and the picture says B calls geo-svc.
- Draw each flow to its end. A retry topic needs its edge back to where messages are re-sent, or leave it out.
- Put detail in the sublabel (port, tier, topic names, store name), not in extra boxes. Keep labels to 1 to 3 words and sublabels short.
- Rows run top to bottom: callers, entry points, the system's inside, shared store, outside dependencies. Put the shared store between or below the systems that use it, so both reach it with short lines.
- Connect neighbouring rows. Avoid edges that skip rows; add a node or reorder rows instead.
- Label only edges whose meaning is not obvious ("consume", "persist", "failed"). Leave "calls" and "reads" unlabelled. Use two edge kinds: call, and async for messages.
- Use --accent on the one thing the story is about (usually the shared store). Use kind queue for topics, store for databases, external for things you do not own, actor for callers.
- Set a subtitle (one sentence saying what the diagram shows) and a note that starts "Not shown: " and names what you left out.

WORKFLOW
1. grafical new <file> --title <text> --subtitle <text> --note <text>
2. write one batch: layers, nodes, groups, edges. Apply: grafical apply <file> <batch.yaml>
3. grafical show <file>, then grafical render <file> and LOOK at the PNG. Fix with single commands.
Each write command reads the file, applies the change, lays out, checks, and writes only if there is no error and no defect you must fix. Otherwise the file is untouched and the exit code is 1. Never edit the file by hand. Name it <name>.grafical.yaml.

COMMANDS (every command accepts --json)
grafical new <file> --title <text> [--subtitle <text>] [--note <text>] [--density compact|normal|airy] [--sizing auto|fixed] [--style <style>]
grafical diagram subtitle <file> [--text <text>]   (no --text clears it)
grafical diagram note <file> [--text <text>]
grafical diagram sizing <file> auto|fixed
grafical diagram style <file> [<style>]   (default, dark, print, or <name>.grafical-style.yaml: the look the user asks for)
grafical diagram title <file> --text <text>; diagram density <file> compact|normal|airy
grafical diagram legend <file> solid|dashed [--text <text>]   (name a line style, e.g. "Kafka message")
grafical diagram tidy <file>   (reorder all layers once, to untangle lines)
grafical layer add <file> <id> --label <text> [--before <layer> | --after <layer>]
grafical layer rename <file> <id> --label <text>; layer remove <file> <id> (empty only); layer tidy <file> <id>
grafical layer move <file> <id> --first | --last | --before <layer> | --after <layer>
grafical layer split <file> <id> <new-id> --label <text> [--from <node>]   (second half, or from <node> on, to a new layer below)
grafical node add <file> <id> --layer <layer> --label <text> [--kind <kind>] [--sublabel <text>]
    [--size s|m|l] [--first | --last | --before <node> | --after <node>] [--align <node>] [--accent]
grafical node rename <file> <id> --label <text>
grafical node resize <file> <id> [--size s|m|l]   (no --size: grafical sizes it)
grafical node move <file> <id> [--layer <layer>] [--first | --last | --before <node> | --after <node>]
grafical node remove <file> <id>
grafical node describe <file> <id> [--text <text>]   (sublabel; no --text clears it)
grafical node kind <file> <id> <kind>; node emphasize <file> <id> [--off]; node align <file> <id> [--to <node>]
grafical node swap <file> <a> <b>
grafical node merge <file> <new-id> --nodes a,b --label <text> [--sublabel <text>] [--kind <kind>]   (keeps all their edges)
grafical group add <file> <id> --label <text> [--sublabel <text>] [--nodes a,b,c]
grafical group join <file> <group> <node...>
grafical group leave <file> <node...>
grafical group rename <file> <id> --label <text>
grafical group remove <file> <id>   (members stay, ungrouped)
grafical group describe <file> <id> [--text <text>]   (a quieter second label, e.g. "write side")
grafical group order <file> <id> --before <group> | --after <group>
grafical edge add <file> <from> <to> [--id <id>] [--label <text>] [--kind <kind>]   (from, to: node, group or layer)
grafical edge remove <file> <id>
grafical edge relabel <file> <id> [--label <text>]; edge kind <file> <id> <kind>; edge reverse <file> <id>
grafical edge retarget <file> <id> [--from <end>] [--to <end>]   (id, kind and label stay)
grafical apply <file> <batch.yaml>
grafical show <file>
grafical check <file> [--all]
grafical render <file> [--svg <out>] [--png <out>] [--scale 1-4]
grafical guide

RULES
- ids: lowercase letters, digits, . _ - ; start with a letter or digit. One id space for layers, groups, nodes and edges. The id never changes. Rename changes only the label.
- A layer is a row; it is not drawn unless an edge ends at it, but it orders the diagram. A new layer goes to the bottom unless --before or --after places it.
- A node is in at most one group. group add --nodes, group join and group leave set that. A group's members must sit in neighbouring rows, with no row between them that has no member (error group-gap). An empty group draws nothing.
- node add and node move without a position: grafical picks the slot with the fewest crossings. Add a node's edges in the same batch so they count. Give a position only when order matters, and at most one.
- --align <node>: place this node directly above or below a node in another layer.
- --accent marks a node a reader should see first. At most 2 per diagram.
- node remove also removes the node's edges and clears align on nodes aligned to it. A removed group's nodes stay.
- Edge id defaults to <from>-><to>, with #2, #3 when taken. Edges are directed.
- Size: leave --size out. grafical gives a medium box, or a large one when the text needs it, and resizes on rename. With sizing fixed, every node without --size is medium.
- Defaults: kind service, edge kind call, density normal, sizing auto.

VOCABULARY
node kind: service, store, queue, external, actor
edge kind: call (request), async (message or event), data (data movement)
size: s, m, l. density: compact, normal, airy

BATCH FILE
A YAML list. Each item has op: <noun>.<verb> and the same fields as the flags, in camelCase. Operations apply in order; if any fails, none apply and the error names its index (from 0). Unknown fields are errors. Booleans are true.
layer.add: id label before after
node.add: id layer label kind sublabel size first last before after align accent
node.rename: id label. node.resize: id size. node.move: id layer first last before after. node.remove: id
group.add: id label sublabel nodes (a list). group.join: group nodes (a list). group.leave: nodes (a list). group.rename: id label. group.remove: id
diagram.subtitle: text. diagram.note: text. Without text, they clear. diagram.sizing: mode (auto or fixed).
edge.add: from to id label kind. edge.remove: id
Other operations: positional arguments become fields of the same name (node.swap: a b; layer.split: id into label from; node.merge: id nodes label; node.kind: id kind; diagram.legend: line text).
Add groups after their nodes.

OUTPUT
Success: ok changed: <ids>   (--json: {"ok":true,"changed":[...],"errors":[],"defects":[],"warnings":[]})
Failure: failed, file unchanged, then one line per problem. Exit codes: 0 success, 1 an operation error or defect (file unchanged), 2 a usage error.
A warning never blocks; weigh it: too-many-nodes (node merge), too-wide or crowded-layer (layer split), lonely-group, edge-crosses-layer (layer move).

ERRORS
error op <index> <code> <field>: found <value>; expected <what>; <suggestion>
Fix the field named, using the suggestion. Codes:
- unknown-node, unknown-layer, unknown-group, unknown-edge: the id does not exist. The suggestion lists the closest ids.
- duplicate-id: taken. bad-id: wrong pattern. bad-value: not a known kind, size or density.
- missing-field, bad-type, unknown-field, empty-value, unknown-op: the command or item is malformed.
- conflicting-position: give only one of first, last, before, after. not-in-layer: before or after named a node in another layer.
- align-same-layer: align needs a node in a different layer.
- group-gap: a group skips a row. Put a member in that row, or regroup.
- edge-inside: an edge joins a group or layer with something inside it. edge-blocked: a node shares a row with the group it points to, with nodes between them. empty-container: the group or layer holds no node.
- too-many-accents: more than 2 accented nodes.
- file-not-found, file-exists, newer-format, bad-yaml: problems with the file itself.

DEFECTS
defect <code> [<elements>]: found <what>; expected <what>; fix: <an operation>
A defect means the change would make the picture wrong, so nothing was written. Two are yours to fix:
- overflow: a label is too long even for the large box, or for the size you gave. Shorten it with node rename or node describe, or node resize --size l.
- missing-glyph: a character cannot be drawn. Replace it.
Where lines and boxes go is grafical's job.

EXAMPLE: two systems around a shared store
grafical new orders.grafical.yaml --title "Order desk and shipping" --subtitle "Two services coupled only by the shared orders database." --note "Not shown: payment retries, admin tools."
Write batch.yaml:
- op: layer.add
  id: callers
  label: Callers
- op: layer.add
  id: entry
  label: Entry
- op: layer.add
  id: core
  label: Core
- op: layer.add
  id: store
  label: Store
- op: node.add
  id: shoppers
  layer: callers
  label: Shoppers
  sublabel: web, mobile
  kind: actor
- op: node.add
  id: gateway
  layer: entry
  label: API gateway
  sublabel: REST, :8080
- op: node.add
  id: checkout
  layer: core
  label: checkout
  sublabel: validate, price
- op: node.add
  id: events
  layer: core
  label: order topics
  sublabel: 3 broker topics
  kind: queue
- op: node.add
  id: dispatcher
  layer: core
  label: dispatcher
  sublabel: one per carrier
- op: node.add
  id: orders-db
  layer: store
  label: Orders DB
  sublabel: orders, parcels
  kind: store
  accent: true
- op: group.add
  id: order-desk
  label: order-desk
  nodes: [gateway, checkout]
- op: group.add
  id: shipping
  label: shipping
  nodes: [events, dispatcher]
- op: edge.add
  from: shoppers
  to: gateway
- op: edge.add
  from: gateway
  to: checkout
- op: edge.add
  from: checkout
  to: events
  label: publish
  kind: async
- op: edge.add
  from: events
  to: dispatcher
  kind: async
- op: edge.add
  from: checkout
  to: orders-db
- op: edge.add
  from: dispatcher
  to: orders-db
  label: persist
Then: grafical apply orders.grafical.yaml batch.yaml, grafical show orders.grafical.yaml, grafical render orders.grafical.yaml.
`;
