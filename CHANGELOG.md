# Changelog

What changed in each release of grafical, from the side of the agent that draws and the person who asks.

## Unreleased

grafical has not been released; the first release will be 0.1.0.

### The command line

- A command names its file with `-f` or `--file`, ahead of the command.
- A verb is a flag after its noun, as in `grafical -f a.grafical edge --add a b`.
- `apply -` reads a batch from standard input.
- `--type` takes the place of `--kind`.
- `show <id>` gives one object and what refers to it.
- `diagram --lines square|round` sets how lines are drawn.
- A line's label now sits on the line, which passes through it, and at the middle of a vertical run.
  - `edge --label-at <id> beside` puts one label back beside its line.
  - Pictures get 0.9% shorter over the saved drafts, and a gap with a label on its line gets 16 px wider.
- A node's label, a line's label, a note, a lane's label and a subtitle keep a line break, written as a real break or as `\n`.
- `label --align <id> left|center|right` lines up the text of a node, an edge, a wall or a lane.
- `note --align <on> left|center|right` lines up the text of a note drawn as a card.
- `gap --between <a> <b> --magnified <n>` widens the gap between two neighbouring layers, groups or columns.
- `edge --side <id> --out <side> --in <side>` states the side a line leaves or enters by, and one with no route is refused as `side-blocked`.
- A bundle with branches to both sides splits at one knot, where it took two.
- `type --add` defines a sort of node or edge with its own shape and look, and `--type` names it.
- `style --add` names a look, and a node, an edge, a group or a lane marks it with `--style`.
- A file named `.grafical` is written in the new form of blocks, and a YAML file still reads and writes as YAML.

### Boxes and rows

- A band in a lane whose label reads the same draws the name once, in the lane.
- A box beside every box it connects to is now the warning `box-aside`, however it was placed.
  - It was refused when the box was placed by steps, and passed in silence in a row.
- The new kind of box `choice` is a small diamond with no text where a line splits into several.
  - The question goes on the line into it and each answer on a line out.
  - Before, a diamond was always a `decision` sized for the words inside it and at least 136 px wide.
  - No saved diagram uses it, so nothing drawn before changes.
- `label` is optional on `layer add`, and its batch line shows only `id`.
  - A row drawn without a label draws no name: a bar is empty, and a band has no text in its head.
  - A file whose rows have no `label` reads and writes back the same.
- `layer look <row> box|band` now draws the row and its name even when no line ends at it.
  - A row with boxes is drawn as a band around them.
  - A row with no boxes is drawn as one bar.
  - A row with no look and no line ending at it is still not drawn, so diagrams without looks draw as before.
  - A bar drawn for its look alone is checked as any bar.
  - A line that passes it is refused as `bar-crossed` unless `edge pass` lets it.
  - A bar between a group's first and last rows is refused as `bar-in-group`, and `layer look` is among the commands that can change it.
- A row with no boxes may be a line's end, such as a gateway or a message bus.
  - It is drawn as one 40 px bar across the picture with its name in it.
  - Lines meet it straight past their other ends.
  - It was refused as `empty-container`.
  - `layer look <row> box|band` draws a bar or a band as a box or as a band; a bar is a box unless it says band.
  - A line that passes a bar without ending at it is refused as `bar-crossed` unless `edge add --pass` or `edge pass` lets it; `bar-to-bar` and `bar-in-group` refuse a line between two bars and a bar inside a group's rows.
- `node add` into a row that already has boxes needs a place: `--first` or `--last` or `--before` or `--after`.
  - So does `node move --layer`.
  - Without one the write is refused as `missing-field`, with the row and its boxes. grafical no longer picks the slot.
- `layer tidy` and `diagram tidy` are removed.
  - Compare orders with `grafical try` instead.
- Columns hold across rows: every box of a column now sits left of every box of the next column in any row, not only in its own row.
  - A picture that uses columns may grow wider.

### Lines

- A line between neighbouring rows whose lower end was pushed aside now also runs straight past a line in the gap that it crossed anyway: before, any line across the gap at its lower end kept it bent twice.
- `edge step <file> <id> --n <number>` numbers a line from 1 to 99 as a step of a process.
  - grafical draws the number in a small ring on the line, under the start of its label.
  - Without `--n` the number is cleared; in a batch it is `edge.step`.
  - `show` prints `[step <n>]` after the line, and `show --drawn` adds `step=<n>` to its record.
  - A numbered line keeps its own port.
  - Its label's text stands a little further from the line, so a picture with numbers grows a little taller.
  - `check --all` reports a badge that touches anything as `step-collision`.
