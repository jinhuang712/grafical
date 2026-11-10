// The nouns and their verbs (specs/decisions, "A command's verb is a flag", "One command is one write, and running it
// twice changes nothing"): every noun has --set, which makes an object or changes the attributes it names, and
// --remove, and some have --move and a verb of their own. One flag sets one attribute, named as the file's.

import { existsSync } from "node:fs";
import type { Command } from "commander";
import type { OpName } from "../model/ops.ts";

type Opts = Record<string, unknown>;
type Write = (
  file: string,
  raw: Record<string, unknown>,
  opts: Opts,
  create?: boolean,
) => Promise<void>;

/** An option: its flag with its value, and what it says. */
type Flag = [string, string];

const STYLE: Flag = [
  "--style <styles>",
  "mark styles: a,b exactly these, +a adds one, -a takes one away, - clears them",
];

const like = (noun: string): Flag => [
  `--like <${noun}>`,
  `follow another ${noun}'s look; - lets go`,
];

const place = (noun: string, made: string): Flag[] => [
  ["--first", `first ${made}`],
  ["--last", `last ${made}`],
  [`--before <${noun}>`, `before this ${noun}`],
  [`--after <${noun}>`, `after this ${noun}`],
];

const STEPS: Flag[] = [
  ["--from <node>", "placed by steps from this node, in no layer, and moves with it"],
  ["--down <n>", "steps down from --from, 1 to 10"],
  ["--up <n>", "steps up"],
  ["--left <n>", "steps left"],
  ["--right <n>", "steps right"],
];

/** Every verb: its noun, its name, what it says, its arguments and its flags. */
interface Verb {
  noun: string;
  verb: string;
  about: string;
  /** The arguments after the file, each named as the operation's field. */
  args: [string, string][];
  flags: Flag[];
  /** Options the call cannot leave out. */
  required?: Flag[];
}

const IDS = (what: string): [string, string] => ["<ids>", what];

