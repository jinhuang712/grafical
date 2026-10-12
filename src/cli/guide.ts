// `grafical guide`: the reference agents read instead of the docs (DESIGN.md D17, D26).
// It is a constant, so its bytes never change between runs. Keep it under
// 3,000 tokens (about 12,000 characters). Vocabulary lists come from FEATURES.md.

export const GUIDE = `grafical: build diagrams by running commands. You state facts (row, order, system, connection), never coordinates; grafical lays out, checks, and refuses a change that leaves a label too long or a character it cannot draw.

HOW TO DRAW A GOOD DIAGRAM (read this first)
- For a flowchart, state-machine, c4, cloud, deployment, event-flow, data-flow or dependency diagram, read grafical guide <type> first.
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
grafical guide [<type>]

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
  c4: `C4: a software system at one zoom. Context: the system as one box among people and other systems. Container: the system opened into its apps and stores.

- People are actor nodes, other systems external nodes, the system or its containers service, store or queue nodes.
- A node's label is its name, its sublabel its technology ("React", "Postgres").
- Label every edge with what the source does ("places orders using", "reads and writes"). Name the line in the legend: diagram.legend with line solid and text "uses".
- Rows: people on top, then what they use, then what that uses. Put an external system in the row of what uses it, beside it.
- Container diagram: one group around the system's containers, named after the system, with sublabel "software system". People and other systems stay outside it.
- One diagram, one zoom: never draw the system box and its own containers together.

EXAMPLE
grafical new bank.grafical.yaml --title "Internet banking: containers"
Write batch.yaml:
- {op: layer.add, id: people, label: People}
- {op: layer.add, id: apps, label: Apps}
- {op: layer.add, id: core, label: Core}
- {op: layer.add, id: data, label: Data}
- {op: node.add, id: customer, layer: people, label: Customer, kind: actor}
- {op: node.add, id: web, layer: apps, label: Web app, sublabel: React}
- {op: node.add, id: mobile, layer: apps, label: Mobile app, sublabel: iOS and Android}
- {op: node.add, id: api, layer: core, label: API, sublabel: Java}
- {op: node.add, id: mail, layer: core, label: Email system, kind: external}
- {op: node.add, id: db, layer: data, label: Database, kind: store, sublabel: Postgres}
- {op: node.add, id: mainframe, layer: data, label: Core banking, kind: external}
- {op: group.add, id: bank, label: Internet banking, sublabel: software system, nodes: [web, mobile, api, db]}
- {op: edge.add, from: customer, to: web, label: uses}
- {op: edge.add, from: customer, to: mobile, label: uses}
- {op: edge.add, from: web, to: api, label: calls}
- {op: edge.add, from: mobile, to: api, label: calls}
- {op: edge.add, from: api, to: db, label: reads and writes}
- {op: edge.add, from: api, to: mail, label: sends email via}
- {op: edge.add, from: api, to: mainframe, label: gets accounts from}
- {op: diagram.legend, line: solid, text: uses}
Then: grafical apply bank.grafical.yaml batch.yaml, grafical render bank.grafical.yaml.
`,
  cloud: `CLOUD: what runs where in a cloud: regions, networks, subnets and the services in them.

- Boxes inside boxes: a group per region, a group per network in it (group add --in), a group per subnet in that. Three levels at most.
- Kinds: service for compute, store for databases and buckets, queue for queues and streams, external for outside services, actor for users.
- Name a node by its role ("orders API"); put the product in the sublabel ("containers", "Postgres").
- Rows follow a request: users and the edge on top, then load balancers, compute, and data at the bottom.
- Put each node in the innermost box it lives in. A managed service outside every network sits in the region only.
- Label only edges that carry what a reader needs: a protocol, an event, a schedule.

