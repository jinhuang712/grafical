# grafical Philosophy

> Written 2026-09-10. Rewritten 2026-09-11.

This document sits above everything else in grafical. It is not a design, not a roadmap, not a list of features. Code, formats, and commands will change. These statements will not.

Every design decision must trace back to one of them. When a decision conflicts with this document, the decision is wrong.

## The first draft is the product

grafical exists so that an agent, given a description of a system, produces a diagram a person would accept on the first render. Every later feature is measured against that: does it make the first draft better, or does it make fixing a bad draft easier? Only the first counts.

A draft with a mechanical defect is not a draft. Overflow, overlap, an edge through a node: these are reported to whoever produced the structure, with the place, the observation, and the expectation, in a form a program can act on. They are never left for a person to find.

## What nobody has decided, grafical computes

A layout is a default, not a law. Every position, size, route, and style has a computed value until someone sets it. Once set, it stays set.

This is what lets the author say only what the system is made of, what belongs together, and what connects to what, and still get a finished picture. It is also what lets a person change any of it afterwards. The computed value fills the gap. It never fights a decision.

## The last hand is not overwritten

An agent drafts. A person edits. The agent iterates on what the person left behind. They take turns on one file, and each turn changes only what it means to change.

So a person's edit, however small or however free, survives every regeneration that does not touch it. An agent that changes the structure moves what the change requires and nothing else. The file always holds the latest state from either hand, and neither hand is asked to redo the other's work.

## Few words for the writer, every tool for the editor

The writer is a model, and every distinction it is asked to make is a chance to be wrong. So the structure vocabulary is small, each word means one thing, and the default answer to "should it also say this?" is no.

The editor is a person, and their cost is time, not error. So the page they edit in withholds nothing: drag, resize, restyle, add, remove, connect, undo, whatever a canvas tool can do. The two surfaces are deliberately unequal, because their users are.

## The same file is the same picture

A diagram is sent, kept, diffed, and rendered again years later. If the picture depends on who renders it, when, or with what, none of that work is safe.

So the file carries everything the picture needs, including the layout that was computed and the edits that were made. Identical file, identical bytes, on any machine. From the first release on, the format only grows. A file that cannot be read is refused, never guessed at.

---

Five statements, each of which can be tested against a decision. If a decision cannot be traced back to one of them, the decision is not yet justified.
