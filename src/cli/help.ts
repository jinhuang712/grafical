// The help pages: how to use grafical (specs/decisions, "One entry page, help where it is used", "Help for the tool, guides
// for best practice"). The entry page is read once, before a first draft: what grafical is, how to work, and every
// way to draw, by the story each tells. A command's page is read when the command is used: commander's usage and
// options, its line in a batch, then this file's sections, always in this order: When to use, Kinds, Good to know,
// Common mistakes, Limits, Batch file, Output, See also, Example. A page shows the ones it has. How
// common kinds of diagram are usually drawn is not here but in the guides (guides.ts), which no page tells an agent
// to read. Numbers are only the limits grafical enforces.

import { MAX_GROUP_DEPTH } from "../model/groups.ts";
import { MAX_EMPHASIS } from "../model/schema.ts";
import { MARK_COLORS, MARK_SHAPES, MARK_SIZES, STEP_NUMBER_MAX } from "../model/types.ts";

/** What grafical is: the top of `grafical --help`. */
export const PROGRAM_ABOUT = `grafical draws diagrams from facts: what exists and who talks to whom, what
moves where, the steps of a process, the states of a thing. You say which layer
a node is in, what it connects to and which group it belongs to; grafical
places, sizes and routes everything, and refuses a change that would draw
wrong. The diagram is one file, <name>.grafical, kept in git. It
does not draw sequence diagrams, ER or class diagrams, mind maps or timelines
on a time scale, such as Gantt charts.`;

/** The rest of `grafical --help`: how to work, every way to draw, and where the guides are. */
export const PROGRAM_AFTER = `
How to work:
  1. grafical new <file> --title <text> --subtitle <text>
  2. Write the whole draft as one batch file, then
     grafical apply <file> batch.yaml. apply --help has a full example, and
     each command's --help shows its line in a batch.
  3. grafical render <file> and look at the PNG, or read
     grafical show <file> --drawn.
  4. Improve one change at a time. grafical try <file> a.yaml b.yaml prints
     the counts before and after each, and writes nothing.
  A refused change writes nothing; a block for each problem says what
  happened, what caused it and which commands can change it. Never edit
  the file by hand.

Ways to draw, by the story each tells:
  the way things move     layers, top to bottom (layer add); the order of a
                          layer decides most crossings (node move, swap)
  a thing, step or state  node add --type; node merge for several a reader
                          need not tell apart; node mark for a mark
  a node beside a node      node add --from <node> --right 1, which moves with
                          it; node align, directly above or below
  what talks to what      edge add --type; an end may be a group, a layer or
                          a lane, for one line to the whole
  one path, in order      edge number numbers its edges; edge weight draws
                          it thick
  what every request      a layer with no nodes that edges end at, drawn as
  passes                  one bar: a gateway or a bundle
  one system or team      group add, nested with --in; group label-at places
                          its label; group copy makes a second zone
  who does what           lane add
  two sides               column add; wall add keeps two parts apart, and
                          with --label draws a divider
  what the nodes cannot   note add, a card or a footnote; diagram legend;
  say                     the subtitle; a footnote (new --note)

How common kinds of diagram are usually drawn, if you want it: grafical guide.
`;

/** The example of `grafical apply --help`, which the tests build and check. */
export const EXAMPLE_NEW = `grafical new orders.grafical --title "Order desk and shipping" --subtitle "Two services coupled only by the shared orders database."`;
export const EXAMPLE_BATCH = `- {op: layer.add, id: row-callers, label: Callers}
- {op: layer.add, id: row-entry, label: Entry}
- {op: layer.add, id: row-core, label: Core}
- {op: layer.add, id: row-store, label: Store}
- {op: node.add, id: shoppers, layer: row-callers, label: Shoppers, sublabel: "web, mobile", type: actor}
- {op: node.add, id: gateway, layer: row-entry, label: API gateway, sublabel: "REST, :8080"}
- {op: node.add, id: checkout, layer: row-core, label: checkout, sublabel: "validate, price"}
- {op: node.add, id: events, layer: row-core, label: order topics, sublabel: 3 broker topics, type: queue, last: true}
- {op: node.add, id: dispatcher, layer: row-core, label: dispatcher, sublabel: one per carrier, last: true}
- {op: node.add, id: orders-db, layer: row-store, label: Orders DB, sublabel: "orders, parcels", type: store, emphasis: true}
- {op: group.add, id: order-desk, label: order-desk, nodes: [gateway, checkout]}
- {op: group.add, id: shipping, label: shipping, nodes: [events, dispatcher]}
- {op: edge.add, from: shoppers, to: gateway}
- {op: edge.add, from: gateway, to: checkout}
- {op: edge.add, from: checkout, to: events, label: publish, type: async}
- {op: edge.add, from: events, to: dispatcher, type: async}
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
    about: "Create an empty diagram file. Name it <name>.grafical.",
    after: `
