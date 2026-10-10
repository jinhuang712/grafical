# grafical

Architecture diagrams that coding agents build in small, checked steps.

An agent builds a diagram one operation at a time: add a layer, add a node, connect two nodes, rename one. grafical places, sizes and routes everything. Each operation changes what it names and moves only what has to make room, so a diagram never has to be redrawn from scratch. The diagram lives in one text file that you keep in git, and the same file always renders the same SVG and PNG.

> **Status: design.** Nothing is implemented yet. This README describes the first release. Progress is tracked in [ROADMAP.md](ROADMAP.md).

## Why

Agents describe systems well, but they draw them badly. Today an agent writes a whole diagram in one shot. Every fix regenerates the whole picture, unrelated parts move, and weaker models produce something different each time. [PROPOSAL.md](PROPOSAL.md) covers the problem and what we measured.

## How it works

```text
agent ──operations──> grafical ──writes──> diagram file (YAML, in git)
                         │
                         ├── errors and defects ──> back to the agent
                         └── render ──> SVG ──> PNG
```

- The agent states facts: which layer a node is in, what comes after what, what connects to what. It never gives a coordinate.
- grafical turns those facts into a finished picture: aligned, evenly spaced, with consistent type sizes.
- A mistake is reported at the step that made it, with a hint for the fix.

## What it will look like

The syntax below is illustrative. Phase 1 fixes it.

```sh
grafical new arch.grafical.yaml --title "Event sync"
grafical layer add arch.grafical.yaml ingest --label "Ingest"
grafical node add arch.grafical.yaml relay --label event-relay --kind service --layer ingest
grafical node add arch.grafical.yaml kafka --label Kafka --kind queue --layer ingest --after relay
grafical edge add arch.grafical.yaml relay kafka --label produce
grafical check arch.grafical.yaml
grafical render arch.grafical.yaml --png arch.png
```

A later change is one more step, and only the renamed node changes:

```sh
grafical node rename arch.grafical.yaml kafka --label "Kafka topics"
```

## Documents

| File | Holds |
|---|---|
| [PROPOSAL.md](PROPOSAL.md) | The problem, what we want, the idea and its bets |
| [PHILOSOPHY.md](PHILOSOPHY.md) | The beliefs that do not change |
| [GOALS.md](GOALS.md) | Goals, non-goals, benchmarks and their targets |
| [DESIGN.md](DESIGN.md) | Numbered design decisions and what was rejected |
| [FEATURES.md](FEATURES.md) | Commands and operations, with status |
| [ROADMAP.md](ROADMAP.md) | Stages, phases and exit checks |
| [AGENTS.md](AGENTS.md) | How agents develop in this repository |
| [GITFLOW.md](GITFLOW.md) | Git conventions |

## License

[MIT](LICENSE).