EXAMPLE
grafical new shop.grafical.yaml --title "Shop in one region"
Write batch.yaml:
- {op: layer.add, id: entry, label: Entry}
- {op: layer.add, id: front, label: Front}
- {op: layer.add, id: back, label: Back}
- {op: layer.add, id: base, label: Data}
- {op: node.add, id: users, layer: entry, label: Shoppers, kind: actor}
- {op: node.add, id: cdn, layer: entry, label: CDN, kind: external}
- {op: node.add, id: lb, layer: front, label: Load balancer}
- {op: node.add, id: servers, layer: front, label: Web servers, sublabel: containers}
- {op: node.add, id: api, layer: back, label: Orders API}
- {op: node.add, id: worker, layer: back, label: Fulfilment worker}
- {op: node.add, id: db, layer: base, label: Orders db, kind: store, sublabel: Postgres}
- {op: node.add, id: events, layer: base, label: Order events, kind: queue}
- {op: node.add, id: backups, layer: base, label: Backups, kind: store, sublabel: object storage}
- {op: group.add, id: region, label: eu-west, nodes: [backups]}
- {op: group.add, id: vpc, label: shop network, in: region}
- {op: group.add, id: public, label: public subnet, in: vpc, nodes: [lb, servers]}
- {op: group.add, id: private, label: private subnet, in: vpc, nodes: [api, worker, db, events]}
- {op: edge.add, from: users, to: cdn, label: pages}
- {op: edge.add, from: users, to: lb, label: HTTPS}
- {op: edge.add, from: lb, to: servers}
- {op: edge.add, from: servers, to: api}
- {op: edge.add, from: api, to: events, kind: async, label: publish}
- {op: edge.add, from: events, to: worker, kind: async}
- {op: edge.add, from: worker, to: db}
- {op: edge.add, from: db, to: backups, kind: async, label: nightly}
Then: grafical apply shop.grafical.yaml batch.yaml, grafical render shop.grafical.yaml.
`,
  deployment: `DEPLOYMENT: where each piece of software runs: environments, clusters or hosts, and what is deployed on them.

- Boxes inside boxes: the environment ("production"), in it a cluster or host group (group add --in), in that a namespace or host. Three levels at most.
- A deployed unit is a service node named by what it does, with its runtime and count in the sublabel ("3 pods", "2 VMs").
- Databases, queues and outside services are store, queue and external nodes: in the box they run in, or outside every box when someone else runs them.
- Rows follow a request from entry to storage. Label an edge only with what a reader needs: a protocol, a port.
- To compare environments, draw one diagram for each.

EXAMPLE
grafical new pay.grafical.yaml --title "Payments in production"
Write batch.yaml:
- {op: layer.add, id: entry, label: Entry}
- {op: layer.add, id: front, label: Front}
- {op: layer.add, id: back, label: Back}
- {op: layer.add, id: base, label: Data}
- {op: node.add, id: users, layer: entry, label: Shoppers, kind: actor}
- {op: node.add, id: ingress, layer: front, label: Ingress, sublabel: 2 pods}
- {op: node.add, id: shop, layer: front, label: Storefront, sublabel: 4 pods}
- {op: node.add, id: checkout, layer: back, label: Checkout, sublabel: 3 pods}
- {op: node.add, id: pay, layer: back, label: Payments, sublabel: 2 pods}
- {op: node.add, id: db, layer: base, label: Orders db, kind: store, sublabel: managed Postgres}
- {op: node.add, id: psp, layer: base, label: Card processor, kind: external}
- {op: group.add, id: prod, label: production, nodes: [db]}
- {op: group.add, id: cluster, label: prod cluster, in: prod}
- {op: group.add, id: webns, label: web namespace, in: cluster, nodes: [ingress, shop]}
- {op: group.add, id: payns, label: payments namespace, in: cluster, nodes: [checkout, pay]}
- {op: edge.add, from: users, to: ingress, label: HTTPS}
- {op: edge.add, from: ingress, to: shop}
- {op: edge.add, from: shop, to: checkout}
- {op: edge.add, from: checkout, to: pay}
- {op: edge.add, from: checkout, to: db}
- {op: edge.add, from: pay, to: psp, label: card auth}
Then: grafical apply pay.grafical.yaml batch.yaml, grafical render pay.grafical.yaml.
`,
  "event-flow": `EVENT FLOW: who publishes which events, where they go, and who reacts to them.

- Producers on top, one queue node per topic or stream below them, consumers below that. A consumer that publishes again starts a new pair of rows.
- Kinds: service for producers and consumers, queue for topics, store for what a consumer writes.
- Edges into and out of a topic are async. Label a producer's edge with the event ("order placed"); a consumer's edge needs no label.
- Name the line in the legend: diagram.legend with line dashed and text "event".
- Emphasize the path of the event the diagram is about: edge.emphasize with its edges.

