// The help pages: how to use grafical (specs/decisions, "One entry page, help where it is used", "Help for the tool, guides
// for best practice"). The entry page is read once, before a first draft: what grafical is, how to work, and every
// way to draw, by the story each tells. A command's page is read when the command is used: commander's usage and
// options, then this file's sections, always in this order: When to use, Kinds, Good to know, Common mistakes,
// Limits, Output, See also, Example. A page shows the ones it has. How
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
  1. grafical diagram set <file> --title <text> --subtitle <text>
  2. Draw the draft one command at a time: layers, then nodes, then groups
     and lanes, then edges. diagram set --help shows a whole draft.
  3. grafical render <file> and look at the PNG, or read
     grafical show <file> --drawn.
  4. Improve one change at a time. A command that writes takes --try, which
     prints the counts before and after it and writes nothing.
  --set makes an object or changes what it names, and run twice it changes
  nothing. A refused command writes nothing; a block for each problem says
  what happened, what caused it and which commands can change it. Never
  edit the file by hand.

Ways to draw, by the story each tells:
  the way things move     layers, top to bottom (layer set); the order of a
                          layer decides most crossings (node move)
  a thing, step or state  node set --type; node merge for several a reader
                          need not tell apart; mark set for a mark
  a node beside a node    node set --from <node> --right 1, which moves with
                          it; node set --align, directly above or below
  what talks to what      edge set --from --to --type; an end may be a group,
                          a layer or a lane, for one line to the whole
  one path, in order      edge set --number numbers its edges; --weight
                          draws it thick
  what every request      a layer with no nodes that edges end at, drawn as
  passes                  one bar: a gateway or a bundle
  one system or team      group set, nested with --in; node set --group puts
                          nodes in it; label set places its label; a second
                          zone is a group copy
  who does what           lane set; layer set or node set --lane
  two sides               column set and node set --column; wall set keeps
                          two parts apart, and with --label draws a divider
  what the nodes cannot   note set, a card or a footnote; legend set; the
  say                     subtitle and the caption (diagram set)
  how far apart           style set --row-gap, --column-gap or a margin, and
                          --style on the diagram or on what it spaces

