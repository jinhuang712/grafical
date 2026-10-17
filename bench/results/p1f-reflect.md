# Agents' own reports on the current grafical, 2026-10-17

Written before the round runs (EXPERIMENTS.md, "Rules for a result", rule 1). Approved by the owner on 2026-10-17: one chain first, to measure its cost; the rest only once the owner approves a total.

## Why this round

The last paid round, `p1e-records`, ran on 2026-10-13. Since then grafical gained walls, notes, boxes placed by steps, column guides, rows that lines end at drawn as bars, step numbers on lines, and a stated place for a group's label, none of which any saved draft could use, and under "The dirty work has edges" (DESIGN.md) a write is now refused where it used to be drawn crookedly: `title-blocked`, `label-blocked`, and every write reports a line with more than two bends. No agent has used grafical since.

The owner asked on 2026-10-17 whether agents draw rows and groups because the command list does not suggest anything else ("only these commands? then I'll draw it like this"), and asked for product feedback from the agents themselves. Every chain now ends with a reflection (EXPERIMENTS.md, "Harness").

## Questions, expectations and the decision each drives

1. **Do agents compose with more than rows and groups where the request fits?** Measured: the features each final draft uses, against the request, and what each reflection says it considered. Expected: lanes in the swimlane task and decisions in the flowchart, as before; walls, notes, step numbers and stated label places rare, under one draft in five. If the reflections say the agent looked for a way to draw something and did not find it, or never thought of another kind of diagram where one fits, the next change is the command list and the help: what each command is for, by the story it tells. If agents saw the options and chose rows and groups for reasons they can name, the command list is not the bottleneck, and the next change is elsewhere.
2. **Do agents recover from the new refusals?** Measured: `title-blocked`, `label-blocked` and the other refusals in each transcript, and whether the next write of the same thing succeeds. Expected: `title-blocked` in about a third of the drafts with groups (40 of the 183 saved drafts with groups would hit it today), each fixed in one write by a place from `clear`. If agents fail to recover, or guess instead of reading `clear`, the next change is that refusal's record and its help.
3. **Where does grafical get in the way?** Measured: the third heading of each reflection, grouped by what it names. Expected: no prediction; this is the feedback the owner asked for. It drives the list of next changes, each to be measured on saved drafts before it is built.
4. **Is the reflection worth its cost?** Measured: its cost per chain, and whether its reports name commands, records and codes. If they are vague, the prompt changes before the next round.

Not measured here: how good the pictures are. No judges; the owner may rate them in the gallery.

## The probe, one chain

`photo-cloud.grafical-haiku-r1` (`stage1 --part reflect --only photo-cloud.grafical-haiku-r1`): a cloud diagram with a region, a network and two subnets, where saved drafts hit `title-blocked` most often, so that one chain exercises a new refusal, the reflection and its cost at once. Expected about $0.01 to draw, as in `p1d-help3` ($0.35 for 33), plus the reflection. The total proposed afterwards is 33 times what it measures.
