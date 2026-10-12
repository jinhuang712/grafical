# Type guides: with and without, 2026-10-12

The owner asked whether the type guides (D34) help at all, since the models already know what a flowchart or a C4 diagram is. This round measures it, without judging: the same ten tasks, grafical, Haiku, 3 runs each, once with the type guides (`stage1 --part guides`, round `p1d-guides`) and once without them (`noguides`, round `p1d-noguides`). Without them, the main guide loses its three pointers to the guides and `grafical guide <type>` is refused; its line of node kinds stays.

The tasks: a loose prompt for each of the nine type guides (`bench/prompts/types.yaml`, two of them from the hint rounds) and the public brief (`catalog-sync.md`), which asks for no type. Cost: $0.188 with the guides and $0.194 without, $0.38 of the owner's $20.

## What was measured

For each type, a few conventions of the type that any author who knows it follows, and a few that only the type guide teaches, read from the final diagram file. Lines and refused calls are counted as in the other rounds; refused calls with the classifier fixed the same day, which no longer counts a read of the guide.

| | With the guides | Without |
|---|---|---|
| Type conventions met (27 type drafts) | 62 of 63 | 51 of 63 |
| Conventions only the guides teach | 38 of 42 | 8 of 42 |
| Problem lines in the 27 type drafts | 0 | 0 |
| Refused calls, all 30 drafts | 4 of 116 (3%) | 17 of 109 (16%) |
| Cost per draft | $0.006 | $0.006 |

## What the drafts without the guides got wrong

- **The wrong kind, and a label lost with it.** All three flowcharts drew Start and End as the state machine's dots (`initial`, `final`) instead of `terminal`, and a dot's label is not drawn, so "Request received" vanished. Two of the three state machines made the first state itself the start dot, losing its name, and drew no end ring. The main guide lists every kind, but not which belongs to which type.
- **Edges left unlabelled where the type labels every one.** All three C4 diagrams and all three data flows left edges unlabelled, as the main guide's rule asks: label only edges whose meaning is not obvious. The C4 and data-flow guides override it. With the guides, one C4 diagram of three did.
- **One swimlane diagram of three drew no lanes.**
- **More refused calls**, on syntax the guides show by example: a node given the id of its own row (`duplicate-id`, seven calls in five drafts), a sublabel with a comma that YAML read as a new key, lane members not written as a list, and groups named as members instead of nested with `in`. Each was recovered.

Without the guides the drafts still knew their types: the event names and async edges, a box per environment, the cloud's nested boxes, the dependency graph's outside processor and shared database.

## The public brief

Problem lines in the three drafts: 8, 1 and 0 with the guides, 5, 3 and 3 without. None of the six read the C4 guide this time; one asked for guides named `architecture` and `cloud`. Three drafts a side cannot separate the two.

## Reading

The models know the conventions; what they do not know is how grafical spells them. The type guides earn their place by that mapping: the right kind for each part, which edges to label, and the syntax of lanes and nesting.

## Afterwards

The owner then asked why an agent should learn grafical anywhere but its `--help`, the only thing a real agent finds. `grafical guide` was removed and its lessons moved into the help pages (DESIGN.md D36); the parts `guides` and `noguides` went with it, and commit 90deeef holds them.
