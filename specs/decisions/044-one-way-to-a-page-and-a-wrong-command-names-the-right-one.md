# 044. One way to a page, and a wrong command names the right one

Decided: 2026-10-18

Changed the same day by "Refusals say what happened and which commands can change it": `likely` is the word meant, as a value, not a command line. `grafical help apply` gives `found: help` and `likely: --help`, and `grafical node.add --help` gives `likely: node add`.

Decided by the owner on 2026-10-18, after one Haiku run (a subagent with grafical on its path, not a benchmark round) drew a refund flowchart. 32 of its 37 grafical calls read help. 11 printed the entry page in place of the page asked for, and 12 printed the page asked for but exited 2:
- Commander adds a `help [command]` command to the program and to each group; grafical never chose it. The entry page listed it, so the agent used it. It reads one word, so `grafical help "node add"` printed the entry page, and grafical exited 2 after each page it printed, as if refused.
- A command name grafical does not have, with `--help`, printed the entry page and exited 0: `grafical "node add" --help`, `grafical node.add --help`. Nothing said the name was wrong.

So:
- **`--help` is the one way to a page.** The program and its groups have no `help` command, and no page lists one.
- **A wrong command is refused with the one it most likely means.** `grafical help apply` prints `error code=unknown-command found=help likely="grafical apply --help"` and exits 2. Two names in one word (`"node add"`, `node.add`), `help` before or inside a group (`grafical node help add`), and a misspelling near one name (`nodee`, at most a third of its letters wrong, or one) are read the same way. `likely` is the word meant ("Refusals say what happened and which commands can change it"): `--help` for `help`, the command's name for the rest. A word near no command has no `likely`, with `--help` or without. The record replaces the page commander would print.

Rejected:
- Keeping `help <command>` and fixing its exit code. Two ways to one page are two forms an agent tries, and the second reads one word only.
- The entry page after the record. The agent asked for one page; the record names it, and the entry page is 75 lines the agent has read.
