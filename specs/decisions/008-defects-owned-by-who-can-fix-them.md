# 008. Defects owned by who can fix them

Decided: 2026-10-11

## The problem

Some defects only the agent can fix and others only the engine can avoid. A write refused for the engine's mistake leaves the agent retrying in vain.

## The choice

After each operation or batch, grafical lays out the diagram and checks it. Each defect has an owner: whoever can fix it.

- **The agent owns** a defect that a fact it stated caused, such as text too long for its node.
  - The write fails and changes nothing.
  - The refusal names what is at fault and the commands that can change it.
- **The engine owns** a defect where a plain form was there and it drew wrong ("Unreadable is refused and costly is reported").
  - The engine must avoid it with the room "Layout computed again on every change" allows.
  - That room is the next gutter step or more track or port separation or another label slot.
  - If it still leaves one, that is an engine bug.
  - The write goes ahead and the agent is never told.
  - `grafical check --all` reports it so that benchmarks and tests count it.

## Not chosen

- Warnings for agent-owned defects, because a picture with a known defect looks like success.
- Checking only at render time, because the error then surfaces long after the operation that caused it.
- Failing the write on engine-owned defects, as this decision first said.
  - The phase 1 measuring run showed the cost.
  - Haiku met an edge overlap and a label collision that only the router could fix.
  - It retried 11 times and gave up.

## Consequences

An engine bug can reach a picture without the agent knowing, so the fuzz test keeps looking for engine-owned defects.