EXAMPLE
grafical new events.grafical.yaml --title "What happens after an order"
Write batch.yaml:
- {op: layer.add, id: make, label: Producers}
- {op: layer.add, id: topics, label: Topics}
- {op: layer.add, id: react, label: Consumers}
- {op: layer.add, id: topics2, label: More topics}
- {op: layer.add, id: react2, label: More consumers}
- {op: node.add, id: checkout, layer: make, label: Checkout}
- {op: node.add, id: orders, layer: topics, label: orders, kind: queue}
- {op: node.add, id: stock, layer: react, label: Inventory}
- {op: node.add, id: mailer, layer: react, label: Email}
- {op: node.add, id: stats, layer: react, label: Analytics}
- {op: node.add, id: reserved, layer: topics2, label: stock, kind: queue}
- {op: node.add, id: warehouse, layer: topics2, label: Warehouse, kind: store}
- {op: node.add, id: ship, layer: react2, label: Shipping}
- {op: edge.add, from: checkout, to: orders, kind: async, label: order placed}
- {op: edge.add, from: orders, to: stock, kind: async}
- {op: edge.add, from: orders, to: mailer, kind: async}
- {op: edge.add, from: orders, to: stats, kind: async}
- {op: edge.add, from: stats, to: warehouse}
- {op: edge.add, from: stock, to: reserved, kind: async, label: stock reserved}
- {op: edge.add, from: reserved, to: ship, kind: async}
- {op: edge.emphasize, edges: [checkout->orders, orders->stock, stock->reserved, reserved->ship]}
- {op: diagram.legend, line: dashed, text: event}
Then: grafical apply events.grafical.yaml batch.yaml, grafical render events.grafical.yaml.
`,
  "data-flow": `DATA FLOW: where data comes from, what changes it, and where it is kept.

- Kinds: external for sources and sinks outside the system (people too), service for a process that changes data, store for where data rests.
- Every edge is kind data, labelled with the data that moves ("card details", "receipt"). A process has at least one input and one output.
- Rows follow the data: sources on top, processes in the middle, stores and sinks at the bottom. A store a process reads and writes takes an edge each way.
- Name the line in the legend: diagram.legend with line solid and text "data".
- Mark personal or secret data in its label ("card details, secret"), never with colour.

EXAMPLE
grafical new cards.grafical.yaml --title "Card payment data"
Write batch.yaml:
- {op: layer.add, id: source, label: Sources}
- {op: layer.add, id: process, label: Processes}
- {op: layer.add, id: rest, label: Stores and sinks}
- {op: node.add, id: customer, layer: source, label: Customer, kind: external}
- {op: node.add, id: checkout, layer: process, label: Take payment}
- {op: node.add, id: report, layer: process, label: Build report}
- {op: node.add, id: psp, layer: rest, label: Card processor, kind: external}
- {op: node.add, id: orders, layer: rest, label: Orders, kind: store}
- {op: node.add, id: finance, layer: rest, label: Finance team, kind: external}
- {op: edge.add, from: customer, to: checkout, kind: data, label: "card details, secret"}
- {op: edge.add, from: checkout, to: psp, kind: data, label: payment request}
- {op: edge.add, from: checkout, to: orders, kind: data, label: order}
- {op: edge.add, from: orders, to: report, kind: data, label: orders}
- {op: edge.add, from: report, to: finance, kind: data, label: daily report}
- {op: diagram.legend, line: solid, text: data}
Then: grafical apply cards.grafical.yaml batch.yaml, grafical render cards.grafical.yaml.
`,
  dependency: `DEPENDENCY GRAPH: which parts need which, so that a reader sees what breaks when one fails or changes.

- One node per module, package or service. Apps on top, what they use below, the base everything needs at the bottom: every edge points down, from what depends to what it depends on.
- Kinds: service for modules and services, store and queue for shared infrastructure, external for third parties.
- Edges carry no label: kind call for a hard dependency, kind optional for one that degrades gracefully.
- Name the lines in the legend: diagram.legend with line solid and text "depends on", and with line dotted and text "optional".
- Group by repository or team only when the question is about ownership.
- A cycle is a finding: draw it, and name it in the subtitle.

EXAMPLE
grafical new deps.grafical.yaml --title "Shop modules"
Write batch.yaml:
- {op: layer.add, id: apps, label: Apps}
- {op: layer.add, id: modules, label: Modules}
- {op: layer.add, id: base, label: Base}
- {op: node.add, id: storefront, layer: apps, label: storefront}
- {op: node.add, id: admin, layer: apps, label: admin}
- {op: node.add, id: cart, layer: modules, label: cart}
- {op: node.add, id: auth, layer: modules, label: auth}
- {op: node.add, id: catalog, layer: modules, label: catalog}
- {op: node.add, id: db, layer: base, label: database, kind: store}
- {op: node.add, id: cache, layer: base, label: cache, kind: store}
- {op: edge.add, from: storefront, to: cart}
- {op: edge.add, from: storefront, to: catalog}
- {op: edge.add, from: storefront, to: auth}
- {op: edge.add, from: admin, to: catalog}
- {op: edge.add, from: cart, to: db}
- {op: edge.add, from: catalog, to: db}
- {op: edge.add, from: catalog, to: cache, kind: optional}
- {op: edge.add, from: auth, to: db}
- {op: diagram.legend, line: solid, text: depends on}
- {op: diagram.legend, line: dotted, text: optional}
Then: grafical apply deps.grafical.yaml batch.yaml, grafical render deps.grafical.yaml.
`,
} as const;

export type DiagramType = keyof typeof TYPE_GUIDES;