- A line that runs straight between two boxes centred one under the other now meets them at their centres more often: where other ports or the lines sharing its way had pushed it a little aside and nothing else would move or bend, it is put back.
- A line between two boxes of one row may run above the row instead of under it, when fewer lines meet the boxes between its ends from above than from below: it then crosses fewer lines.
  - It stays below in three cases:
    - Its box lies under a band's label.
    - A wall or a lane's border lies above the row.
    - Going above would bend another line or push a label out of its place.
- Several lines may turn into one side of a box, each at its own height.
  - The nearer line from above enters higher.
  - A second line into a side no longer bends twice into the box's top.
- A line between two neighbours in a row runs straight across the gap with its label above it, for labels up to 200 px wide.
  - That is about thirty characters.
  - The limit was 120 px, and a longer label sent the line round under the row.
- A line that ends at a row meets its band straight past its other end where nothing is in the way, instead of turning toward a box inside the band first.
- Two lines that leave one side of a box and turn into boxes on either side of it now both turn once: the second leaves a little off the side's middle, where it bent twice before.
- Two lines may now turn side by side through the same gap between two boxes of a row, when their runs along the row keep apart.
  - A line that bent twice because the gap was taken now turns once.
- A line between neighbouring rows runs straight when the lower box's other ports push its lower end off the upper one.
  - The same holds when a group label above the lower box pushes it.
  - The upper end moves to meet it where nothing else in the gutter runs across.

### Labels, notes and the legend

- A label now sits on its line when the line runs straight up and down.
  - The line breaks under the label, as a flowchart's labels do.
  - The picture comes out narrower where labels used to sit beside lines.
  - Before, a label sat only above or below a run or beside such a line.
  - A label with no room between its neighbours wraps onto more lines.
  - Three labelled lines between one pair of boxes are all drawn now, where the middle one was refused as `label-blocked`.
  - Over the 329 saved drafts:
    - 299 changed and no defect was gained.
    - Bends stayed at 3,888 and crossings at 1,199.
    - The pictures came out 2,216 px less wide in all.
  - Over 2,000 fuzz seeds:
    - `label-blocked` fell from 62 to 0 and `title-blocked` from 4 to 1.
    - `needless-bend` rose from 329 to 331.
    - Bends rose by 8 and crossings by 2.
- A footnote's number on a line no longer sits across the side of a group, a lane or a row's band or bar.
  - Like a note's card, it lies wholly inside one or wholly outside it.
  - Where neither fits, the list names the line alone.
- A bar's name now sits clear of the lines that pass the bar.
  - Those lines run as they would without it.
  - Before, the name took the first stretch no line ended at.
  - A line that passed the bar there went round the name with up to four bends.
- A line that ends at a lane is refused as `label-blocked` when its label finds no place beside what is left of the line clear of the other lines.
  - The refusal names the line and the lanes whose border lies across its label.
  - Before, the label was drawn across the border.
  - A numbered line cut at a lane no longer has its label's text pushed past its place by the number's ring, across a lane's side or another line.
- `wall relabel <file> <id> [--label <text>]` changes the words on a wall's divider, or drops them without `--label` so that the wall is space alone; in a batch it is `wall.relabel`.
  - Until now a wall's label could change only by removing the wall and adding it again.
- `group title <file> <group> <place>` (or `group label`) says where a group's label sits.
  - It takes one of these places:
    - `top-left`, `top` or `top-right` in its head.
    - `bottom-left`, `bottom` or `bottom-right` in a foot below its last row.
    - `left` or `right` beside its rows inside the box.
    - `outside-top` or `outside-bottom` or `outside-left` or `outside-right`, centred just outside the box.
  - The file holds it as the group's `titleAt` and a batch as `group.title`.
  - `show` prints `title=<place>`.
  - The label sits exactly there and takes only its own room; no box or line moves for it.
  - A line that would run across it refuses the write as `title-blocked`.
  - The refusal names the lines in the way, and as `clear` the places none comes near.
  - Without a place the label is seated as before.
- The legend says only what the agent named.
  - Line styles and widths lose their default words: "call or read" and "message" and "optional" and "related" and "main path".
  - A diagram that names nothing draws no legend.
  - `show --drawn` prints a `legend` record with `text=-` for each style and width left unnamed, with the `weight` to name it by.
  - `diagram legend --hide` is removed; an old file's `false` is read as no words.
- `note add --footnote` makes a note a footnote, held as `footnote: true` in the file; without it a note is a card.
  - A card with no place beside its target no longer turns into a footnote by itself: the write is refused as `label-blocked` with `is: note`.
- A wall's label with no place along its wall clear of the lines across it is refused as `label-blocked` with `is: wall`.
  - Before, it moved across the picture to the left of everything or above or below the wall.
