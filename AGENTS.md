# AGENTS.md

How development in this repository runs.

Product scope, format contracts, and design decisions live elsewhere and are not restated here.

## Environment

- Node ≥ 20, pnpm 9
- macOS is the primary dev machine; CI runs Linux
- `pnpm install` to bootstrap

## Commands

| Command | Does | Status |
|---|---|---|
| `pnpm install` | install dependencies | available |
| `pnpm typecheck` | `tsc --noEmit` | available |
| `pnpm check` | Biome lint + format check | available |
| `pnpm test` | unit and fixture tests | Phase 0 |
| `pnpm render <spec>` | render one spec to PNG, SVG, and `review.html` | Phase 0 |
| `pnpm build` | emit `dist/` | later |

A command added to `package.json` gets a row here in the same change.

## The development loop

1. Edit source or a fixture.
2. `pnpm render examples/<name>.yaml` — output lands under `examples/.out/`, untracked.
3. Open the PNG and look at it. A rendering change is not verified by a green test alone.
4. `pnpm test` — green before moving on.
5. `git diff` — read your own diff before handing off.

## Definition of done

Every change ends with all of:

- `pnpm typecheck` and `pnpm check` clean
- `pnpm test` green
- at least one fixture rendered from disk and inspected by eye
- one line stating what changed, with the command output that proves it

Never report a change as working because the code looks right. Paste the command and its key output lines.

## Tests

- IR is asserted byte for byte: same input, same bytes, across runs and machines.
- SVG is asserted as text, via snapshot.
- PNG is asserted as a decoded pixel matrix, not compressed bytes.
- Fixtures live under `examples/`, expected outputs beside them.
- Generated artifacts (`*.ir.json`, `*.png`) stay untracked, except inside snapshot directories that are part of the contract.

## Commits

[GITFLOW.md](GITFLOW.md) is the authority on identity, branches, and commit messages. It is not restated here.

## Change discipline

- The repository stays runnable after every step. A half-migrated state is not a stopping point.
- One intent per commit. If the subject needs "and", split it.
- Split before a change spans three or more modules, or 300 or more lines.
- No abstraction without a second caller. No configuration option without a second value.
- Do not refactor unrelated code. Note what you find; change it in its own step.
- If something is unclear and affects scope, format, or user-visible behavior, offer options and ask instead of guessing.

## Where changes land

| Change | File |
|---|---|
| Toolchain, commands, loop, gates, traps | this file |
| Identity, branches, commit format, ignore rules | [GITFLOW.md](GITFLOW.md) |
| Product scope, format contracts, design decisions | `DESIGN.md`, once the decision log earns its own file |
