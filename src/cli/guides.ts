// The guides: how common kinds of diagram are usually drawn with grafical, for an agent that wants them
// (DESIGN.md, "Help for the tool, guides for best practice"). The help says how to use the tool; a guide is best
// practice to borrow from, never a rule: grafical refuses only what would draw wrong. Nothing tells an agent to
// read one first, so that drawings keep their own shapes. Printed at 80 columns.

/** One guide: the line the list shows, and its text. */
interface Guide {
  about: string;
  text: string;
}

export const GUIDES: Record<string, Guide> = {
  architecture: {
    about: "services, stores and the systems they make up",
    text: `Architecture: services, stores and the systems they make up

Boxes are things: kind service for what runs, store for where data rests,
queue for a topic or stream, external for what you do not own, actor for a
person or a caller. Lines are calls, reads and writes.

- Rows follow a request top to bottom: who calls, the way in, the inside,
  shared stores, outside services.
- Box each system as a group, the groups side by side, each with its entry
  above its stores. Callers and outside services stay out of groups.
- What every request passes, a gateway or a bus, can be a row with no
  boxes that lines end at, drawn as one bar.
- Put a store below or between the parts that share it, and boxes that
  talk next to each other.
- Draw a queue as a box only when it is the story; otherwise draw its
  events as lines between the services, kind async.
- Label only the lines whose meaning is not obvious ("publish", "persist",
  "failed"); leave plain calls and reads unlabelled.
- Emphasize the main request path, if there is one.
- Name a box by its role ("orders API") and put the product in the
  sublabel ("Postgres").`,
  },
  c4: {
    about: "a system's containers, its users and the systems around it",
    text: `C4: a system's containers, its users and the systems around it

- People are kind actor, other systems kind external, and each box's
  technology goes in its sublabel.
- One group around the system's containers, sublabel "software system".
  People and other systems stay out of it.
- Label every line with what its source does ("reads from", "sends e-mail
  using").
- Legend: solid "uses".
- Otherwise as an architecture diagram: grafical guide architecture.`,
  },
  infrastructure: {
    about: "where things run: regions, networks, clusters, hosts",
    text: `Infrastructure: where things run, in the cloud or in a deployment

- Groups inside groups, outermost first: region, network, subnet; or
  environment, cluster, host. group add --in nests one in another.
- Users and the way in on top, data at the bottom.
- Runtime and count go in the sublabel ("3 pods", "t3.large").
- A second zone or region is a group copy of the first.
- A wall with a label marks a boundary, such as the internet and a private
  network; let the way in through with --allow.`,
  },
  dependency: {
    about: "what depends on what",
    text: `Dependency graph: what depends on what

- What depends on top, what it needs below.
- No labels: every line means "depends on".
- Kind optional for a dependency that degrades gracefully.
- Legend: solid "depends on", dotted "optional".`,
  },
  "data-flow": {
    about: "sources, processes and stores, and the data between them",
    text: `Data flow: sources, processes and stores, and the data between them

- Boxes are sources and sinks (often actor or external), processes
  (service) and stores (store).
- Every line is kind data, labelled with the data ("card details").
- Legend: solid "data".`,
  },
  "event-flow": {
    about: "producers, topics and consumers",
    text: `Event flow: producers, topics and consumers

- Producers, a queue per topic, consumers, in that order top to bottom.
- Lines in and out of a topic are kind async; the producer's line names
  the event.
- Emphasize the path of the event the diagram is about.
- Legend: dashed "event".`,
  },
  flowchart: {
    about: "steps and decisions, in order",
    text: `Flowchart: steps and decisions, in order

- A row per step, top to bottom.
- Start and End are kind terminal; a question is kind decision, kept short
  ("Within 30 days?"). Not initial and final: they draw no label.
- Label each answer out of a decision ("yes", "no"), and nothing else.
- Groups only where the steps fall into clear phases.
- Legend: solid "next step".`,
  },
  swimlane: {
    about: "a process, by who does each step",
    text: `Swimlane: a process, by who does each step

- A lane per team, person or system that does its part. With nodes as
  members the lanes run as columns, and rows keep the order of the steps.
- Each step is a node in its owner's lane.
- Lanes only when who does what is the story; otherwise a flowchart.
- Otherwise as a flowchart: grafical guide flowchart.`,
  },
  "state-machine": {
    about: "the states one thing goes through",
    text: `State machine: the states one thing goes through

- Kind initial for the start dot and final for the end ring (neither
  draws its label), kind state for the rest, named by what the thing is
  ("Paid").
- Label every transition with its event ("pay", "cancel").
- Emphasize the usual life of the thing.
- Legend: solid "transition".`,
  },
  composition: {
    about: "what makes any diagram good, and what to change",
    text: `Composition: a good diagram, and what to change when one looks wrong

A good diagram:
- One story. When boxes stop serving it, merge what a reader need not tell
  apart, cut side paths (admin, auth), or make it two diagrams.
- Boxes that talk sit next to each other. Connect neighbouring rows where
  you can.
- Merge only what has the same connections: a merged box claims every line
  of every part.
- A group says that its boxes are one system: not around a single box.
- Emphasize a small part of the lines, or nothing stands out: thick lines
  stand out only against thin ones.
- Draw each flow to its end, or leave it out: a retry topic needs its line
  back.
- Keep labels short; detail (port, technology, count) goes in the
  sublabel, one line of about 30 characters, or a note.
- Accent what the story is about. Name in the legend what each line style,
  width and mark means. Say what you left out in a note that starts "Not
  shown:".

When the picture looks wrong, change the composition first, and compare
the choices with grafical try:
- Lines cross: another order of a row, or another row for a box.
- A line runs through a group it has nothing to do with (across): one of
  its ends in another row, or the group's boxes together.
- A row too wide (fullest, width): split it, merge what a reader need not
  tell apart, or cut a side path.
- A line bends round boxes (bent): the boxes it joins in neighbouring rows,
  or the store between the parts that use it.
- Lines too close (tight) or labels crowded (crowded): fewer labels, or the
  boxes they join nearer each other.`,
  },
};

/** Other names an agent may give a guide: the kinds it covers. */
const OTHER_NAMES: Record<string, string> = {
  cloud: "infrastructure",
  deployment: "infrastructure",
  process: "flowchart",
  states: "state-machine",
};

/** A guide by its name or another name for its kind; undefined for none. */
export function guideNamed(name: string): Guide | undefined {
  return GUIDES[OTHER_NAMES[name] ?? name];
}

/** The kinds of diagram each guide is about, for the list. */
const FAMILIES: [string, string[]][] = [
  [
    "structure: what exists, and who talks to whom",
    ["architecture", "c4", "infrastructure", "dependency"],
  ],
  ["flow: what moves where", ["data-flow", "event-flow"]],
  ["process: what happens first, and what after", ["flowchart", "swimlane"]],
  ["states: which states one thing goes through", ["state-machine"]],
  ["any kind", ["composition"]],
];

/** What `grafical guide` prints: what the guides are, and each one's name and line. */
export function guideList(): string {
  const groups = FAMILIES.map(
    ([family, names]) =>
      `  ${family}\n${names.map((n) => `    ${n.padEnd(16)}${GUIDES[n]?.about ?? ""}`).join("\n")}`,
  );
  return `Guides: how common kinds of diagram are usually drawn with grafical. They are
best practice to borrow from, not rules: grafical refuses only what would draw
wrong, and draws what you state.

A box stands for a thing, a step or a state; a line for a call, something
that moves, "then", or a change of state. The answers place a diagram:

${groups.join("\n")}

grafical guide <name> prints one, such as grafical guide flowchart.`;
}
