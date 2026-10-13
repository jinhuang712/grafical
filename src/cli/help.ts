// The help pages: all an agent reads to learn grafical (DESIGN.md D36). A page is
// commander's usage, options and commands, then this file's sections, always in this
// order: When to use, By diagram type, Kinds, Good to know, Common mistakes, Limits,
// Batch file, Output, When refused, See also, Example. A page shows the ones it has.
// Advice gives a direction, not a number; numbers are only the limits grafical enforces.

import { MAX_GROUP_DEPTH } from "../model/groups.ts";
import { MAX_ACCENTS } from "../model/schema.ts";
import { MARK_COLORS, MARK_SHAPES, MARK_SIZES } from "../model/types.ts";

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
     Rows and boxes share one set of ids, so give rows ids like row-users.
  3. grafical render <file> and look at the PNG, or read
     grafical show <file> --drawn.
  4. Fix with single commands. To weigh a change first, grafical try <file>
     <batch> prints the counts before and after it.
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
    sublabel, not in extra boxes; a sublabel holds one line, about 30
    characters.
  - Accent what the story is about. Name what each line style means in the
    legend: diagram legend <file> dashed --text event. Say what you left out
    in a note that starts "Not shown:".

Diagram types:
  architecture   services, stores and queues; a group per system; label
                 only the lines whose meaning is not obvious
  c4             people are actor, other systems external, technology in
                 the sublabel; one group around the system's containers;
                 label every line with what its source does
  flowchart      a row per step; kind terminal for Start and End, kind
                 decision for a question; label each answer, nothing else
  state machine  kind initial for the start dot and kind final for the end
                 ring (neither draws its label), kind state for the rest;
                 label every transition with its event
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
  The command prints "failed changed=-" and a record per problem: "error"
  (a fact is wrong) or "defect" (the picture would be wrong), with a code
  and facts. The file is untouched. Exit codes: 0 done, 1 refused, 2 a
  usage error. grafical apply --help lists the facts.

Run grafical <command> --help for its options and what to know about it.
`;

/** The example of `grafical apply --help`, which the tests build and check. */
export const EXAMPLE_NEW = `grafical new orders.grafical.yaml --title "Order desk and shipping" --subtitle "Two services coupled only by the shared orders database." --note "Not shown: payment retries, admin tools."`;
export const EXAMPLE_BATCH = `- {op: layer.add, id: row-callers, label: Callers}
- {op: layer.add, id: row-entry, label: Entry}
- {op: layer.add, id: row-core, label: Core}
- {op: layer.add, id: row-store, label: Store}
- {op: node.add, id: shoppers, layer: row-callers, label: Shoppers, sublabel: "web, mobile", kind: actor}
- {op: node.add, id: gateway, layer: row-entry, label: API gateway, sublabel: "REST, :8080"}
- {op: node.add, id: checkout, layer: row-core, label: checkout, sublabel: "validate, price"}
- {op: node.add, id: events, layer: row-core, label: order topics, sublabel: 3 broker topics, kind: queue}
- {op: node.add, id: dispatcher, layer: row-core, label: dispatcher, sublabel: one per carrier}
- {op: node.add, id: orders-db, layer: row-store, label: Orders DB, sublabel: "orders, parcels", kind: store, accent: true}
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
    diagram.legend    style weight text (style: solid, dashed, dotted or plain)
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
  ok changed=<ids>           the change is written
  counts nodes= lines= crossings= bends= length= width= height= fullest=
         busiest= longest= passing=
    length is every line's length together, in pixels. fullest is the row
    with most nodes, as <row>:<nodes>; busiest the box with most lines, as
    <box>:<lines>; longest the longest line, as <line>:<length>; passing
    the lines that pass a row they do not connect. Facts only: what they
    mean is yours to judge. grafical show <file> --drawn prints a record
    for each box and line.
  --json prints the same as one JSON object, under the same names.