- A line's label that no gap between rows on its way has room for no longer sends its line out round the crowd.
  - The same holds for a step's number.
  - The write is refused as `label-blocked`.
  - The refusal names the line and then the lines across the label.
  - It names the gaps it tried as `gutters`, each `<row above>/<row below>`.
  - `node resize` is among the commands that can change it.
  - grafical never widens a box for its lines.
- A group's label with no place stated sits at the leftmost spot of the top that no line comes near.
  - No box or line moves for it.
  - Boxes no longer move apart for it, and lines no longer leave their boxes' centres to keep off it.
  - Where a line comes near every spot, the write is refused as `title-blocked`.
  - The refusal gives the places no line comes near as `clear`, and the agent states one.
- A label that must leave its best place no longer pushes another line across a fan-out: the place it takes is weighed by the crossings it truly forces.
- A line's label no longer lies across the border of a group box.
  - `check --all` reports one that does as `text-crossing` and names the group and the line.
- A line's label no longer lies across the border of a lane or a band either.
  - `check --all` reports one that does as `text-crossing` and names the lane or the row and the line.
  - A labelled line that crosses from one column lane into the next moves their shared side close to the first lane.
  - Its label sits past the side, so a picture with column lanes may grow a little wider.

### Groups

- `group order` moves the boxes of a group's inner groups with its own as one block.
  - Two zones whose boxes all sit in subnets now swap, where they were refused as `no-shared-layer`.
  - A group ordered beside itself or beside a group around or inside it is refused as `bad-reference`.
- `group copy` copies a group with its inner groups, its boxes and the lines between them.
  - Every id it makes takes `--suffix`.
  - The copy goes before or after a group in each of its rows.
  - It draws a second zone, region or shard in one operation.
  - `--outside` copies its lines to everything else too.

### Refusals and warnings

- The new warning `line-per-member` names a group each of whose boxes has a line to the same end or from it.
  - The lines are alike in kind and label and weight and arrowheads.
  - The warning names them.
  - `edge add` can draw one line to the group instead.
  - A group inside another with the same lines is left out.
  - 8 of the 329 saved drafts get one.
- Every refusal and defect and warning prints as a block after the outcome line with a blank line before it.
  - The block holds these lines:
    - Its kind and its code, where the kind is `error` or `defect` or `warning`.
    - `description:`, one fixed sentence per code that says what happened.
    - `source:` says what caused it, and a warning has none.
    - `detail:`, its facts one per line.
    - `next:`, the names of the commands that can change it or `-`.
  - A usage error prints `failed changed=-` first too.
  - `--json` gives each as `{kind, code, description, source, detail, next}` under `problems`.
  - An error an operation caused has the operation's index as `detail.op`.
  - An error already in the file has none, and nor has a file or a batch that cannot be read.
  - The one-line `error op=... code=...` and `defect code=...` records are gone, and so is every `fix`: no refusal writes the command for the agent any more.
  - `elements=` gives way to typed keys with one value each: `node` and `edge` and `group` and `row` and `lane` and `wall`.
  - Several of one kind go under `nodes` and `edges` and `groups` and `rows` and `lanes`.
  - `likely` is a value only: `grafical help apply` gives `found: help` and `likely: --help`.
- A refusal's `source` says what caused it.
  - It is one of these:
    - The command line as typed.
    - For an operation of a batch, `<batch file> line <n>: <the operation as written>`.
    - For a problem the file had before the command, `already in the file`.
  - A defect found after layout names the batch line after the last prefix of the batch without it.
  - So does an error found only in the diagram the whole batch makes.
  - Before, both named the batch's last operation.
  - grafical tries ever shorter prefixes of the batch and lays out at most 400 boxes and lines in all: 3 prefixes of a diagram of 113.
  - Where that cannot tell, it names the batch file alone and never a guessed line.
  - It cannot tell when a prefix is refused for another problem or the prefixes are spent.
- Every write prints every warning the diagram has as a block, and so do `check` and `render`.
  - Single commands print them too.
  - `bent-line`: a line with more than two bends.
  - `passing-row`: a line through rows it does not connect.
  - `line-across-group`: a line through a group holding neither end, with the groups.
  - `tight-lines`: two lines under 12 px apart for over 100 px.
  - `crowded-label`: a label with under 8 px of room on two sides.
  - `lonely-box`: a box no line reaches.
    - Neither its own line nor one to its group, row or lane reaches it.
  - `crossing`: a pair of lines that cross.
  - A warning has no source: the outcome line names what the write changed.
  - The counts are as before.
  - On a 50-box draft a write prints about 170 to 230 such blocks, most of them crossings.
