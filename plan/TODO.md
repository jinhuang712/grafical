# TODO

## ongoing

### [P2][DISCUSSION] How fast one operation must be once a write lays out the diagram twice

- description: T2: Speed asks 50 ms an operation at 50 nodes, and one now takes up to 87.3 ms, since a write lays out the diagram as it was before to tell new warnings from old. A command takes 206 to 211 ms against its 400 ms.
- created: 2026-11-10
- status: HALT
- found: `pnpm bench speed` on the branch that built decision 108, against main: median 11.0 to 19.8 ms, worst 43.9 to 87.3 ms.
- next: the owner takes it up later, with options such as a target that counts both layouts or laying out the old diagram only when a warning could change.
- related: [T2: Speed](GOALS.md#t2-speed)

### [P2][ISSUE] The entry help's descriptions do not start at one column

- description: `grafical --help` prints the description of `show` · `diff` · `check` · `render` · `view` right after the name, and every other command's at one column further right. All of them should start at one column.
- created: 2026-11-10
- status: OPEN
- found: reading `grafical --help` while checking CLI.md, on main too.
- updated: 2026-11-10
- next: find where the commands with no verb get their padding.
