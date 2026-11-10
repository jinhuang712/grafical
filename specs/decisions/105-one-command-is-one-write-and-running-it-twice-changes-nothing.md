# 105. One command is one write, and running it twice changes nothing

Decided: 2026-11-10

## The problem

A batch was a YAML list beside the commands, a second form to learn where a shell already chains commands. `--add` refused an ID that existed, so a chain that stopped partway could not run again.

## The choice

- Every command writes on its own, and `apply` and batch files are gone.
- `--set` makes an object when its ID is new and otherwise changes only the attributes it names.
- A command run twice changes nothing the second time.
- `--try` on a write shows the counts before and after and writes nothing.
- `diff` prints command lines that a shell replays.

## Not chosen

- `apply` with command lines in place of YAML.
  - It kept all or nothing, and the owner chose the shell.
- `--add` beside `--set`.
  - A chain run again would fail on every object it had already made.

## Consequences

- The picture must draw after every command, so a `diff` replayed line by line is refused where a picture in between would draw wrong.
  - The owner holds that as expected, and `diff` orders its lines so that only the picture can stop one.
  - On 2026-11-10, 7 of 90 fuzz diagrams replayed from an empty file were refused partway.
- Each command pays for a process of its own.
- Swapping and reversing give way to stating the result.
- One call may set several attributes, which "A command's verb is a flag" once gave as its reason against an ID in place of a verb.
