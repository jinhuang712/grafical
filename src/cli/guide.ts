// `grafical guide`: the reference agents read instead of the docs (DESIGN.md D17, D26).
// It is a constant, so its bytes never change between runs. Keep it under
// 3,000 tokens (about 12,000 characters). Vocabulary lists come from FEATURES.md.

export const GUIDE = `grafical: build diagrams by running commands. You state facts (row, order, system, connection), never coordinates; grafical lays out, checks, and refuses a change that leaves a label too long or a character it cannot draw.

HOW TO DRAW A GOOD DIAGRAM (read this first)
- A flowchart or a state machine? Read grafical guide flowchart (or state-machine) first.
- One story per diagram, 12 to 16 nodes. 30 boxes is a dump, not a diagram.
- Group nodes into systems. A group is one box around the nodes of one service or team, such as "catalog-sync"; its members may sit in several rows. Group every node except callers and outside dependencies. Never wrap one node in a group of its own name.
- Merge what a reader does not need apart: six topics become one node "upstream topics" with sublabel "6 broker topics"; five callers become one actor "API callers" with sublabel "storefront, promotions"; ten pipelines become one node.
- An edge may end at a group or a layer: one edge from callers to the group "catalog-api" replaces an edge to each part. An edge to a layer draws that row as a labelled band.
- Use lanes (swimlanes) only when ownership is part of the story: read grafical guide swimlane.
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
4. If the output shows lines: and hint: lines, improve them yourself. Run a hint's commands if the moved node still belongs in its new row, then render again and repeat.
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
grafical group add <file> <id> --label <text> [--sublabel <text>] [--nodes a,b,c] [--in <group>]   (--in: inside it, 3 deep at most)
grafical group join <file> <group> <node or group...>; group leave <file> <node or group...> [--up]   (out of every group; --up: one level)
grafical group rename <file> <id> --label <text>; group remove <file> <id> [--out]   (members move one level out; --out: ungrouped)
grafical group describe <file> <id> [--text <text>]   (a quieter second label, e.g. "write side")
grafical group order <file> <id> --before <group> | --after <group>
grafical edge add <file> <from> <to> [--id <id>] [--label <text>] [--kind <kind>] [--both]   (from, to: node, group, layer or lane; --both: arrowheads at both ends)
grafical edge remove <file> <id>; edge relabel <file> <id> [--label <text>]; edge kind <file> <id> <kind>; edge reverse <file> <id>; edge both <file> <id> [--off]; edge emphasize <file> <id...> [--off]   (thick: the main path)
grafical edge retarget <file> <id> [--from <end>] [--to <end>]   (id, kind and label stay)
grafical apply <file> <batch.yaml>; show <file>; check <file> [--all]
grafical render <file> [--svg <out>] [--png <out>] [--scale 1-4]
grafical guide [flowchart | state-machine | swimlane]

RULES
- ids: lowercase letters, digits, . _ -, starting with a letter or digit, one id space for everything. Ids never change; rename changes the label.
- A layer is a row, drawn only when an edge ends at it. A new layer goes to the bottom unless --before or --after places it.
- A node is in at most one group. A group's box spans every row from its top member to its bottom one; other nodes in those rows sit beside it. An empty group draws nothing.
- node add and node move without a position: grafical picks the slot with the fewest crossings. Add a node's edges in the same batch so they count. Give a position only when order matters, and at most one.
- --align <node>: place this node directly above or below a node in another layer. --accent: a node to see first, at most 2.
- node remove also removes its edges and alignments to it.
- Edge id defaults to <from>-><to>, with #2, #3 when taken. Edges are directed.
- Size: leave --size out; grafical sizes each box to its text. With sizing fixed, a node without --size is medium.
- Defaults: kind service, edge kind call, density normal, sizing auto.

VOCABULARY
node kind: service, store, queue, external, actor; for flowcharts and state machines: terminal, decision, state, initial, final
edge kind: call (request), async (message or event, dashed), data (data movement), optional (dotted), link (no arrowhead)
size: s, m, l. density: compact, normal, airy

BATCH FILE
A YAML list. Each item has op: <noun>.<verb> and the same fields as the flags, in camelCase. Operations apply in order; if any fails, none apply and the error names its index (from 0). Unknown fields are errors. Booleans are true.
layer.add: id label before after
node.add: id layer label kind sublabel size first last before after align accent
node.move: id layer first last before after
group.add: id label sublabel nodes (a list) in. group.join: group nodes (a list). group.leave: nodes (a list) up.
diagram.subtitle: text. diagram.note: text. Without text, they clear. diagram.sizing: mode (auto or fixed).
edge.add: from to id label kind both. edge.emphasize: edges (a list) off
Other operations: positional arguments become fields of the same name (node.swap: a b; layer.split: id into label from; node.merge: id nodes label; node.kind: id kind; diagram.legend: line text).
Add groups after their nodes.

OUTPUT
Success: ok changed: <ids>   (--json: the same as one JSON object)
Failure: failed, file unchanged, then one line per problem. Exit codes: 0 success, 1 an operation error or defect, 2 a usage error.
lines: what to improve: lines that cross, and lines that bend more than twice.
hint: <gain>: <commands>: a move grafical measured to fix them. You decide; one marked (moves a node among other kinds) rarely belongs.
A warning never blocks; weigh it: too-many-nodes (node merge), too-wide or crowded-layer (layer split), lonely-group, edge-crosses-layer (layer move), too-many-main-edges.

ERRORS
error op <index> <code> <field>: found <value>; expected <what>; <suggestion>
Fix the named field as the suggestion says. unknown-node, -layer, -group, -lane, -edge: the suggestion lists the closest ids. duplicate-id, bad-id, bad-value, missing-field, bad-type, unknown-field, empty-value, unknown-op: the command or item is malformed. conflicting-position: give one of first, last, before, after. edge-inside: an edge joins a container with something inside it. Others (not-in-layer, align-same-layer, edge-blocked, empty-container, lane-mixed, lane-gap, group-across-lanes, lane-to-lane, too-many-accents, both-on-link): follow the suggestion. file-not-found, file-exists, newer-format, bad-yaml: the file itself.

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

/**
 * `grafical guide <type>`: how to draw one diagram type with the same operations
 * (DESIGN.md D34). Each stays under 3,000 characters, and its example is applied
 * and checked by the tests, so it cannot drift from the tool.
 */
export const TYPE_GUIDES = {
  flowchart: `FLOWCHART: the steps of one process and the decisions in it, top to bottom.