Good to know:
  - The title names the system or process. The subtitle says in one
    sentence what the diagram shows. The note is a footnote.
  - Leave --density, --sizing and --style out unless the user asks.
  - Next, write the whole draft as one batch: grafical apply --help.

Example:
  grafical new shop.grafical --title "Shop checkout" \\
    --subtitle "How an order reaches the warehouse."
`,
  },

  apply: {
    about: `Apply a YAML list of operations, all or nothing. This is the way to draft:
one batch with every layer, node, group and edge.`,
    after: `
Batch file:
  A YAML list. Each item is {op: <noun>.<verb>, ...} with the command's
  arguments and options as fields, in camelCase. Operations apply in order; if
  one fails, none apply, and the refusal's source gives its line in the file.
  Every command works in a batch: its --help shows its line, such as
  grafical node add --help.

Good to know:
  - Add layers first, then nodes, then groups and lanes, then edges.
  - Quote text that holds a comma, a colon or a #: sublabel: "iOS, Android".
  - from with down, up, left or right: a node in no layer, cells from a node.
  - An id is lowercase letters, digits, ".", "_" or "-", and unique across
    layers, nodes, groups, lanes and edges: a node cannot share its layer's id.

Output:
  ok changed=<ids> when the change is written, or failed changed=- when it
  is refused and nothing is written; then a block for each problem, a blank
  line before each; then, on apply, the counts:
    <kind>: <code>
    description: <what happened, one sentence per code>
    source: <the command, its batch line, its batch file, or "already in
            the file">
    detail:
      <key>: <value>
    next: <the commands that can change it, or ->
  A detail key named for one thing (node, edge) holds one value; one named
  for several (nodes, edges, ends) holds a list, even of one, in --json too.
  kind is error (nothing could be applied), defect (it would draw wrong) or
  warning (written, drawn poorly). A warning has no source line: the
  outcome line names what changed. Every write, check and render prints
  every warning the diagram has:
    bent-edge          a line of over 2 bends: edge, bends, skip (the layers
                       between its ends' layers)
    passing-layer      an edge through layers it does not connect: edge, layers
    edge-across-group  an edge through a group holding neither of its ends:
                       edge, groups
    tight-edges        two lines under 12 px apart for over 100 px: edges,
                       over (the pixels they share)
    crowded-label      a label under 8 px from an edge, node, border or label
                       on two sides: edge
    lonely-node         a node no edge reaches, neither its own nor one to its
                       group, layer or lane: node
    node-aside          a node beside every node it connects to: node, nodes
    edge-per-member    every node of a group has an edge alike to one end, or
                       from it: group, edges
    crossing           two lines that cross: edges
  counts nodes= edges= crossings= bends= bent= length= width= height=
         fullest= busiest= longest= passing= across= tight= crowded=
    crossings counts the points where edges cross; length is every edge's
    length together, in pixels. fullest: the layer with most nodes,
    <layer>:<nodes>; busiest: the node with most edges, <node>:<edges>;
    longest: <edge>:<length>; bent, passing, across, tight and crowded
    count the warnings of their kind. grafical show <file> --drawn prints a
    record per node and edge.
  Exit codes: 0 done, 1 refused, 2 a usage error.

Example: two systems around a shared store
  ${EXAMPLE_NEW}
  Write batch.yaml:
${indent(EXAMPLE_BATCH)}  grafical apply orders.grafical batch.yaml
  grafical render orders.grafical
`,
  },

  render: {
    about:
      "Write the picture as SVG and PNG beside the file; --svg or --png alone writes only that one.",
    after: `
Good to know:
  - Look at the PNG after a draft, and after any change you are unsure of.
  - Like apply and check, it prints every warning and the counts.
`,
  },

  show: {
    about: `Print a compact view of the diagram: layers, nodes in order, groups, lanes and
edges, in the words of the operations. Read it instead of the file.`,
    after: `
Good to know:
  - --drawn prints how it is drawn, one record per line, as key=value:
      counts ...                    as apply prints them
      node id= layer= place= of= width= height= edges= sides= reach=
      group id= members= width= height=
      edge id= from= to= leaves= enters= bends= length= direct= detour=
           skip= crosses= passes= bundle=
      gutter above= below= edges= crossings= tight= crowded=
      wall id= run= length= space= edges=   edges: the edges through it
      note on= as= number= lines=   as: callout or footnote
      legend style= weight= width= mark= text=   each style and width the
           picture draws, and each named mark; text=- has no entry
    place counts from 1 at the layer's left, and of is how many nodes the
    layer holds. sides counts a node's edges by side, as top:1,bottom:2, and
    reach is their length together. direct is the shortest an edge between
    its two ends could be, and detour its length over direct. skip counts
    the layers between its ends' layers. passes names the layers it runs
    through without meeting a node of. gutter is the space between two
    neighbouring layers that hold nodes: the edges with a run in it, and the
    crossings, tight pairs and crowded labels in it, counted as apply's
    counts are. Sizes and lengths are in pixels; - means none. Judge the
    drawing from them, and change what you decide to change.
  - bundle names the edges an edge leaves or arrives with as one: three or
    more lines of one style and width from one side of a node, or two on a
    side too crowded for a port each. A labelled edge is never bundled, so
    a label keeps an edge on its own.
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
    about: `Report the defects you can fix, every warning and the counts, without changing
anything, as apply --help's Output says. --all adds the engine's own defects,
which are its bugs.`,
  },

  try: {
    about: `Apply a batch without writing it, and print the drawing's counts before and
after it, as apply prints them, and the change in each. Nothing is written.
Give several batches to compare them: one before, then each batch's records
keyed batch=<file>.`,
    after: `
Good to know:
  - Use it to compare arrangements you are weighing: a layer moved, two nodes
    swapped, a node slid along its layer. Decide which to keep, then apply it.
  - A batch it would refuse is refused as apply would refuse it; with several,
    its outcome line carries batch=<file>, its blocks follow, and the others
    are still tried (exit 1).

Example:
  grafical try shop.grafical move.yaml
  ok changed=storefront written=no
  before nodes=9 edges=10 crossings=1 bends=12 length=3140 ...
  after nodes=9 edges=10 crossings=1 bends=8 length=2380 ...
  delta nodes=0 edges=0 crossings=0 bends=-4 length=-760 ...
`,
  },

  "layer add": {
    about: "Add a layer. A new layer goes to the bottom unless --before or --after places it.",
    after: `
Good to know:
  - Layers run top to bottom the way a request or a process moves.
  - A layer is not drawn: it only places its nodes. It is drawn when an edge
    ends at it or layer look gives it a look: around its nodes as a band,
    or, with no nodes, as one bar that edges meet straight past their other
    ends, such as a gateway or a bundle.
  - --label names a layer by what it holds ("Entry", "Stores"). The name shows
    only when the layer is drawn; a layer drawn with no name shows none.
  - Layers and nodes share one set of ids: give layers ids like row-users.

See also: layer move, layer split, node add
`,
  },
  "layer split": {
    about: "Move the second half of a layer, or the nodes from --from on, into a new layer below.",
    after: `
When to use:
  - A layer holds more nodes than read well side by side; the counts give
    the layer with most nodes (fullest) and the picture's width.
  - Or merge nodes a reader need not tell apart (node merge).
`,
  },
  "node add": {
    about: `Add a node to a layer, at the place you give: --first, --last, --before or --after.
Only the first node of an empty layer needs none. Or add it in no layer, some steps
from another node: --from with --down, --up, --left or --right.`,
    after: `
Kinds:
  service    something that runs: an app, an API, a job, a step (default)
  store      where data rests: a database, a bucket, a cache
  queue      a topic or stream; one node may stand for several
  external   something you do not own: a card processor, a SaaS API
  actor      a person or a caller outside the system
  terminal   a process's Start and End
  decision   a process's question, kept short ("Within 30 days?")
  state      a state of one thing, named by what the thing is ("Paid")
  initial    the start dot of a states diagram; its label is not drawn
  final      the end ring of a states diagram; its label is not drawn
  choice     a small diamond where an edge splits; its label is not drawn,
             the question goes on the edge into it

Good to know:
  - Leave --size out: grafical sizes the node to its text. Shorten a long
    label rather than reaching for a large node.
  - The order of a layer decides most crossings. Compare two orders with
    grafical try and keep the one with fewer.
  - A step is one cell of grafical's grid: a layer down or up, a column left
    or right. A node placed by steps moves with the node it steps from, and
    the nodes of the layer it lands in stand aside. Past the first or last
    layer, grafical adds a layer. You choose the steps; grafical keeps them.

Common mistakes:
  - Giving a node its layer's id: layers and nodes share one set of ids, so
    layers take ids like row-users.
  - Start and End of a process as initial and final: their labels vanish.
    Use terminal.
  - In a batch file, a sublabel with a comma unquoted.

Limits:
  - At most ${MAX_EMPHASIS} nodes carry --emphasis.
  - A sublabel holds one line, about 30 characters, and a label must fit
    the large node; longer text is refused (overflow).
  - Each step option takes 1 to 10. A node placed by steps takes no layer,
    position, --align, column or lane.

See also: node merge, node type, node sublabel, edge add

Example:
  grafical node add shop.grafical orders-db --layer row-store --last \\
    --label "Orders DB" --type store --sublabel Postgres --emphasis
`,
  },
  "node merge": {
    about: "Replace several nodes with one new node that keeps all of their edges.",
    after: `
When to use:
  - Several nodes a reader need not tell apart: six topics become one node
    "upstream topics" with sublabel "6 broker topics".
  - Only for nodes with the same connections: a merged node claims every
    line of every part, so it can draw a call that does not exist.
`,
  },
  "node move": {
    about: `Move a node to another layer or position. Into another layer, give the place too,
as node add does. --from with steps takes it out of its layer; --layer puts it
back in one.`,
  },
  "node emphasis": {
    about: "Emphasize a node as the thing to see first, or take the emphasis off with --off.",
    after: `
Limits:
  - At most ${MAX_EMPHASIS} nodes carry emphasis.
`,
  },
  "node mark": {
    about: `Put a mark on a node, such as a warning at its top-left. The mark is an
emoji, up to 6 characters of text, or an SVG or PNG file next to the diagram.
Without --mark, the slot is cleared.`,
    after: `
Slots (one mark each):
  top-left, top-right, bottom-left, bottom-right   over a corner of the node
  left                                             inside the node, before text

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
  grafical node mark d.grafical billing --slot top-left --mark "⚠️"
  grafical node mark d.grafical billing --slot top-right --mark P0 --bg red
`,
  },
  "node align": {
    about: "Sit directly above or below a node in another layer; without --to, stop.",
  },

  "edge add": {
    about: `Draw an edge from one thing to another. from and to may be a node, a group
(one line to the whole system), a layer or a lane.`,
    after: `
Kinds:
  call       a request (default), solid
  async      a message or an event, dashed
  data       data that moves, solid, labelled with what moves
  optional   made only sometimes, dotted
  link       related, with no direction: no arrowhead

Good to know:
  - Edges between neighbouring layers stay straight; an edge that skips layers
    has to go around.
  - One edge to a group replaces an edge to each of its parts.
  - An edge that passes a bar, a layer with no nodes that edges end at or
    that has a look, is refused (bar-crossed) unless --pass says it may,
    since a reader takes an edge over a gateway for an edge through it.
  - The id is <from>-><to> unless --id names it; a second one gets #2.

See also: edge weight, diagram legend
`,
  },
  "edge weight": {
    about: "Set how thick edges are, by level or in pixels; without --weight, thin again.",
    after: `
Levels:
  thin is the default, then thick and heavy.
  A stylesheet may retune them and add levels; an unknown level is refused
  and the error lists the allowed ones. A number of pixels runs from 0.5 to 8.

Good to know:
  - Prefer a level to a number: levels read the same across a diagram.
`,
  },

  "edge number": {
    about: "Number an edge as a step of a process; without --n, clear its number.",
    after: `
When to use:
  A story of one request or one process that the reader follows in order:
  number its edges in the order they happen. Edges outside that story stay
  unnumbered.

Good to know:
  - grafical draws the number in a small ring on the edge, under the start
    of its label. It never numbers, renumbers or checks the order for you.
  - Edges may share a number, for steps that happen at the same time.
  - A numbered edge keeps its own way out of a node, as a labelled one does.
  - A number with no room on the edge's way is refused as label-blocked,
    as a label is.
  - edge add takes no number: in a batch, add the edges, then
    {op: edge.number, id: <edge>, n: <number>} for each.

Limits:
  --n is a whole number from 1 to ${STEP_NUMBER_MAX}.

Example:
  grafical edge number shop.grafical "checkout->events" --n 2
  grafical edge number shop.grafical "checkout->events"
`,
  },

  "group add": {
    about: `Draw one node around the parts of one system, service or team. Its members may
sit in several layers; the node spans them all.`,
    after: `
When to use:
  - Around the parts one team owns or one service deploys together.
  - To show who does each step of a process, use lanes (lane add --help).

Common mistakes:
  - Listing a group as a member: nest it with --in instead.
  - In a batch file, nodes is a list: nodes: [api, worker].
  - Adding a group before its nodes exist.

Limits:
  - A node is in one group at most. Groups nest at most ${MAX_GROUP_DEPTH} deep.
  - A node covers every layer from its top member to its bottom one; other
    nodes in those layers sit beside it.

See also: group join, group leave, group label-at, lane add

Example:
  grafical group add cloud.grafical vpc --label "Main network" --in region
  grafical group join cloud.grafical vpc web api
`,
  },
  "group label-at": {
    about: `Say where a group's label sits: a fraction from 0 to 1 along a side, the side
(top by default), and inside (by default) or outside the group. At 0.7 the
label's own 70% point meets the side's 70% point, so it never runs past the side.
Without a fraction, the engine seats it at the top, at the leftmost spot no
edge comes near. Either way the label takes its own room, and no node or edge
moves for it.`,
    after: `
Example:
  grafical group label-at booking.grafical app 0 --side bottom
  grafical group label-at booking.grafical app 0.5 --side left --place outside
  grafical group label-at booking.grafical app
`,
  },
  "group copy": {
    about: `Copy a group: a second zone, region or shard in one operation. The copy holds
its inner groups, its nodes and the edges between them, every id with --suffix,
and sits in the group the original sits in.`,
    after: `
Place:
  Each copied node sits in its original's layer, --before or --after a group
  with a node in every layer of the copy, as group order puts it. The group
  itself always has one: --after <id>.

Good to know:
  - Copied nodes keep their labels, kinds, sizes, marks, lanes and columns.
    Rename the ones that differ, such as a standby.
  - Edges to nodes outside the group are copied only with --outside:
    lb->web gives lb->web-b.
  - An edge's id <from>-><to> becomes its copy's ends: web-b->db-b.
  - Notes and walls are not copied.

See also: group order, plug, diff

Example:
  grafical group copy ha.grafical zone-a zone-b --label "Zone B" \\
    --suffix -b --after zone-a --outside
`,
  },
  "group remove": {
    about:
      "Remove a group. Its nodes and inner groups move into the group around it, or out of every group with --out.",
  },

  "lane add": {
    about: `Add a swimlane: a labelled band that says who owns what. Its members are layers
(the lanes run as layers) or nodes (the lanes run as columns), one way per diagram.`,
    after: `
When to use:
  - Only when who does what is part of the story: teams, people or systems
    that each do their part of a process.
  - Columns suit a process that runs top to bottom: each step is a node in
    its owner's lane, and layers keep the order of the steps.
  - Layers suit an architecture whose tiers each belong to someone.

Good to know:
  - Column lanes run left to right in the order they were added.
  - A group lies inside one lane. An edge may end at a lane.

Common mistakes:
  - members written as a, b instead of a list: members: [a, b].
  - Adding lanes before their nodes or layers exist.

Limits:
  - A layer lane holds neighbouring layers only. An edge never joins two lanes.

Example:
  grafical lane add laptop.grafical it --label IT --members order,setup
`,
  },

  "column add": {
    about: `Add a column: a guide that nodes follow beside their layers. Every node of a column
sits left of every node of the next column, in every layer. Nothing is drawn.`,
    after: `
When to use:
  - When a diagram has sides: requests on the left and processing on the
    right, one team's services and another's, reads and writes.
  - Leave a node shared by two sides, such as their database, out of every
    column: it keeps its place, and a new one lands near what it connects to.

Good to know:
  - Columns go left to right in the order they are added, or --before and
    --after another column.
  - grafical keeps every layer in column order; a node in no column stays
    beside the node left of it.
  - A group as a member brings its nodes.
  - A diagram has columns or lanes that run as columns, not both.

Example:
  grafical column add shop.grafical requests --nodes web,api,cache
`,
  },

  "wall add": {
    about: `Add a wall: empty space between two sides, each a list of nodes and groups.
grafical decides where it runs, and nothing is placed in it.`,
    after: `
When to use:
  - To keep two parts of a picture apart: the internet and a private
    network, two tenants, what a team owns and what it calls.
  - With --label it draws a dashed divider through the space, the label at
    its start. Without one it is only space.
  - A label with no place along the wall clear of the edges across it is
    refused (label-blocked): shorten or drop it with wall label.

Crossing:
  - An edge from one side to the other is refused (wall-crossed) unless the
    wall allows it: --allow names the edge, or a node or group at one of
    its ends, such as a gateway. grafical wall allow lets more through.
  - Any other edge whose route passes through the wall is a defect with the
    same code: allow it, or move a node so that its edge goes round.

Good to know:
  - It runs across when one side lies wholly above the other, and up and
    down when the sides share layers, one side left of the other in each. It
    is as long as the two sides need, not the whole picture.
  - Up and down, each layer it spans needs a node of a side, and no other
    node between the sides: that node would stand in the wall (wall-sides).
  - A node, group or edge that is removed leaves the wall; a wall left with
    an empty side goes too.

Example:
  grafical wall add shop.grafical net --between web,mobile --and orders,users --allow gateway --label "private network"
`,
  },
  "note add": {
    about: `Add a note to a node, a group or an edge: a sentence or two a reader needs and
no node should hold. A node, group or edge has one note; adding another replaces it.`,
    after: `
How it is drawn:
  - A card beside what it is about, joined to it by a short dotted line.
  - With --footnote, a small number on it, and the text in a numbered list
    at the bottom of the picture.

Good to know:
  - Keep it short: more than four lines at 160 px is an overflow.
  - A note goes when what it is about is removed.
  - show --drawn says how each note is drawn.

Example:
  grafical note add shop.grafical --on retry --text "retries 5 times, then the DLQ"
  grafical note add shop.grafical --on retry --text "replayed by hand" --footnote
`,
  },
  "note remove": { about: "Remove the note of a node, a group or an edge." },

  "layer look": {
    about: `Draw a layer, as a box or as a band, even when no edge ends at it. Without a
look, a layer is drawn only when an edge ends at it: with no nodes as a box, with
nodes as a band. Without box or band, the look is taken away.`,
    after: `
Good to know:
  - A drawn layer shows its name, when it has one: in the head of a band,
    above its nodes, or in the bar of a layer with no nodes.
  - A layer with no nodes and a look is one bar, such as a gateway or a bundle.
    An edge that passes it is refused (bar-crossed) unless edge pass lets it.
  - In a batch the look is a field: {op: layer.look, id: <id>, look: node}.
`,
  },
  "edge pass": {
    about:
      "Let an edge pass bars between its ends: layers with no nodes that edges end at or that have a look; --off takes it back.",
  },

  "wall allow": {
    about:
      "Let edges through a wall: name an edge, or a node or group to let every edge that ends at it through; --off takes them back.",
  },

  "diagram legend": {
    about:
      "Name what an edge style, an edge width or a mark means in the legend; without --text, take its entry away.",
    after: `
The legend says only what you name. A diagram that names nothing has no
legend. show --drawn prints a legend record for each edge style and width
the picture draws, with text=- for those you have not named.

Edge widths:
  Name a width with --weight in place of the style: thick, heavy, a
  stylesheet's level, or the pixels an edge weight gives, as the legend
  record's weight says. Each named width has its own entry. Thin edges are
  what the edge styles' entries say.

Marks:
  Name a mark with --mark in place of the style: its emoji, its text or its
  file, as node mark set it. Marks with the same name share one entry.
`,
  },
  "diagram style": {
    about:
      "Take the look from a theme or a stylesheet; without one, the default theme. Change it only when the user asks.",
  },
};
