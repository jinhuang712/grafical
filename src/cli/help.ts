// The help pages: all an agent reads to learn grafical (DESIGN.md D36). A page is
// commander's usage, options and commands, then this file's sections, always in this
// order: When to use, By diagram type, Kinds, Good to know, Common mistakes, Limits,
// Batch file, Output, When refused, See also, Example. A page shows the ones it has.
// Advice gives a direction, not a number; numbers are only the limits grafical enforces.

import { MAX_GROUP_DEPTH } from "../model/groups.ts";
import { MAX_ACCENTS } from "../model/schema.ts";

/** What grafical is: the top of `grafical --help`. */
export const PROGRAM_ABOUT = `grafical draws architecture and process diagrams from facts. You say which
row a box is in, what it connects to and which group it belongs to; grafical
places, sizes and routes everything, and refuses a change that would draw
wrong. The diagram is one YAML file, <name>.grafical.yaml, kept in git.`;

/** The rest of `grafical --help`: how to work, what makes a diagram good, the types. */
export const PROGRAM_AFTER = `
How to work:
  1. grafical new <file> --title <text> --subtitle <text> --note <text>
  2. Write all rows, nodes, groups and edges in one batch file, then
     grafical apply <file> batch.yaml            (grafical apply --help)
     Name rows for what they hold, so that no row shares a box's id.
  3. grafical render <file>, and look at the PNG.
  4. Fix with single commands. When the output shows lines: and hint:,
     weigh each hint and run the ones that keep your rows' meaning.
  Never edit the file by hand. A refused change leaves the file untouched:
  fix what the error names and run it again.

A good diagram:
  - One story per diagram. When boxes stop serving that story, merge what a
    reader need not tell apart, or make it two diagrams.
  - Rows follow the way a request or a process moves, top to bottom: who
    calls, the way in, the inside, shared stores, outside services.
  - Put a store between or below the parts that share it, so that each
    reaches it with a short line. Connect neighbouring rows where you can.
  - Box the parts of one service or team as a group. Callers and outside
    services stay out of every group.
  - Merge only what has the same connections: a merged box claims every
    line of every part.
  - Draw each flow to its end, or leave it out.
  - Keep labels short. Detail (port, technology, count) goes in the
    sublabel, not in extra boxes, and a sublabel holds one line.
  - Accent what the story is about. Name what each line style means in the
    legend: diagram legend <file> dashed --text event. Say what you left out
    in a note that starts "Not shown:".

Diagram types:
  architecture   services, stores and queues; a group per system; label
                 only the lines whose meaning is not obvious
  c4             people are actor, other systems external, technology in
                 the sublabel; one group around the system's containers;
                 label every line with what its source does
  flowchart      a row per step; terminal for Start and End, decision for
                 a question; label each answer and nothing else
  state machine  an initial dot, state boxes, a final ring; label every
                 transition with its event
  swimlane       lanes, only when who does what is the story
  cloud          region, network and subnet as groups inside groups; users
                 and the way in on top, data at the bottom
  deployment     environment, cluster and host as groups inside groups;
                 runtime and count in the sublabel
  event flow     producers, a queue per topic, consumers; lines in and out
                 of a topic are async; the producer's line names the event
  data flow      sources, processes and stores; every line is kind data,
                 labelled with what moves
  dependency     what depends on top, what it needs below; no labels; kind
                 optional where a dependency degrades gracefully
  The help of node add, edge add, group add and lane add says more.

When refused:
  The command prints "failed, file unchanged" and one line per problem,
  starting "error op" (a fact is wrong) or "defect" (the picture would be
  wrong). Each line says how to fix it. Exit codes: 0 done, 1 refused, 2 a
  usage error. grafical apply --help lists the codes.

Run grafical <command> --help for its options and what to know about it.
`;

/** The example of `grafical apply --help`, which the tests build and check. */
export const EXAMPLE_NEW = `grafical new orders.grafical.yaml --title "Order desk and shipping" --subtitle "Two services coupled only by the shared orders database." --note "Not shown: payment retries, admin tools."`;
export const EXAMPLE_BATCH = `- {op: layer.add, id: callers, label: Callers}
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
`;