- One row per step, in order. Begin with a terminal "Start" and finish with a terminal "End".
- Kinds: terminal for Start and End; service for a step, named by what is done ("Issue refund"); decision for a question with a short answer ("Within 30 days?"). Keep questions to 3 words or so: a diamond holds less text than a box.
- A decision has an edge out for each answer, labelled with the answer ("yes", "no"). Put the usual answer's next step directly below the decision, and the other beside it.
- A loop goes back to an earlier step: an edge from the later step up to the earlier one.
- Label no other edges. Name the line in the legend: diagram.legend with line solid and text "next step".
- When several people or teams do the steps, put each one's steps in a lane (swimlane). Otherwise use no groups.

EXAMPLE
grafical new refund.grafical.yaml --title "Refund request"
Write batch.yaml:
- {op: layer.add, id: begin, label: Begin}
- {op: layer.add, id: intake, label: Intake}
- {op: layer.add, id: check, label: Check}
- {op: layer.add, id: rule, label: Rule}
- {op: layer.add, id: act, label: Act}
- {op: layer.add, id: close, label: Close}
- {op: node.add, id: start, layer: begin, label: Start, kind: terminal}
- {op: node.add, id: form, layer: intake, label: Read the request}
- {op: node.add, id: complete, layer: check, label: Details complete?, kind: decision}
- {op: node.add, id: ask, layer: check, label: Ask for details}
- {op: node.add, id: within, layer: rule, label: Within 30 days?, kind: decision}
- {op: node.add, id: refund, layer: act, label: Issue refund}
- {op: node.add, id: decline, layer: act, label: Decline}
- {op: node.add, id: end, layer: close, label: End, kind: terminal}
- {op: edge.add, from: start, to: form}
- {op: edge.add, from: form, to: complete}
- {op: edge.add, from: complete, to: ask, label: "no"}
- {op: edge.add, from: ask, to: form}
- {op: edge.add, from: complete, to: within, label: "yes"}
- {op: edge.add, from: within, to: refund, label: "yes"}
- {op: edge.add, from: within, to: decline, label: "no"}
- {op: edge.add, from: refund, to: end}
- {op: edge.add, from: decline, to: end}
- {op: diagram.legend, line: solid, text: next step}
Then: grafical apply refund.grafical.yaml batch.yaml, grafical render refund.grafical.yaml.
`,
  "state-machine": `STATE MACHINE: the states one thing passes through, and the events that move it.

