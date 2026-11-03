# 023. Fan-outs of three bundle

Decided: 2026-10-13

## The problem

Decided on 2026-10-13, as the first feature of phase 1e (FEATURES.md). The owner called a stage 1 picture "terrible... way too many lines to track", though it had one crossing: one service sent six lines out of one side, each to its own port, turning at six heights on their way to six boxes across two rows. Every architecture draft measured that day had a box with four to seven lines.

## The choice

- **The rule:** unlabelled lines in one line style that leave one side of a box leave as a bus, one port and one trunk that splits near its targets, with a dot at each split, when there are three or more of them, on any side. A crowded side (more lines than port slots) still bundles two or more, as before ("Lines meet any side"). Labelled lines and two-way lines keep a port each, and so, since 2026-10-16, do numbered lines ("Step badges ride the line").
- **Measured** on fifteen architecture drafts (three of the private reference brief, nine of the public brief, three of 25 components): the line drawn on the page, a shared trunk counted once, fell 10%, from 97,508 px to 88,220 px; crossings went from 39 to 40 and bends from 357 to 370. On the picture the owner called terrible, the line drawn fell from 5,272 px to 2,408 px and its one crossing went.
- **Labelled lines stay apart.** Bundling them too would cut the line drawn by 22%, but their labels had no place on a shared trunk and were lost, and crossings rose from 39 to 51. A label on each branch near its target would be a separate decision.
- **The target look ("A target picture with measured rules") changes with it:** each of its two services now sends one trunk to its three stores and services below, where it sent three lines. The owner sees the picture before and after.

## Not chosen

- Bundling labelled lines without a place for their labels: it loses the labels.
- Bundling from two lines: two separate lines are as easy to follow as a trunk that splits.

## Consequences

Labelled and two-way lines keep their own ports. Three or more lines of one style read as one line until they split.