const indent = (text: string) =>
  text
    .split("\n")
    .map((l) => (l === "" ? l : `  ${l}`))
    .join("\n");

/**
 * Each command's page, by its path ("node add"): `about` is the paragraph under its
 * usage (the parent's list keeps the one-line description), `after` its sections.
 */
export const PAGES: Record<string, { about?: string; after?: string }> = {
  new: {
    about: "Create an empty diagram file. Name it <name>.grafical.yaml.",
    after: `
Good to know:
  - The title names the system or process. The subtitle says in one
    sentence what the diagram shows. The note says what it leaves out,
    starting "Not shown:".
  - Leave --density, --sizing and --style out unless the user asks.
  - Next, write the whole draft as one batch: grafical apply --help.

Example:
  grafical new shop.grafical.yaml --title "Shop checkout" \\
    --subtitle "How an order reaches the warehouse." \\
    --note "Not shown: refunds, returns."
`,
  },

  apply: {
    about: `Apply a YAML list of operations, all or nothing. This is the way to draft:
one batch with every row, node, group and edge, so that grafical places each
node knowing all of its lines.`,
    after: `
Batch file:
  A YAML list. Each item is {op: <noun>.<verb>, ...} with the command's
  arguments and flags as fields, in camelCase. Operations apply in order; if
  one fails, none apply, and the error gives its index, counting from 0.
    layer.add         id label before after
    node.add          id layer label kind sublabel size first last before
                      after align accent
    node.move         id layer first last before after
    edge.add          from to id label kind both
    group.add         id label sublabel nodes in       (nodes is a list)
    group.join        group nodes                      (a list)
    group.leave       nodes up
    lane.add          id label members                 (a list)
    edge.emphasize    edges off                        (a list)
    diagram.legend    style text      (style: solid, dashed, dotted or plain)
    diagram.subtitle  text; diagram.note text           (no text clears it)
  Every other command works too, its arguments named as in its help:
  node.swap a b, node.merge id nodes label, layer.split id into label from.

Good to know:
  - Add rows first, then nodes, then groups and lanes, then edges.
  - Quote text that holds a comma, a colon or a #: sublabel: "iOS, Android".
  - Write lists as [a, b].
  - An id is lowercase letters, digits, ".", "_" or "-", and unique across
    rows, nodes, groups, lanes and edges: a node cannot share its row's id.

Output:
  ok changed: <ids>          the change is written
  lines: ...                 lines that cross, and lines that bend more
                             than twice
  hint: <gain>: <commands>   a move grafical measured to fix them. You
                             decide; one marked as moving a node among
                             other kinds rarely belongs.
  warning <code> ...         never blocks; weigh it:
                             too-many-nodes: merge (node merge)
                             too-wide, crowded-layer: split a row
                             (layer split)
                             lonely-group: remove the group or add a node
                             edge-crosses-layer: move a row (layer move)
                             too-many-main-edges: emphasize fewer edges
  --json prints the same as one JSON object.

When refused:
  failed, file unchanged, then one line per problem:
  error op <index> <code> <field>: found <value>; expected <what>; <suggestion>
    unknown-node, -layer, -group, -lane, -edge: the suggestion names the
    closest ids. duplicate-id, bad-id, bad-type, bad-value, missing-field,
    unknown-field, unknown-op: the item is malformed. Others: follow the
    suggestion.
  defect <code> [<elements>]: found <what>; expected <what>; fix: <operation>
    overflow: a label is too long for its box; shorten it, or move detail
    to the sublabel. missing-glyph: a character cannot be drawn; replace it.
    Where lines and boxes go is grafical's job, never yours.
  Exit codes: 0 done, 1 refused, 2 a usage error.

See also: show, render, diff

Example: two systems around a shared store
  ${EXAMPLE_NEW}
  Write batch.yaml:
${indent(EXAMPLE_BATCH)}  grafical apply orders.grafical.yaml batch.yaml
  grafical render orders.grafical.yaml
`,
  },

  render: {
    about: "Write the picture as SVG and PNG, beside the file unless --svg or --png say where.",
    after: `
Good to know:
  - Look at the PNG after a draft, and after any change you are unsure of.
  - Like apply, it names what to improve (lines:, hint:) and warns.
`,
  },

  show: {
    about: `Print a compact view of the diagram: rows, nodes in order, groups, lanes and
edges, in the words of the operations. Read it instead of the file.`,
  },

  check: {
    about: `Report the defects you can fix, the warnings and what to improve, without
changing anything. --all adds the engine's own defects, which are its bugs.`,
  },

  "layer add": {
    about: "Add a row. A new row goes to the bottom unless --before or --after places it.",
    after: `
Good to know:
  - Rows run top to bottom the way a request or a process moves.
  - Name a row by what it holds ("Entry", "Stores").
  - A row is drawn as a labelled band only when an edge ends at it.
  - Its id cannot be a node's id too: row users, node web-users.

See also: layer move, layer split, node add
`,
  },
  "layer split": {
    about: "Move the second half of a row, or the nodes from --from on, into a new row below.",
    after: `
When to use:
  - A row holds more boxes than read well side by side: the warnings
    too-wide and crowded-layer say so.
  - Or merge boxes a reader need not tell apart (node merge).
`,
  },
  "layer tidy": {
    about: "Reorder a row's nodes once, to untangle lines. Prefer the hints apply prints.",
  },

  "node add": {
    about: `Add a box to a row. grafical picks the slot with the fewest crossings, so add
the node's edges in the same batch for them to count.`,
    after: `
Kinds:
  service    something that runs: an app, an API, a job, a step (default)
  store      where data rests: a database, a bucket, a cache
  queue      a topic or stream; one node may stand for several
  external   something you do not own: a card processor, a SaaS API
  actor      a person or a caller outside the system
  terminal   a flowchart's Start and End
  decision   a flowchart's question, kept short ("Within 30 days?")
  state      a state machine's state, named by what the thing is ("Paid")
  initial    a state machine's start dot; its label is not drawn
  final      a state machine's end ring; its label is not drawn

Good to know:
  - Name a box by its role ("orders API") and put the product in the
    sublabel ("Postgres").
  - Leave --size out: grafical sizes the box to its text. Shorten a long
    label rather than reaching for a large box.
  - Give a position only when order matters.

Common mistakes:
  - Giving a node its row's id: ids are unique across everything.
  - Start and End of a flowchart as initial and final: their labels vanish.
    Use terminal.
  - In a batch file, a sublabel with a comma unquoted.

Limits:
  - At most ${MAX_ACCENTS} nodes carry --accent.
  - A sublabel holds one line, and a label must fit the large box; longer
    text is refused (overflow).

See also: node merge, node kind, node describe, edge add

Example:
  grafical node add shop.grafical.yaml orders-db --layer store \\
    --label "Orders DB" --kind store --sublabel Postgres --accent
`,
  },
  "node merge": {
    about: "Replace several nodes with one new node that keeps all of their edges.",
    after: `
When to use:
  - Several boxes a reader need not tell apart: six topics become one node
    "upstream topics" with sublabel "6 broker topics".
  - Only for nodes with the same connections: a merged box claims every
    line of every part, so it can draw a call that does not exist.
`,
  },
  "node move": {
    about: "Move a node to another row or position. Without a position, grafical picks the slot.",
  },
  "node kind": {
    about: "Change a node's kind (grafical node add --help lists them).",
  },
  "node emphasize": {
    about: "Accent a node as the thing to see first, or take the accent off with --off.",
    after: `
Limits:
  - At most ${MAX_ACCENTS} nodes carry an accent.
`,
  },
  "node align": {
    about: "Sit directly above or below a node in another row; without --to, stop.",
  },

  "edge add": {
    about: `Draw a line from one thing to another. from and to may be a node, a group
(one line to the whole system), a row or a lane.`,
    after: `
Kinds:
  call       a request (default), solid
  async      a message or an event, dashed
  data       data that moves, solid, labelled with what moves
  optional   made only sometimes, dotted
  link       related, with no direction: no arrowhead

By diagram type (when to label):
  architecture   only what is not obvious ("publish", "persist", "failed");
                 leave plain calls and reads unlabelled
  c4             every line, with what its source does ("reads from")
  data flow      every line, with the data ("card details")
  flowchart      each answer out of a decision ("yes", "no"), nothing else
  state machine  every transition, with its event ("pay", "cancel")
  event flow     the producer's line, with the event; lines in and out of
                 a topic are async
  dependency     none; kind optional for a dependency that degrades

Good to know:
  - Draw each flow to its end: a retry topic needs its line back.
  - Lines between neighbouring rows stay straight; a line that skips rows
    has to go around.
  - One line to a group replaces a line to each of its parts.
  - The id is <from>-><to> unless --id names it; a second one gets #2.

See also: edge emphasize, diagram legend
`,
  },
  "edge emphasize": {
    about: "Draw edges thick, as the main path, or thin again with --off.",
    after: `
By diagram type:
  architecture   the main request path, if there is one
  state machine  the usual life of the thing
  event flow     the path of the event the diagram is about

Good to know:
  - Keep the main path a small part of the lines, or nothing stands out
    (warning too-many-main-edges).
`,
  },

  "group add": {
    about: `Draw one box around the parts of one system, service or team. Its members may
sit in several rows; the box spans them all.`,
    after: `
When to use:
  - Around the parts one team owns or one service deploys together.
  - Not around a single node: a box with one member says nothing.
  - To show who does each step of a process, use lanes (lane add --help).

By diagram type:
  architecture   a group per system; callers and outside services stay out
  c4             one group around the system's containers, sublabel
                 "software system"; people and other systems stay out
  cloud          region, then network, then subnet, each inside the last
  deployment     environment, then cluster, then host, each inside the last
  flowchart      none, unless the steps fall into clear phases

Common mistakes:
  - Listing a group as a member: nest it with --in instead.
  - In a batch file, nodes is a list: nodes: [api, worker].
  - Adding a group before its nodes exist.

Limits:
  - A node is in one group at most. Groups nest at most ${MAX_GROUP_DEPTH} deep.
  - A box covers every row from its top member to its bottom one; other
    nodes in those rows sit beside it.

See also: group join, group leave, group remove, lane add

Example:
  grafical group add cloud.grafical.yaml vpc --label "Main network" --in region
  grafical group join cloud.grafical.yaml vpc web api
`,
  },
  "group remove": {
    about:
      "Remove a group. Its nodes and inner groups move into the group around it, or out of every group with --out.",
  },

  "lane add": {
    about: `Add a swimlane: a labelled band that says who owns what. Its members are rows
(the lanes run as rows) or nodes (the lanes run as columns), one way per diagram.`,
    after: `
When to use:
  - Only when who does what is part of the story: teams, people or systems
    that each do their part of a process.
  - Columns suit a process that runs top to bottom: each step is a node in
    its owner's lane, and rows keep the order of the steps.
  - Rows suit an architecture whose tiers each belong to someone.

Good to know:
  - Column lanes run left to right in the order they were added.
  - A group lies inside one lane. An edge may end at a lane.

Common mistakes:
  - members written as a, b instead of a list: members: [a, b].
  - Adding lanes before their nodes or rows exist.

Limits:
  - A row lane holds neighbouring rows only. An edge never joins two lanes.

Example:
  grafical lane add laptop.grafical.yaml it --label IT --members order,setup
`,
  },

  "diagram legend": {
    about: "Name what a line style means in the legend; without --text, the default wording.",
    after: `
By diagram type:
  c4             solid "uses"
  flowchart      solid "next step"
  state machine  solid "transition"
  event flow     dashed "event"
  data flow      solid "data"
  dependency     solid "depends on", dotted "optional"
`,
  },
  "diagram style": {
    about:
      "Take the look from a theme or a stylesheet; without one, the default theme. Change it only when the user asks.",
  },
  "diagram tidy": {
    about: "Reorder every row once, to untangle lines. Prefer the hints apply prints.",
  },
};