- Kinds: initial for the start dot, state for each state, final for the end ring. Name a state by what the thing is ("Paid", "On hold"). A dot's label is not drawn: call them start and end.
- An edge is a transition, labelled with its event ("pay", "cancel"). A pair of states that go back and forth gets one edge each way.
- Rows follow the thing's usual life: the start dot on top, the end ring at the bottom, the states in between in the order they usually happen. Put a detour (On hold, Cancelled) beside the usual path, not on it.
- To mark the usual life, emphasize its edges: edge.emphasize with their ids.
- Name the line in the legend: diagram.legend with line solid and text "transition".
- Use no groups, unless states belong to clearly different phases.

EXAMPLE
grafical new order.grafical.yaml --title "Order states"
Write batch.yaml:
- {op: layer.add, id: begin, label: Begin}
- {op: layer.add, id: new, label: New}
- {op: layer.add, id: work, label: Work}
- {op: layer.add, id: out, label: Out}
- {op: layer.add, id: close, label: Close}
- {op: node.add, id: start, layer: begin, label: start, kind: initial}
- {op: node.add, id: placed, layer: new, label: Placed, kind: state}
- {op: node.add, id: paid, layer: work, label: Paid, kind: state}
- {op: node.add, id: held, layer: work, label: On hold, kind: state}
- {op: node.add, id: shipped, layer: out, label: Shipped, kind: state}
- {op: node.add, id: cancelled, layer: out, label: Cancelled, kind: state}
- {op: node.add, id: end, layer: close, label: end, kind: final}
- {op: edge.add, from: start, to: placed}
- {op: edge.add, from: placed, to: paid, label: pay}
- {op: edge.add, from: placed, to: cancelled, label: cancel}
- {op: edge.add, from: paid, to: held, label: hold}
- {op: edge.add, from: held, to: paid, label: release}
- {op: edge.add, from: paid, to: shipped, label: ship}
- {op: edge.add, from: shipped, to: end}
- {op: edge.add, from: cancelled, to: end}
- {op: diagram.legend, line: solid, text: transition}
Then: grafical apply order.grafical.yaml batch.yaml, grafical render order.grafical.yaml.
`,
  swimlane: `SWIMLANE: who owns which part. A lane is a labelled band; its members are rows (lanes run as rows) or nodes (lanes run as columns), one way per diagram.

- Use lanes only when ownership is part of the story: teams, people or systems that each do their part of a process.
- Lanes as columns suit a process that runs top to bottom: each step is a node in its owner's lane, and rows keep the order of the steps. Lanes as rows suit an architecture whose tiers each belong to someone: each row joins one lane.
- A row lane holds neighbouring rows only. Column lanes run left to right in the order they were added; a node outside every lane sits to their right.
- A group lies inside one lane and joins it whole. An edge may end at a lane, but never joins two lanes.

COMMANDS
grafical lane add <file> <id> --label <text> [--members a,b]
grafical lane join <file> <lane> <member...>; lane leave <file> <member...>
grafical lane rename <file> <id> --label <text>; lane remove <file> <id>
Batch: lane.add: id label members (a list). lane.join: lane members (a list). lane.leave: members (a list). Add lanes after their nodes.
Errors lane-mixed, lane-gap, group-across-lanes and lane-to-lane: follow the suggestion.

EXAMPLE
grafical new refunds.grafical.yaml --title "Refund handling"
Write batch.yaml:
- {op: layer.add, id: ask, label: Ask}
- {op: layer.add, id: check, label: Check}
- {op: layer.add, id: pay, label: Pay}
- {op: layer.add, id: tell, label: Tell}
- {op: node.add, id: request, layer: ask, label: Request refund}
- {op: node.add, id: review, layer: check, label: Check the order}
- {op: node.add, id: refund, layer: pay, label: Issue refund}
- {op: node.add, id: email, layer: tell, label: Email customer}
- {op: node.add, id: inbox, layer: tell, label: Read the email}
- {op: edge.add, from: request, to: review}
- {op: edge.add, from: review, to: refund}
- {op: edge.add, from: refund, to: email}
- {op: edge.add, from: email, to: inbox}
- {op: lane.add, id: customer, label: Customer, members: [request, inbox]}
- {op: lane.add, id: support, label: Support, members: [review, email]}
- {op: lane.add, id: finance, label: Finance, members: [refund]}
Then: grafical apply refunds.grafical.yaml batch.yaml, grafical render refunds.grafical.yaml.
`,
} as const;

export type DiagramType = keyof typeof TYPE_GUIDES;
