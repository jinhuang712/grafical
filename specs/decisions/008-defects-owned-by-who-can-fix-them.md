# 008. Defects owned by who can fix them

Decided: 2026-10-11

## The problem

Some defects only the agent can fix and others only the engine can avoid. A write refused for the engine's mistake leaves the agent retrying in vain.

## The choice

After each operation or batch, grafical lays out the diagram and checks it. Each defect has an owner: whoever can fix it.

- **The agent owns** a defect that a fact it stated caused, such as text too long for its box. The write fails and changes nothing, and the refusal names what is at fault and the commands that can change it.
- **The engine owns** a defect about where lines and boxes go, which no operation controls ("Facts over coordinates"). The engine must avoid it with the room "Layout computed again on every change" allows: the next gutter step, more track or port separation, another label slot.
  - If it still leaves one, that is an engine bug.
  - The write goes ahead, the agent is never told, and `grafical check --all` reports it so that benchmarks and tests count it.

Which defects exist, who owns each, and how text is checked against its box is in [the checker](../checks.md#defects-and-who-owns-them).

## Not chosen

- Warnings for agent-owned defects, because a picture with a known defect looks like success.
- Checking only at render time, because the error then surfaces long after the operation that caused it.
- Failing the write on engine-owned defects, as this decision first said.
  - The phase 1 measuring run showed the cost.
  - Haiku met an edge overlap and a label collision that only the router could fix.
  - It retried 11 times and gave up.

## Consequences

An engine bug can reach a picture without the agent knowing, so the fuzz test keeps looking for engine-owned defects.