When refused:
  failed changed=-, the file untouched, then a record per problem:
  error op=<index> code=<code> field=<field> found=<value> <facts>
  defect code=<code> owner=agent elements=<ids> field=<field> found=<text>
         <facts>
  The code says what is wrong, and the facts what is there:
    near       the closest existing ids
    likely     what the value most likely means: use it
    allowed    the values or fields allowed
    free       an unused id like the one given
    count, lines, min, max   counts and limits
    row, group, node, nodes  the row or group it concerns, and its nodes
    line, column             where in the YAML
    fix        operations that would fix it
  unquoted-text: YAML cut unquoted text at a comma or a colon; quote it.
  overflow: the text takes more lines than its box holds; shorten it, or
  move detail to the sublabel. missing-glyph: chars cannot be drawn.
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
    about:
      "Write the picture as SVG and PNG beside the file; --svg or --png alone writes only that one.",
    after: `
Good to know:
  - Look at the PNG after a draft, and after any change you are unsure of.
  - Like apply and check, it prints the counts.
`,
  },

  show: {
    about: `Print a compact view of the diagram: rows, nodes in order, groups, lanes and
edges, in the words of the operations. Read it instead of the file.`,
    after: `
Good to know:
  - --drawn prints how it is drawn, one record per line, as key=value:
      counts ...                    as apply prints them
      box id= row= place= of= width= height= lines= sides= reach=
      group id= members= width= height=
      line id= from= to= leaves= enters= bends= length= direct= detour=
           skip= crosses= passes=
    place counts from 1 at the row's left, and of is how many boxes the
    row holds. sides counts a box's lines by side, as top:1,bottom:2, and
    reach is their length together. direct is the shortest a line between
    its two ends could be, and detour its length over direct. skip counts
    the rows between its ends' rows. passes names the rows it runs
    through without meeting a box of. Sizes and lengths are in pixels;
    - means none. Judge the drawing from them, and change what you decide
    to change.
`,
  },

  diff: {
    about: `Print how the file differs from a git revision, HEAD by default, as a batch of
operations that apply replays on the revision's file.`,
  },

  view: {
    about: `Open a live window that shows the diagram as it is now, redrawn within a moment
of every change, with the changed parts marked. Ctrl-C stops it.`,
  },

  check: {
    about: `Report the defects you can fix and the counts, without changing anything.
--all adds the engine's own defects, which are its bugs.`,
  },

  try: {
    about: `Apply a batch without writing it, and print the drawing's counts before and
after it, as apply prints them, and the change in each. Nothing is written.`,
    after: `
Good to know:
  - Use it to compare arrangements you are weighing: a row moved, two nodes
    swapped, a node slid along its row. You decide which to keep, then apply it.
  - A batch it would refuse is refused as apply would refuse it.

Example:
  grafical try shop.grafical.yaml move.yaml
  ok changed=storefront written=no
  before nodes=9 lines=10 crossings=1 bends=12 length=3140 ...
  after nodes=9 lines=10 crossings=1 bends=8 length=2380 ...
  delta nodes=0 lines=0 crossings=0 bends=-4 length=-760 ...
`,
  },

  "layer add": {
    about: "Add a row. A new row goes to the bottom unless --before or --after places it.",
    after: `
Good to know:
  - Rows run top to bottom the way a request or a process moves.
  - Name a row by what it holds ("Entry", "Stores").
  - A row is drawn as a labelled band only when an edge ends at it.
  - Rows and boxes share one set of ids: give rows ids like row-users.

See also: layer move, layer split, node add
`,
  },
  "layer split": {
    about: "Move the second half of a row, or the nodes from --from on, into a new row below.",
    after: `
When to use:
  - A row holds more boxes than read well side by side; the counts give
    the row with most nodes (fullest) and the picture's width.
  - Or merge boxes a reader need not tell apart (node merge).
`,
  },
  "layer tidy": {
    about: "Reorder a row's nodes once, to untangle lines.",
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
  - Giving a node its row's id: rows and boxes share one set of ids, so
    rows take ids like row-users.
  - Start and End of a flowchart as initial and final: their labels vanish.
    Use terminal.
  - In a batch file, a sublabel with a comma unquoted.

Limits:
  - At most ${MAX_ACCENTS} nodes carry --accent.
  - A sublabel holds one line, about 30 characters, and a label must fit
    the large box; longer text is refused (overflow).

See also: node merge, node kind, node describe, edge add

Example:
  grafical node add shop.grafical.yaml orders-db --layer row-store \\
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
  "node icon": {
    about: `Put a mark on a node, such as a warning at its top-left. The mark is an
emoji, up to 6 characters of text, or an SVG or PNG file next to the diagram.
Without --icon, the slot is cleared.`,
    after: `
Slots (one mark each):
  top-left, top-right, bottom-left, bottom-right   over a corner of the box
  left                                             inside the box, before text

Notes:
  - grafical sizes and places the mark; it takes no size or position.
  - A file is kept with its hash. If the file changes, run this again for
    the slot to accept it.
  - A text mark sits on a badge. What a text mark may set:
      --bg      the badge color (dark if left out)
      --fg      the text color (light or dark, whichever reads on --bg)
      --border  a border color (none if left out)
      --shape   ${MARK_SHAPES.join(", ")} (rounded if left out)
    A color is #rrggbb or one of
    ${Object.keys(MARK_COLORS).join(", ")}.
  - --size ${MARK_SIZES.join(", ")} sets any mark's size (m if left out). An emoji or
    a file takes --size only.
  - Setting a slot again replaces the mark, with the styles it names.
  - The left slot narrows the text. A diamond and a dot have corner slots only.
  - A corner mark that covers the label is refused (mark-covers). Give the node
    a larger size, or put the mark in the slot on the other side.

Example:
  grafical node icon d.grafical.yaml billing --slot top-left --icon "⚠️"
  grafical node icon d.grafical.yaml billing --slot top-right --icon P0 --bg red
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
  - Keep the main path a small part of the lines, or nothing stands out.
`,
  },

  "edge weight": {
    about: "Set how thick edges are, by level or in pixels; without --weight, thin again.",
    after: `
Levels:
  thin is the default, thick is what edge emphasize gives, heavy is thicker.
  A stylesheet may retune them and add levels; an unknown level is refused
  and the error lists the allowed ones. A number of pixels runs from 0.5 to 8.

Good to know:
  - Prefer a level to a number: levels read the same across a diagram.
  - Weight, like emphasize, replaces the other: the last one set is the look.
  - Thick and heavy lines stand out only against thin ones; few of them.
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
    about:
      "Name what a line style or a line width means in the legend; without --text, the default wording.",
    after: `
Line widths:
  Name a width with --weight in place of the style: thick, heavy, a
  stylesheet's level, or the pixels an edge weight gives. Each named width
  has its own entry. Widths heavier than thin that you do not name share one
  entry, "main path". Thin lines are what the line styles' entries say.

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
    about: "Reorder every row once, to untangle lines.",
  },
};
