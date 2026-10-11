// `grafical guide`: the reference agents read instead of the docs (DESIGN.md D17, D26).
// It is a constant, so its bytes never change between runs. Keep it under
// 3,000 tokens (about 12,000 characters). Vocabulary lists come from FEATURES.md.

export const GUIDE = `grafical: build diagrams by running commands. You state facts (row, order, system, connection), never coordinates; grafical lays out, checks, and refuses a change that leaves a label too long or a character it cannot draw.

HOW TO DRAW A GOOD DIAGRAM (read this first)
- One story per diagram, 12 to 16 nodes. 30 boxes is a dump, not a diagram.
- Group nodes into systems. A group is one box around the nodes of one service or team, such as "catalog-sync"; its members may sit in neighbouring rows. Group every node except callers and outside dependencies. Never wrap one node in a group of its own name.
- Merge what a reader does not need apart: six topics become one node "upstream topics" with sublabel "6 broker topics"; five callers become one actor "API callers" with sublabel "storefront, promotions"; ten pipelines become one node.
- An edge may end at a group or a layer: one edge from callers to the group "catalog-api" replaces an edge to each part. An edge to a layer draws that row as a labelled band.
- Use lanes (swimlanes) only when ownership is part of the story.
- Merge only nodes with the same edges. A merged box claims every edge of every member: merge geo-svc, which only A calls, with i18n-svc, which B calls too, and the picture says B calls geo-svc.
- Draw each flow to its end. A retry topic needs its edge back to where messages are re-sent, or leave it out.
- Put detail (port, tier, topic names) in the sublabel, not in extra boxes. Labels 1 to 3 words, sublabels short.
- Rows run top to bottom: callers, entry points, the system's inside, shared store, outside dependencies. Put the shared store between or below the systems that use it, so both reach it with short lines.
- Connect neighbouring rows; avoid edges that skip rows.
- Label only edges whose meaning is not obvious ("consume", "persist", "failed"). Leave "calls" and "reads" unlabelled. Edge kinds: call, async for messages, optional for a call made only sometimes, link for "related" with no direction.
- Use --accent on the one thing the story is about (usually the shared store). Use kind queue for topics, store for databases, external for things you do not own, actor for callers.
- Set a subtitle (one sentence saying what the diagram shows) and a note that starts "Not shown: " and names what you left out.

WORKFLOW
1. grafical new <file> --title <text> --subtitle <text> --note <text>
2. write one batch: layers, nodes, groups, edges. Apply: grafical apply <file> <batch.yaml>
3. grafical show <file>, then grafical render <file> and LOOK at the PNG. Fix with single commands.
A write applies, lays out and checks; on an error or a defect you must fix, the file is untouched and the exit code is 1. Never edit the file by hand. Name it <name>.grafical.yaml.

COMMANDS (every command accepts --json)
grafical new <file> --title <text> [--subtitle <text>] [--note <text>] [--density compact|normal|airy] [--sizing auto|fixed] [--style <style>]
grafical diagram subtitle <file> [--text <text>]; diagram note <file> [--text <text>]   (no --text clears it)
grafical diagram sizing <file> auto|fixed
grafical diagram style <file> [<style>]   (default, dark, print, or <name>.grafical-style.yaml, as the user asks)
grafical diagram title <file> --text <text>; diagram density <file> compact|normal|airy
grafical diagram legend <file> solid|dashed|dotted|plain [--text <text>]   (name a line style, e.g. "Kafka message")
grafical diagram tidy <file>   (reorder all layers once to untangle lines)
grafical layer add <file> <id> --label <text> [--before <layer> | --after <layer>]
grafical layer rename <file> <id> --label <text>; layer remove <file> <id> (empty only); layer tidy <file> <id>
grafical layer move <file> <id> --first | --last | --before <layer> | --after <layer>
grafical layer split <file> <id> <new-id> --label <text> [--from <node>]   (second half, or from <node> on, to a new layer below)
grafical node add <file> <id> --layer <layer> --label <text> [--kind <kind>] [--sublabel <text>]
    [--size s|m|l] [--first | --last | --before <node> | --after <node>] [--align <node>] [--accent]
grafical node rename <file> <id> --label <text>; node resize <file> <id> [--size s|m|l]   (no --size: grafical sizes it)
grafical node move <file> <id> [--layer <layer>] [--first | --last | --before <node> | --after <node>]
grafical node remove <file> <id>; node describe <file> <id> [--text <text>]   (sublabel; no --text clears it)
grafical node kind <file> <id> <kind>; node emphasize <file> <id> [--off]; node align <file> <id> [--to <node>]
grafical node swap <file> <a> <b>; node merge <file> <new-id> --nodes a,b --label <text> [--sublabel <text>] [--kind <kind>]   (keeps all their edges)
grafical group add <file> <id> --label <text> [--sublabel <text>] [--nodes a,b,c]
grafical group join <file> <group> <node...>; group leave <file> <node...>; group rename <file> <id> --label <text>
grafical group remove <file> <id>   (members stay, ungrouped)
grafical group describe <file> <id> [--text <text>]   (a quieter second label, e.g. "write side")
grafical group order <file> <id> --before <group> | --after <group>
grafical lane add <file> <id> --label <text> [--members a,b]; lane join <file> <lane> <member...>; lane leave <file> <member...>; lane rename <file> <id> --label <text>; lane remove <file> <id>
grafical edge add <file> <from> <to> [--id <id>] [--label <text>] [--kind <kind>]   (from, to: node, group, layer or lane)
grafical edge remove <file> <id>; edge relabel <file> <id> [--label <text>]; edge kind <file> <id> <kind>; edge reverse <file> <id>
grafical edge retarget <file> <id> [--from <end>] [--to <end>]   (id, kind and label stay)
grafical apply <file> <batch.yaml>; show <file>; check <file> [--all]
grafical render <file> [--svg <out>] [--png <out>] [--scale 1-4]
grafical guide

RULES
- ids: lowercase letters, digits, . _ -, starting with a letter or digit, one id space for everything. Ids never change; rename changes the label.
- A layer is a row, drawn only when an edge ends at it. A new layer goes to the bottom unless --before or --after places it.
- Lane members are layers (lanes run as rows) or nodes (as columns, left to right in creation order), one way per diagram. A group joins whole.
- A node is in at most one group. A group's members must sit in neighbouring rows (error group-gap). An empty group draws nothing.
- node add and node move without a position: grafical picks the slot with the fewest crossings. Add a node's edges in the same batch so they count. Give a position only when order matters, and at most one.
- --align <node>: place this node directly above or below a node in another layer. --accent: a node to see first, at most 2.
- node remove also removes its edges and alignments to it.
- Edge id defaults to <from>-><to>, with #2, #3 when taken. Edges are directed.
- Size: leave --size out; grafical sizes each box to its text. With sizing fixed, a node without --size is medium.
- Defaults: kind service, edge kind call, density normal, sizing auto.

VOCABULARY
node kind: service, store, queue, external, actor
edge kind: call (request), async (message or event, dashed), data (data movement), optional (dotted), link (no arrowhead)
size: s, m, l. density: compact, normal, airy

BATCH FILE
A YAML list. Each item has op: <noun>.<verb> and the same fields as the flags, in camelCase. Operations apply in order; if any fails, none apply and the error names its index (from 0). Unknown fields are errors. Booleans are true.
layer.add: id label before after
node.add: id layer label kind sublabel size first last before after align accent
node.move: id layer first last before after
group.add: id label sublabel nodes (a list). group.join: group nodes (a list). group.leave: nodes (a list). lane.add: id label members (a list). lane.join: lane members (a list). lane.leave: members (a list)
diagram.subtitle: text. diagram.note: text. Without text, they clear. diagram.sizing: mode (auto or fixed).
edge.add: from to id label kind
Other operations: positional arguments become fields of the same name (node.swap: a b; layer.split: id into label from; node.merge: id nodes label; node.kind: id kind; diagram.legend: line text).
Add groups and lanes after their nodes.

OUTPUT
Success: ok changed: <ids>   (--json: {"ok":true,"changed":[...],"errors":[],"defects":[],"warnings":[]})
Failure: failed, file unchanged, then one line per problem. Exit codes: 0 success, 1 an operation error or defect, 2 a usage error.
A warning never blocks; weigh it: too-many-nodes (node merge), too-wide or crowded-layer (layer split), lonely-group, edge-crosses-layer (layer move).

ERRORS
error op <index> <code> <field>: found <value>; expected <what>; <suggestion>
Fix the named field as the suggestion says. unknown-node, -layer, -group, -lane, -edge: the suggestion lists the closest ids. duplicate-id, bad-id, bad-value, missing-field, bad-type, unknown-field, empty-value, unknown-op: the command or item is malformed. conflicting-position: give one of first, last, before, after. group-gap: a group skips a row; put a member in that row, or regroup. edge-inside: an edge joins a container with something inside it. Others (not-in-layer, align-same-layer, edge-blocked, empty-container, lane-mixed, lane-gap, group-across-lanes, lane-to-lane, too-many-accents): follow the suggestion. file-not-found, file-exists, newer-format, bad-yaml: the file itself.

DEFECTS
defect <code> [<elements>]: found <what>; expected <what>; fix: <an operation>
A defect means the change would make the picture wrong, so nothing was written. Two are yours to fix:
- overflow: a label is too long even for the large box, or for the size you gave. Shorten it with node rename or node describe, or node resize --size l.
- missing-glyph: a character cannot be drawn. Replace it.
Where lines and boxes go is grafical's job.

EXAMPLE: two systems around a shared store
grafical new orders.grafical.yaml --title "Order desk and shipping" --subtitle "Two services coupled only by the shared orders database." --note "Not shown: payment retries, admin tools."
Write batch.yaml:
- {op: layer.add, id: callers, label: Callers}
- {op: layer.add, id: entry, label: Entry}
- {op: layer.add, id: core, label: Core}
- {op: layer.add, id: store, label: Store}
- {op: node.add, id: shoppers, layer: callers, label: Shoppers, sublabel: "web, mobile", kind: actor}
- {op: node.add, id: gateway, layer: entry, label: API gateway, sublabel: "REST, :8080"}
- {op: node.add, id: checkout, layer: core, label: checkout, sublabel: "validate, price"}
- {op: node.add, id: events, layer: core, label: order topics, sublabel: 3 broker topics, kind: queue}
- {op: node.add, id: dispatcher, layer: core, label: dispatcher, sublabel: one per carrier}
- {op: node.add, id: orders-db, layer: store, label: Orders DB, sublabel: "orders, parcels", kind: store, accent: true}
- {op: group.add, id: order-desk, label: order-desk, nodes: [gateway, checkout]}
- {op: group.add, id: shipping, label: shipping, nodes: [events, dispatcher]}
- {op: edge.add, from: shoppers, to: gateway}
- {op: edge.add, from: gateway, to: checkout}
- {op: edge.add, from: checkout, to: events, label: publish, kind: async}
- {op: edge.add, from: events, to: dispatcher, kind: async}
- {op: edge.add, from: checkout, to: orders-db}
- {op: edge.add, from: dispatcher, to: orders-db, label: persist}
Then: grafical apply orders.grafical.yaml batch.yaml, grafical show orders.grafical.yaml, grafical render orders.grafical.yaml.
`;