const VERBS: Verb[] = [
  {
    noun: "diagram",
    verb: "set",
    about: "make the file, or change the whole diagram",
    args: [],
    flags: [
      ["--title <text>", "the title; the file is made with one"],
      ["--subtitle <text>", "one sentence under the title; - clears it"],
      ["--caption <text>", "what the picture leaves out, at its foot; - clears it"],
      [
        "--stylesheet <name>",
        "a built-in stylesheet (grafical library lists them) or a <name>.grafical beside the file; - the default",
      ],
      STYLE,
      ["--sizing <mode>", "auto or fixed: how a node without --size is sized"],
      ["--lines <lines>", "square or round"],
      ["--title-at <at>", "where the title sits across, 0 to 1; - the engine's"],
      ["--title-side <side>", "top or bottom"],
    ],
  },
  {
    noun: "layer",
    verb: "set",
    about: "make layers, or change them",
    args: [IDS("the layers, comma-separated")],
    flags: [
      ["--label <text>", "its name, drawn only when the layer is drawn; - none"],
      ["--look <look>", "box or band: draw it though no edge ends at it; - not drawn"],
      ["--lane <lane>", "the lane it lies in, when lanes run as layers; - none"],
      STYLE,
      ...place("layer", "of the layers, for a new one (last by default)"),
    ],
  },
  {
    noun: "layer",
    verb: "move",
    about: "move layers, in the order given",
    args: [IDS("the layers, comma-separated")],
    flags: place("layer", "of the layers"),
  },
  {
    noun: "layer",
    verb: "split",
    about: "move part of a layer into a new layer below it",
    args: [
      ["<id>", "the layer"],
      ["<into>", "the new layer"],
    ],
    flags: [
      ["--label <text>", "the new layer's name"],
      ["--from <node>", "the first node that moves; the second half by default"],
    ],
  },
  {
    noun: "layer",
    verb: "remove",
    about: "remove empty layers",
    args: [IDS("the layers, comma-separated")],
    flags: [],
  },
  {
    noun: "node",
    verb: "set",
    about: "make nodes, or change them",
    args: [IDS("the nodes, comma-separated")],
    flags: [
      ["--label <text>", "the name, short, as a reader would say it; \\n breaks it"],
      ["--sublabel <text>", "a second, smaller line, such as a port; - clears it"],
      ["--type <type>", "a built-in type or one of your own; - its built-in type"],
      ["--size <size>", "s, m or l; - sized to its text"],
      ["--emphasis <on|off>", "make it stand out, at most two nodes"],
      ["--align <node>", "sit directly above or below this node; - lets go"],
      ["--group <group>", "the group it is in; - out of every group"],
      ["--lane <lane>", "the lane it lies in, when lanes run as columns; - none"],
      ["--column <column>", "the column it follows; - none"],
      STYLE,
      like("node"),
      ["--layer <layer>", "the layer of a new node"],
      ...place("node", "in its layer, for a new node"),
      ...STEPS,
    ],
  },
  {
    noun: "node",
    verb: "move",
    about: "move nodes, in the order given",
    args: [IDS("the nodes, comma-separated")],
    flags: [
      ["--layer <layer>", "the layer they move into"],
      ...place("node", "in the layer"),
      ...STEPS,
    ],
  },
  {
    noun: "node",
    verb: "merge",
    about: "replace nodes with one node where the first one was",
    args: [["<id>", "the node they become"]],
    flags: [
      ["--sublabel <text>", "a second, smaller line"],
      ["--type <type>", "its type"],
    ],
    required: [
      ["--nodes <ids>", "the nodes it replaces, comma-separated"],
      ["--label <text>", "its name"],
    ],
  },
  {
    noun: "node",
    verb: "remove",
    about: "remove nodes and their edges",
    args: [IDS("the nodes, comma-separated")],
    flags: [],
  },
  {
    noun: "edge",
    verb: "set",
    about: "make edges, or change them",
    args: [IDS("the edges, comma-separated, such as api-db")],
    flags: [
      ["--from <end>", "where it starts: a node, a group, a layer or a lane"],
      ["--to <end>", "where it ends"],
      ["--label <text>", "the words on it; - clears them"],
      ["--type <type>", "a built-in type or one of your own; - call"],
      ["--weight <weight>", "a level, such as thick, or a width from 0.5 to 8; - thin"],
      ["--both <on|off>", "arrowheads at both ends"],
      ["--pass <on|off>", "may pass the bars between its ends"],
      ["--out <side>", "top, bottom, left or right: the side it leaves by; - the engine's"],
      ["--in <side>", "the side it enters by; - the engine's"],
      [
        "--via <object:side>",
        "pass a node or a group on its left or right, as db:left; - the engine's",
      ],
      ["--straight <on|off>", "no bend, or the write is refused"],
      ["--with <edge>", "run along this edge's trunk; - its own way"],
      ["--bend-at <at>", "0.25, 0.5 or 0.75: where its longest inner run sits; - the engine's"],
      ["--stretch <n>", "1.25, 1.5 or 2: how far a detour reaches; - the engine's"],
      ["--number <n>", "a step number from 1 to 99; - none"],
      STYLE,
      like("edge"),
    ],
  },
  {
    noun: "edge",
    verb: "remove",
    about: "remove edges",
    args: [IDS("the edges, comma-separated")],
    flags: [],
  },
  {
    noun: "group",
    verb: "set",
    about: "make groups, or change them; nodes join one with node --set --group",
    args: [IDS("the groups, comma-separated")],
    flags: [
      ["--label <text>", "the name, short, as a reader would say it"],
      ["--sublabel <text>", "a second, quieter part of the label; - clears it"],
      ["--in <group>", "the group it sits inside; - none"],
      STYLE,
      like("group"),
    ],
  },
  {
    noun: "group",
    verb: "move",
    about: "place groups beside a group, in the order given",
    args: [IDS("the groups, comma-separated")],
    flags: [
      ["--before <group>", "before this group"],
      ["--after <group>", "after this group"],
    ],
  },
  {
    noun: "group",
    verb: "copy",
    about: "copy a group with everything inside it",
    args: [
      ["<id>", "the group"],
      ["<into>", "the copy"],
    ],
    flags: [
      ["--before <group>", "the copy's nodes before this group's in each layer"],
      ["--after <group>", "the copy's nodes after this group's"],
      ["--outside", "also copy the edges with one end inside"],
    ],
    required: [
      ["--label <text>", "the copy's name"],
      ["--suffix <text>", "added to every id inside the copy"],
    ],
  },
  {
    noun: "group",
    verb: "remove",
    about: "remove groups; their nodes and inner groups move into the group around them",
    args: [IDS("the groups, comma-separated")],
    flags: [["--out", "their nodes and inner groups leave every group instead"]],
  },
  {
    noun: "lane",
    verb: "set",
    about: "make lanes, or change them; layers or nodes lie in one with --lane",
    args: [IDS("the lanes, comma-separated")],
    flags: [["--label <text>", "who owns what lies in it"], STYLE, like("lane")],
  },
  {
    noun: "lane",
    verb: "remove",
    about: "remove lanes and keep what lies in them",
    args: [IDS("the lanes, comma-separated")],
    flags: [],
  },
  {
    noun: "column",
    verb: "set",
    about: "make columns, or change them; nodes follow one with node --set --column",
    args: [IDS("the columns, comma-separated")],
    flags: [STYLE, ...place("column", "of the columns, for a new one (last by default)")],
  },
  {
    noun: "column",
    verb: "move",
    about: "move columns, in the order given",
    args: [IDS("the columns, comma-separated")],
    flags: place("column", "of the columns"),
  },
  {
    noun: "column",
    verb: "remove",
    about: "remove columns and keep their nodes",
    args: [IDS("the columns, comma-separated")],
    flags: [],
  },
  {
    noun: "wall",
    verb: "set",
    about: "make walls, or change them",
    args: [IDS("the walls, comma-separated")],
    flags: [
      ["--between <ids>", "the nodes and groups of one side, comma-separated"],
      ["--and <ids>", "the nodes and groups of the other side"],
      ["--allow <ids>", "the edges, nodes and groups it lets through; - none"],
      ["--label <text>", "the words on its divider; - space alone"],
    ],
  },
  {
    noun: "wall",
    verb: "remove",
    about: "remove walls",
    args: [IDS("the walls, comma-separated")],
    flags: [],
  },
  {
    noun: "note",
    verb: "set",
    about: "put notes on nodes, edges or groups, or change them",
    args: [IDS("what the notes are about: nodes, edges or groups, comma-separated")],
    flags: [
      ["--text <text>", "a sentence or two"],
      ["--footnote <on|off>", "a number on it and the text at the bottom, rather than a card"],
      ["--align <align>", "left, center or right, for a card; - left"],
    ],
  },
  {
    noun: "note",
    verb: "remove",
    about: "remove notes",
    args: [IDS("what the notes are about, comma-separated")],
    flags: [],
  },
  {
    noun: "label",
    verb: "set",
    about: "change how a label looks and where it sits; its text is its owner's --label",
    args: [IDS("whose labels: nodes, edges, groups, layers, lanes or walls, comma-separated")],
    flags: [
      ["--style <styles>", "an edge's label marks styles: a,b, +a, -a, or - to clear them"],
      ["--align <align>", "left, center or right; - center"],
      [
        "--at <at>",
        "where a group's, a layer's or a lane's label sits along its side, 0 to 1; - the engine's",
      ],
      ["--side <side>", "top, bottom, left or right, for a group's label"],
      ["--place <place>", "inside or outside, for a group's label"],
      ["--seat <seat>", "on or beside, for an edge's label"],
    ],
  },
  {
    noun: "mark",
    verb: "set",
    about: "put marks on nodes, or change them",
    args: [IDS("the node and the slot of each, such as api:top-left, comma-separated")],
    flags: [
      ["--text <text>", "an emoji or a short text"],
      ["--file <file>", "an .svg or .png beside the diagram file"],
      ["--bg <color>", "a text mark's background: a name or #rrggbb; - dark"],
      ["--fg <color>", "a text mark's text color; - one that reads on it"],
      ["--border <color>", "a text mark's outline; - none"],
      ["--shape <shape>", "square, rounded or pill; - rounded"],
      ["--size <size>", "s, m or l; - m"],
    ],
  },
  {
    noun: "mark",
    verb: "remove",
    about: "take marks off",
    args: [IDS("the node and the slot of each, comma-separated")],
    flags: [],
  },
  {
    noun: "legend",
    verb: "set",
    about: "say in the legend what a style, a width or a mark means",
    args: [IDS("the entries: style:<style>, weight:<level> or mark:<text>, comma-separated")],
    flags: [],
    required: [["--text <text>", "what it means"]],
  },
  {
    noun: "legend",
    verb: "remove",
    about: "take legend entries away",
    args: [IDS("the entries, comma-separated")],
    flags: [],
  },
  {
    noun: "type",
    verb: "set",
    about:
      "make sorts of node or edge of your own, or change them; a change reaches every object of it",
    args: [IDS("the types, comma-separated")],
    flags: [
      ["--base <base>", "a built-in type or one of your own; a new type needs one"],
      ["--shape <shape>", "box, round, pill, cylinder, diamond, small-diamond, dot or ring"],
      ["--fill <color>", "#rrggbb; - its base's"],
      ["--border <color>", "#rrggbb; - its base's"],
      ["--border-width <n>", "0.5 to 8; - its base's"],
      ["--color <color>", "the text, or an edge's line; - its base's"],
    ],
  },
  {
    noun: "type",
    verb: "remove",
    about: "remove types",
    args: [IDS("the types, comma-separated")],
    flags: [],
  },
  {
    noun: "style",
    verb: "set",
    about: "make named looks, or change them",
    args: [IDS("the styles, comma-separated")],
    flags: [
      ["--fill <color>", "#rrggbb"],
      ["--border <color>", "#rrggbb"],
      ["--border-width <n>", "0.5 to 8"],
      ["--color <color>", "the text, or an edge's line"],
      ["--margin-top <px>", "room above, a multiple of 4"],
      ["--margin-right <px>", "room on the right"],
      ["--margin-bottom <px>", "room below"],
      ["--margin-left <px>", "room on the left"],
      ["--row-gap <px>", "the diagram's room between two layers"],
      ["--column-gap <px>", "the diagram's room between two nodes of a layer"],
    ],
  },
  {
    noun: "style",
    verb: "move",
    about: "place styles before or after a style, in the order given: the later one wins",
    args: [IDS("the styles, comma-separated")],
    flags: [
      ["--before <style>", "before this style"],
      ["--after <style>", "after this style"],
    ],
  },
  {
    noun: "style",
    verb: "remove",
    about: "remove styles and every mark of them",
    args: [IDS("the styles, comma-separated")],
    flags: [],
  },
];