How common kinds of diagram are usually drawn, if you want it: grafical guide.
`;

/** The example of `grafical diagram set --help`: a whole draft, one command a line, which the tests build and check. */
export const EXAMPLE_DRAFT = `grafical diagram set orders.grafical --title "Order desk and shipping" --subtitle "Two services coupled only by the shared orders database."
grafical layer set orders.grafical row-callers --label Callers
grafical layer set orders.grafical row-entry --label Entry
grafical layer set orders.grafical row-core --label Core
grafical layer set orders.grafical row-store --label Store
grafical node set orders.grafical shoppers --layer row-callers --label Shoppers --sublabel "web, mobile" --type actor
grafical node set orders.grafical gateway --layer row-entry --label "API gateway" --sublabel "REST, :8080"
grafical node set orders.grafical checkout --layer row-core --label checkout --sublabel "validate, price"
grafical node set orders.grafical events --layer row-core --label "order topics" --sublabel "3 broker topics" --type queue --last
grafical node set orders.grafical dispatcher --layer row-core --label dispatcher --sublabel "one per carrier" --last
grafical node set orders.grafical orders-db --layer row-store --label "Orders DB" --sublabel "orders, parcels" --type store --emphasis on
grafical group set orders.grafical order-desk --label order-desk
grafical group set orders.grafical shipping --label shipping
grafical node set orders.grafical gateway,checkout --group order-desk
grafical node set orders.grafical events,dispatcher --group shipping
grafical edge set orders.grafical shoppers-gateway --from shoppers --to gateway
grafical edge set orders.grafical gateway-checkout --from gateway --to checkout
grafical edge set orders.grafical checkout-events --from checkout --to events --label publish --type async
grafical edge set orders.grafical events-dispatcher --from events --to dispatcher --type async
grafical edge set orders.grafical checkout-db --from checkout --to orders-db
grafical edge set orders.grafical dispatcher-db --from dispatcher --to orders-db --label persist
grafical render orders.grafical
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
  "diagram set": {
    about: `Make the diagram file, named <name>.grafical, or change the whole diagram. The file
is made with a --title; every other option changes what it names and keeps the rest.`,
    after: `
Good to know:
  - The title names the system or process. The subtitle says in one
    sentence what the diagram shows. The caption says what it leaves out.
  - Leave --stylesheet, --sizing and --style out unless the user asks.
  - Next, draw the draft one command at a time: layers first, then nodes,
    then groups and lanes, then edges.
  - An id is lowercase letters, digits, ".", "_" or "-", and unique across
    layers, nodes, groups, lanes and edges: a node cannot share its layer's id.
  - Give - to an option to clear it, or to set it back to its default.

Example: two systems around a shared store
${indent(EXAMPLE_DRAFT)}`,
  },

  render: {
    about:
      "Write the picture as SVG and PNG beside the file; --svg or --png alone writes only that one.",
    after: `
Good to know:
  - Look at the PNG after a draft, and after any change you are unsure of.
  - Like check, it prints every warning and the counts.
`,
  },

  show: {
    about: `Print a compact view of the diagram: layers, nodes in order, groups, lanes and
edges, in the words of the operations. Read it instead of the file.`,
    after: `
Good to know:
  - --drawn prints how it is drawn, one record per line, as key=value:
      counts ...                    as check prints them
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
    crossings, tight pairs and crowded labels in it, counted as check's
    counts are. Sizes and lengths are in pixels; - means none. Judge the
    drawing from them, and change what you decide to change.
  - bundle names the edges an edge leaves or arrives with as one: three or
    more lines of one style and width from one side of a node, or two on a
    side too crowded for a port each. A labelled edge is never bundled, so
    a label keeps an edge on its own.
`,
  },

  diff: {
    about: `Print how the file differs from a git revision, HEAD by default, as one command
line per change. Run in order on the revision's file, they give the file on disk.`,
  },

  view: {
    about: `Open a live window that shows the diagram as it is now, redrawn within a moment
of every change, with the changed parts marked. Ctrl-C stops it.`,
  },

  check: {
    about: `Report the defects you can fix, every warning and the counts, without changing
anything. --all adds the engine's own defects, which are its bugs.`,
    after: `
Output:
  The first line says what happened: WRITTEN, the file changed; UNCHANGED,
  it already said so; TRIED, --try wrote nothing; REFUSED, nothing written;
  OK, a read answered. Then sections, each in a tag, left out when empty:
    <changes>   each object a write touched, one a line:
                  MADE <sort>=<id>
                  CHANGED <sort>=<id> fields=<the flags whose value changed>
                  REMOVED <sort>=<id>
                by=<sort>:<id> ends a change the command did not name, for
                the object it named that caused it; place is a new order
    <warnings>  new= cleared= total=, then CLEARED <code> <facts> for each
                warning the write took away
    <before> <after> <delta>   the counts, on --try
    <files>     what render wrote
    <counts>    the counts, on check and render
    <problems>  a block for each problem, a blank line between them:
                  ERROR|DEFECT|WARNING <code>
                    description: <what happened, one sentence per code>
                    source: <the command, or "already in the file">
                    detail:
                      <key>: <value>
                    next: <the commands that can change it, or ->
  A detail key named for one thing (node, edge) holds one value; one named
  for several (nodes, edges, ends) holds a list, even of one, in --json too.
  ERROR: nothing could be applied; DEFECT: it would draw wrong; WARNING:
  written, drawn poorly. A write prints only the warnings it brought; check
  and render print every warning the file has:
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
`,
  },

  "layer set": {
    about: `Make layers, or change them. A new layer goes to the bottom unless --first,
--before or --after places it. A layer that exists keeps its place.`,
    after: `
Good to know:
  - Layers run top to bottom the way a request or a process moves.
  - A layer is not drawn: it only places its nodes. It is drawn when an edge
    ends at it or --look gives it a look: around its nodes as a band, or,
    with no nodes, as one bar that edges meet straight past their other
    ends, such as a gateway or a bundle.
  - --label names a layer by what it holds ("Entry", "Stores"). The name shows
    only when the layer is drawn; a layer drawn with no name shows none.
  - Layers and nodes share one set of ids: give layers ids like row-users.
  - An edge that passes a bar is refused (bar-crossed) unless edge set --pass
    on lets it.

See also: layer move, layer split, node set
`,
  },
  "layer move": {
    about: `Move layers. Several layers keep the order given: layer move a,b,c
--first puts a, b and c at the top, in that order.`,
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
  "node set": {
    about: `Make nodes, or change them. A new node goes in a layer at the place you give:
--first, --last, --before or --after; only the first node of an empty layer needs
none. Or it goes in no layer, some steps from another node: --from with --down,
--up, --left or --right. A node that exists keeps its place.`,
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
  - Several nodes take one value at once: node set a,b,c --group payments.
  - The order of a layer decides most crossings. Compare two orders with
    --try on node move and keep the one with fewer.
  - A step is one cell of grafical's grid: a layer down or up, a column left
    or right. A node placed by steps moves with the node it steps from, and
    the nodes of the layer it lands in stand aside. Past the first or last
    layer, grafical adds a layer. You choose the steps; grafical keeps them.
  - Give - to an option to clear it, as --group - takes a node out of every
    group.

Common mistakes:
  - Giving a node its layer's id: layers and nodes share one set of ids, so
    layers take ids like row-users.
  - Start and End of a process as initial and final: their labels vanish.
    Use terminal.

Limits:
  - At most ${MAX_EMPHASIS} nodes carry --emphasis on.
  - A sublabel holds one line, about 30 characters, and a label must fit
    the large node; longer text is refused (overflow).
  - Each step option takes 1 to 10. A node placed by steps takes no layer,
    position, --align, column or lane.

See also: node move, node merge, mark set, edge set

Example:
  grafical node set shop.grafical orders-db --layer row-store --last \\
    --label "Orders DB" --type store --sublabel Postgres --emphasis on
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
    about: `Move nodes to another layer or place. Several nodes keep the order given, so
c,a,b with --first states a layer's whole order. Into another layer, give the place
too, as for a new node. --from with steps takes a node out of its layer; --layer
puts it back in one.`,
  },
  "mark set": {
    about: `Put a mark on a node, such as a warning at its top-left: an emoji or up to 6
characters of text (--text), or an SVG or PNG file next to the diagram (--file).
A mark's address is its node and its slot: billing:top-left.`,
    after: `
Slots (one mark each):
  top-left, top-right, bottom-left, bottom-right   over a corner of the node
  left                                             inside the node, before text

Good to know:
  - grafical sizes and places the mark; it takes no size or position.
  - A file is kept with its hash. If the file changes, set the mark again
    for the slot to accept it.
  - A text mark sits on a badge. What a text mark may set:
      --bg      the badge color (dark if left out)
      --fg      the text color (light or dark, whichever reads on --bg)
      --border  a border color (none if left out)
      --shape   ${MARK_SHAPES.join(", ")} (rounded if left out)
    A color is #rrggbb or one of
    ${Object.keys(MARK_COLORS).join(", ")}.
  - --size ${MARK_SIZES.join(", ")} sets any mark's size (m if left out). An emoji or
    a file takes --size only.
  - The left slot narrows the text. A diamond and a dot have corner slots only.
  - A corner mark that covers the label is refused (mark-covers). Give the node
    a larger size, or put the mark in the slot on the other side.

Example:
  grafical mark set d.grafical billing:top-left --text "⚠️"
  grafical mark set d.grafical billing:top-right --text P0 --bg red
`,
  },

  "edge set": {
    about: `Make edges, or change them. A new edge needs --from and --to: a node, a group (one
line to the whole system), a layer or a lane. Give it an id a shell leaves alone,
such as api-db. A new end on an edge that exists moves that end; its id, type
and label stay.`,
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
    that has a look, is refused (bar-crossed) unless --pass on says it may,
    since a reader takes an edge over a gateway for an edge through it.
  - --weight: thin is the default, then thick and heavy. A stylesheet may
    retune them and add levels; a number of pixels runs from 0.5 to 8. Prefer
    a level: levels read the same across a diagram.
  - --number numbers an edge as a step of one story the reader follows in
    order. grafical draws it in a small ring on the edge and never numbers,
    renumbers or checks the order for you. Edges may share a number.
  - To turn an edge around, give it its other end as --from and its first
    as --to.

Limits:
  --number is a whole number from 1 to ${STEP_NUMBER_MAX}.

See also: label set, legend set

Example:
  grafical edge set shop.grafical checkout-events --from checkout --to events \\
    --label publish --type async --number 2
`,
  },

  "group set": {
    about: `Make groups, or change them: one border around the parts of one system, service or
team. Its members may sit in several layers; the border spans them all. A node joins
a group with node set --group, and a group sits inside another with --in.`,
    after: `
When to use:
  - Around the parts one team owns or one service deploys together.
  - To show who does each step of a process, use lanes (lane set --help).

Limits:
  - A node is in one group at most. Groups nest at most ${MAX_GROUP_DEPTH} deep.
  - A group covers every layer from its top member to its bottom one; other
    nodes in those layers sit beside it.

See also: node set, label set, lane set

Example:
  grafical group set cloud.grafical vpc --label "Main network" --in region
  grafical node set cloud.grafical web,api --group vpc
`,
  },
  "group copy": {
    about: `Copy a group: a second zone, region or shard in one command. The copy holds its
inner groups, its nodes and the edges between them, every id with --suffix, and sits
in the group the original sits in.`,
    after: `
Place:
  Each copied node sits in its original's layer, --before or --after a group
  with a node in every layer of the copy, as group move puts it.

Good to know:
  - Copied nodes keep their labels, kinds, sizes, marks, lanes and columns.
    Rename the ones that differ, such as a standby.
  - Edges to nodes outside the group are copied only with --outside.
  - A copied edge's id is its original's with the suffix: web-db-b.
  - Notes and walls are not copied.

Example:
  grafical group copy ha.grafical zone-a zone-b --label "Zone B" \\
    --suffix -b --after zone-a --outside
`,
  },
  "group remove": {
    about:
      "Remove groups. Their nodes and inner groups move into the group around them, or out of every group with --out.",
  },

  "lane set": {
    about: `Make swimlanes, or change them: labelled bands that say who owns what. A lane holds
layers (lanes run as layers: layer set --lane) or nodes (lanes run as columns: node
set --lane), one way per diagram.`,
    after: `
When to use:
  - Only when who does what is part of the story: teams, people or systems
    that each do their part of a process.
  - Columns suit a process that runs top to bottom: each step is a node in
    its owner's lane, and layers keep the order of the steps.
  - Layers suit an architecture whose tiers each belong to someone.

Good to know:
  - Column lanes run left to right in the order they were made.
  - A group lies inside one lane. An edge may end at a lane.

Limits:
  - A layer lane holds neighbouring layers only. An edge never joins two lanes.

Example:
  grafical lane set laptop.grafical it --label IT
  grafical layer set laptop.grafical order,setup --lane it
`,
  },

  "column set": {
    about: `Make columns, or change them: guides that nodes follow beside their layers. Every
node of a column sits left of every node of the next column, in every layer. Nothing
is drawn. A node follows one with node set --column.`,
    after: `
When to use:
  - When a diagram has sides: requests on the left and processing on the
    right, one team's services and another's, reads and writes.
  - Leave a node shared by two sides, such as their database, out of every
    column: it keeps its place, and a new one lands near what it connects to.

Good to know:
  - Columns go left to right in the order they are made, or --first,
    --before and --after another column.
  - grafical keeps every layer in column order; a node in no column stays
    beside the node left of it.
  - A diagram has columns or lanes that run as columns, not both.

Example:
  grafical column set shop.grafical requests
  grafical node set shop.grafical web,api,cache --column requests
`,
  },

  "wall set": {
    about: `Make walls, or change them: empty space between two sides, each a list of nodes and
groups. grafical decides where a wall runs, and nothing is placed in it.`,
    after: `
When to use:
  - To keep two parts of a picture apart: the internet and a private
    network, two tenants, what a team owns and what it calls.
  - With --label it draws a dashed divider through the space, the label at
    its start. Without one it is only space.
  - A label with no place along the wall clear of the edges across it is
    refused (label-blocked): shorten it, or clear it with --label -.

Crossing:
  - An edge from one side to the other is refused (wall-crossed) unless the
    wall allows it: --allow names the edge, or a node or group at one of
    its ends, such as a gateway. --allow states the whole list.
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
  grafical wall set shop.grafical net --between web,mobile --and orders,users \\
    --allow gateway --label "private network"
`,
  },
  "note set": {
    about: `Put notes on nodes, groups or edges, or change them: a sentence or two a reader needs
and no node should hold. A note's address is what it is about, which has one note.`,
    after: `
How it is drawn:
  - A card beside what it is about, joined to it by a short dotted line.
  - With --footnote on, a small number on it, and the text in a numbered list
    at the bottom of the picture.

Good to know:
  - Keep it short: more than four lines at 160 px is an overflow.
  - A note goes when what it is about is removed.
  - show --drawn says how each note is drawn.

Example:
  grafical note set shop.grafical retry --text "retries 5 times, then the DLQ"
  grafical note set shop.grafical retry --footnote on
`,
  },
  "note remove": { about: "Remove the notes of nodes, groups or edges." },

  "label set": {
    about: `Change how a label looks and where it sits. Its text is its owner's --label; the
address is its owner: a node, an edge, a group, a layer, a lane or a wall.`,
    after: `
Where it sits:
  - A group's label sits at a fraction from 0 to 1 along a side (--at), the
    side (--side, top by default), and --place inside (by default) or
    outside. At 0.7 the label's own 70% point meets the side's 70% point, so
    it never runs past the side. With --at -, the engine seats it at the top,
    at the leftmost spot no edge comes near. No node or edge moves for it.
  - A layer's or a lane's label sits at --at along its head.
  - An edge's label sits on its edge, or --seat beside it.

Good to know:
  - --align lines up the text of a node's, an edge's, a wall's or a lane's
    label.
  - An edge's label marks styles for its background, border and color.

Example:
  grafical label set booking.grafical app --at 0 --side bottom
  grafical label set booking.grafical app --at 0.5 --side left --place outside
`,
  },

  "legend set": {
    about: `Say in the legend what an edge style, an edge width or a mark means. An entry's
address is what it names: style:dashed, weight:thick or mark:P0.`,
    after: `
The legend says only what you name. A diagram that names nothing has no
legend. show --drawn prints a legend record for each edge style and width
the picture draws, with text=- for those you have not named.

Edge widths:
  thick, heavy, a stylesheet's level, or the pixels an edge's --weight gives,
  as the legend record's weight says. Each named width has its own entry.
  Thin edges are what the edge styles' entries say.

Marks:
  A mark's emoji, its text or its file, as mark set gave it. Marks with the
  same name share one entry.

Example:
  grafical legend set shop.grafical style:dashed --text "a message"
`,
  },

  library: {
    about: `List the built-in stylesheets a diagram may name with --stylesheet, or those whose
name or look holds a word. Change the stylesheet only when the user asks.`,
    after: `
A stylesheet of your own is a <name>.grafical file inside the diagram's
folder. It starts from a built-in one (default unless it names a base) and
says only what it changes:

  <stylesheet> {
    format: 1
    base: dark
  }

  <type> service {
    fill: #1c2a3a
    border: #4c8dff
  }

  <weight> critical {
    width: 6
  }

Its blocks:
  <type> diagram          fill · muted (quieter text) · margin-top ·
                          margin-right · margin-bottom · margin-left ·
                          row-gap · column-gap
  <type> title, subtitle, note, legend
                          color · text-size · text-weight
  <type> group            fill · border · border-width · radius · color ·
                          nesting · text-size · text-weight · sublabel-size ·
                          sublabel-weight
  <type> band, lane       fill · border · border-width · radius · text-size ·
                          text-weight; a lane also head-fill · color
  <type> node             radius · border-width · color · sublabel-color ·
                          text-size · text-weight · sublabel-size ·
                          sublabel-weight
  <type> service and each other type of node
                          fill · border · dash; state also radius
  <style> emphasis        fill · border · border-width
  <style> of your own     what style set takes; a diagram marks it as its own,
                          and it comes before the diagram's own styles
  <type> edge             radius · label-color · label-fill · label-pad-x ·
                          label-pad-y · label-radius · text-size · text-weight
  <type> call and each other type of edge
                          color; async and optional also dash
  <weight> thin, thick or a level of your own
                          width; thin and thick also arrow-length · arrow-width

The built-in ones hold the styles compact and airy, for a tighter or a
roomier diagram: diagram set --style compact.
`,
  },

  "style set": {
    about: `Make named looks, or change them: colors and spacing that objects mark with
--style. Give - to clear an option.`,
    after: `
Good to know:
  - A node, an edge, a label, a group, a layer, a lane, a column and the
    diagram mark styles with --style.
  - Where two styles say one thing, the one later in the file wins, and
    style move changes the order.
  - An option that does not apply to what marks the style is left out, as
    --row-gap on a node.
  - A node's margin widens its whole column, in every layer.
  - The stylesheet gives every value a style does not say: diagram set
    --stylesheet names it, and grafical library lists the built-in ones.

Example:
  grafical style set shop.grafical roomy --row-gap 64 --column-gap 48
  grafical diagram set shop.grafical --style roomy
`,
  },
};