- Refusals carry what an agent needs to find the change itself:
  - `bar-in-group` names the bar's row and the group and the line and the group's `top` and `bottom` rows.
  - `group-conflict` names those rows too.
  - `alignment-conflict` names the boxes in the way.
  - `edge-inside` and `edge-blocked` and `bar-to-bar` and `bar-crossed` name the line's `ends`.
  - `group-across-lanes` names a box in another lane and that lane.
- `group-split` names the box and its row.
  - It also names the innermost group whose members the box stands between, and those two members as `between`.
- An unknown option, a missing argument or an unknown command prints a block instead of the parser's sentence.
  - An example is `error: unknown-option` with `found: --bogus`, with exit code 2.
  - With `--json` it prints the same object as any refusal on standard output.
  - Before, it printed text on standard error even with `--json`.

### What the agent reads back

- `check` reports the errors every write would refuse in a file, with exit code 1.
  - An example is a group split around a box in one row.
  - Before, it printed `ok` with its warnings and counts for such a file.
- The counts gain `bent=`: the lines drawn with more than two bends.
  - Each is also a `bent-line` warning.
  - Nothing is refused for it: it tells the agent which line its rows send round, which before only `check --all` measured.
- `show --drawn` prints a `gutter` record for each pair of neighbouring rows.
  - It counts the lines and crossings and tight pairs and crowded labels between them.
- The `counts` record gains `across=` (lines through a group holding neither of their ends), `tight=` (pairs of runs of two lines side by side under 12 px apart for over 100 px) and `crowded=` (line labels with under 8 px of room on two or more sides).
  - `apply --help` describes them.
- `grafical try <file> <batch.yaml>...` takes several batches: one `before` record, then each batch's `ok` and `after` and `delta` records keyed by `batch=<file>`.
  - A blank line comes before a refused batch's `failed` line.

### Help

- `grafical --help` no longer says grafical does not draw timelines.
  - A roadmap by quarter is drawn, with columns for the quarters and lanes for the teams.
  - The page now names only timelines on a time scale, such as Gantt charts.
- The help pages no longer have a "When refused" section, and neither does `apply --help`.
  - A refusal's block says what happened, what caused it and which commands can change it.
  - `apply --help`'s "Output" describes the block, the outcome of a refusal and the exit codes.
- The help no longer puts a "Not shown: ..." footnote in front of every agent.
  - Step 1 of `grafical --help` no longer shows one.
  - Nor do the examples of `new --help` and `apply --help`, or `new --note`'s description.
  - In the 2026-10-18 round, 18 of 22 drafts wrote such a note.
  - Most of them listed parts the request never named.
  - `--note` itself is unchanged.
- The help says how to use grafical, and `grafical guide` how common kinds of diagram are usually drawn.
  - `grafical --help` lists every way to draw in place of the list of diagram types.
  - Each way is one line named by the story it tells, such as a box beside a box or one path in order.
  - The page also says what grafical does not draw.
  - Each command's `--help` shows its line in a batch, so `apply --help` no longer lists 15 of the 60 operations.
  - `grafical guide` lists guides for these diagrams: architecture and C4 and infrastructure and dependency and data flow and event flow and flowchart and swimlane and state machine.
  - It also lists one on composition.
  - `grafical guide <name>` prints one.
  - Nothing tells an agent to read them.
- `grafical --help` names `group title` and `edge pass` in their groups' lines, which left them out.
- `grafical help <command>` is gone: a command's page is `grafical <command> --help`.
  - A command grafical does not have is refused with the one it most likely means.
    - `grafical help apply` gives `error: unknown-command` with `found: help` and `likely: --help`.
    - `grafical "node add" --help` and `grafical node.add --help` give `likely: node add`.
    - `grafical nodee add --help` gives `likely: node`.
  - Before, a wrong name with `--help` printed the entry page and exited 0.
  - `help <command>` exited 2 after printing the page.
- Command arguments are named as their batch fields.
  - `group title <file> <id> [at]` and `group join <file> <group> <nodes...>` show it.
  - `lane join` and `lane leave` and `column join` and `column leave` take `<members...>`.
  - `edge emphasize` and `edge weight` take `<edges...>`.
  - `wall allow` takes `<allow...>`.
  - Only the help's words change; the commands take the same values.
- The help teaches composing an architecture diagram.
  - Its lessons:
    - Each system is a group, and the groups sit side by side with each entry above its stores.
    - Boxes that talk sit next to each other.
    - What every request passes is a row that lines end at, drawn as one band.
      - A gateway is one such row.
    - A queue is a box only when it is the story, and otherwise its events are lines between the services.
    - Side paths are cut.
  - To stay within the help's length, `grafical --help` no longer repeats what a refusal looks like: `grafical apply --help` says it.