/** What each noun is, with its verbs, for the entry page. */
const NOUN_ABOUT: Record<string, string> = {
  diagram: "the whole diagram",
  layer: "layers, top to bottom",
  node: "nodes, the parts of the system",
  edge: "edges, what connects to what",
  group: "a border around a system",
  lane: "swimlanes, who owns what",
  column: "column guides",
  wall: "walls between parts",
  note: "notes on a node, edge or group",
  label: "how a label looks and where it sits",
  mark: "small marks on a node",
  legend: "the key in the top right",
  type: "sorts of node or edge of your own",
  style: "named looks that objects mark, and spacing",
};

const camel = (flag: string) =>
  flag
    .replace(/^--/, "")
    .replace(/ .*$/, "")
    .replace(/-([a-z])/g, (_, x: string) => x.toUpperCase());

/** The nouns, each with its verbs, on the program. */
export function addNouns(program: Command, write: Write, json: (c: Command) => Command): void {
  const nouns = new Map<string, Command>();
  for (const v of VERBS) {
    let noun = nouns.get(v.noun);
    if (noun === undefined) {
      const verbs = VERBS.filter((x) => x.noun === v.noun).map((x) => x.verb);
      noun = program.command(v.noun).description(`${NOUN_ABOUT[v.noun]}: ${verbs.join(", ")}`);
      nouns.set(v.noun, noun);
    }
    const c = noun.command(v.verb).description(v.about).argument("<file>");
    for (const [name, what] of v.args) c.argument(name, what);
    for (const [flag, what] of v.flags) c.option(flag, what);
    for (const [flag, what] of v.required ?? []) c.requiredOption(flag, what);
    const fields = [...v.flags, ...(v.required ?? [])].map(([flag]) => camel(flag));
    const op = `${v.noun}.${v.verb}` as OpName;
    json(c).action(async (file: string, ...rest: unknown[]) => {
      const opts = rest[v.args.length] as Opts;
      const raw: Record<string, unknown> = { op };
      v.args.forEach(([name], i) => {
        const key = camel(name.replace(/[<>[\].]/g, ""));
        const given = rest[i] as string;
        raw[key] = key === "ids" ? split(given) : given;
      });
      for (const f of fields) {
        const given = opts[f];
        if (given === undefined || given === false) continue;
        raw[f] = f === "nodes" ? split(given as string) : given;
      }
      await write(file, raw, opts, op === "diagram.set" && !existsSync(file));
    });
  }
}

function split(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x !== "");
}
