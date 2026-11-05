# Philosophy

Words run in a line, one after another. Relationships do not: a system has parts that call, feed, contain and depend on each other all at once. A diagram puts those relationships on a plane, where the eye takes them in with one scan. That is why a good diagram explains a system faster than any paragraph, and why a bad one explains nothing.

> … sentential representations, in which the data structure is indexed by position in a list, with each element "adjacent" only to the next element in the list, and diagrammatic representations, in which information is indexed by location in a plane, many elements may share the same location, and each element may be "adjacent" to any number of other elements.
>
> — Jill H. Larkin and Herbert A. Simon, "Why a Diagram is (Sometimes) Worth Ten Thousand Words", 1987

> The world is complex, dynamic, multidimensional; the paper is static, flat. How are we to represent the rich visual world of experience and measurement on mere flatland?
>
> — Edward R. Tufte, *Envisioning Information*, 1990

These are the questions grafical takes a stance on, and its answers. Commands, formats and code will change. A change to an answer is a deliberate decision of the owner, recorded here.

## What is a diagram?

**A diagram is a selection of facts, arranged for the eye. It works by what it leaves out.**

A diagram that draws every part, every connection and every word becomes noise. One that abstracts, groups and cuts becomes the fastest way to explain a system. Software makes the cut unavoidable: a system is several graphs at once, and one picture can show only some of them. Brooks goes further: "Software is invisible and unvisualizable", and "The reality of software is not inherently embedded in space." So every architecture diagram is already a choice of which graph to show. Choosing what to show is the work. grafical cannot make that choice, but it can make the chosen graph cheap to draw well. It never adds a fact the agent did not state, and never drops one to make a picture tidier.

> As soon as we attempt to diagram software structure, we find it to constitute not one, but several, general directed graphs, superimposed one upon another. The several graphs may represent the flow of control, the flow of data, patterns of dependency, time sequence, name-space relationships. … Indeed, one of the ways of establishing conceptual control over such structure is to enforce link cutting until one or more of the graphs becomes hierarchical.
>
> — Frederick P. Brooks, Jr., "No Silver Bullet", 1986

> Il semble que la perfection soit atteinte non quand il n'y a plus rien à ajouter, mais quand il n'y a plus rien à retrancher.
>
> (Perfection seems to be reached not when there is nothing left to add, but when there is nothing left to take away.)
>
> — Antoine de Saint-Exupéry, *Terre des hommes*, 1939

## Why are good diagrams rare?

**Drawing is tiring, so people settle for "all right". Make the next improvement cheap, and the diagram keeps getting better.**

By hand, every improvement costs dragging, resizing and re-routing, and after a few rounds the person stops at a diagram that is good enough. Agents do not tire, but they settle too: they stop when the next fix costs too many turns, tokens or minutes. So grafical makes every change a small step that costs little, that is checked when it arrives, and that never asks for the picture to be drawn again. A diagram is built in steps, and nothing is regenerated to change one thing. The quality of a diagram depends less on how smart the drawer is than on what one more improvement costs.

> Organisms adapt well enough to "satisfice"; they do not, in general, "optimize".
>
> — Herbert A. Simon, "Rational Choice and the Structure of the Environment", 1956

## How does a reader see a diagram?

**The author thinks in sentences, the reader sees in places, and the engine translates.**

The reader's eye finds relationships by where things sit. The agent that draws does not see that way: it reasons in words and facts. Tools made for people's hands, such as a canvas, an SVG file or coordinates, ask the agent to work in the reader's medium, which is where models fail. Tools that stay in text give the author too little say over what the reader sees. The agent that draws is a sentential creature making a diagrammatic thing, and this is the deepest reason coordinates are the wrong interface for it. grafical lets the agent state facts, and turns them into places. A diagram is not good because it is a diagram, so the thinking stays with whoever draws.

> Diagrams can group together all information that is used together, thus avoiding large amounts of search for the elements needed to make a problem-solving inference. … Diagrams automatically support a large number of perceptual inferences, which are extremely easy for humans.
>
> None of these points insure that an arbitrary diagram is worth 10,000 of any set of words. To be useful a diagram must be constructed to take advantage of these features.
>
> — Larkin and Simon, 1987

> When thought overwhelms the mind, the mind puts it into the world, notably in diagrams and gestures.
>
> — Barbara Tversky, "The Cognitive Design of Tools of Thought", 2015

## Who owns what?

**The engine does the dirty work. The agent owns the taste and the truth.**

The engine measures text, places boxes, spaces them, routes lines and redraws the picture after every change, so that it is always aligned and tidy. The agent decides everything the picture says: what to include and how much, what to merge, what each box and line is called, whether the facts are correct, and whether the story reads well. grafical tells the agent facts and counts about what it drew, and never judges the diagram or advises in prose. A refusal states which input is wrong and what is allowed.

> grafical is not responsible for taste, graph correctness and clearness. grafical is a engine only to do the dirty work.
>
> — the owner, 2026-10-14

The dirty work has edges. The engine draws each thing in a few plain forms: a line straight or with one or two bends, a label on or beside its own run, a title at its place, a note as the agent said. It does not invent a crooked form to make the facts fit. Where drawing the facts would hide what a reader needs, such as text under a line, the write is refused and names the fact in the way. Where it only costs, such as a line with more bends, it is drawn and reported. Either way the agent decides what to change.

> Often the engine should not do a lot of needless work beyond its edges just to find a way to get the picture drawn. When a title collides with a line, the agent has to think about where it goes; when a line cannot bend into place, it cannot just be forced in either.
>
> — the owner, 2026-10-16, translated

> All software construction involves essential tasks, the fashioning of the complex conceptual structures that compose the abstract software entity, and accidental tasks, the representation of these abstract entities … Most of the big past gains in software productivity have come from removing artificial barriers that have made the accidental tasks inordinately hard …
>
> — Brooks, "No Silver Bullet", 1986

## How does an agent learn grafical?

**An agent learns a tool by using it, not by reading rules.**

Rules in words are the part of a tool an agent forgets. A well-made tool leaves few ways to go wrong, and when one happens the mistake costs little and says enough for the agent to find the best answer itself. So the tool teaches by answering, and never writes the answer for it.

> We should not describe the rules in words. We should design a command line good enough that the model rarely makes a mistake. Even when it does, the mistake should not be a serious one, and every mistake should get enough of a response that the model can find the best answer by itself.
>
> — the owner, 2026-10-18, translated

## How many ways does one thing have?

**One shortest way for each situation.**

Two ways to do one thing look generous, and they cost a choice with no difference behind it. An agent has to weigh them, a reader of its work has to know both, and a model that picks the wrong one learns nothing from it. So grafical offers one shortest way, and a form that only repeats another goes, however convenient it looks.

## What may the agent set?

**Looks are free. Places are facts.**

How a thing looks is the agent's choice, in any value, since agents already judge style well. Where a thing sits is different: coordinates are the work models fail at. So the agent states what is true of a place, and the engine turns it into positions. Nobody places anything by the pixel.

> anything. dont constrain it. at the end its a svg/png/textBox or smth
>
> — the owner, on what a mark on a box may be, 2026-10-13

## What does a change do?

**Only the facts you name change, and the same file is the same picture.**

An operation changes the facts it names, and no other. Rows, order, groups and alignment stay as they were until an operation names them. Positions may shift so that the picture stays tidy, but a reader who learned the structure of a diagram never has to learn it again because of a change elsewhere. The file holds the facts and lives in git, so a change reads like a change to code. The file is a set of facts, as Wittgenstein's world is, with one difference: it holds the chosen facts, not all of them. The same file renders the same picture on any machine. A newer grafical that would draw a file differently says so, and a file grafical cannot fully read is refused, never guessed at.

> The world is the totality of facts, not of things.
>
> — Ludwig Wittgenstein, *Tractatus Logico-Philosophicus*, 1.1, 1921

## Is grafical a new way to draw?

**No. Drawing has always been arranging elements, and grafical builds the best abstraction of it for agents.**

People have always drawn by placing things, grouping them, ordering them, connecting them and moving them. grafical turns those moves into operations an agent can call. A visual language has always been a small alphabet that writes many words, so grafical grows by adding operations, not by adding free positions. What is new is who draws: nobody had built this abstraction for agents before. Moody's principles pull against each other, since more symbols say more and are harder to tell apart. Bertin found that a picture has only a handful of visual variables, such as position, size, shape, value, hue, orientation and texture, and that their combinations carry everything. grafical answers both with many discrete operations over a few kinds of mark.

> Both use space and arrays of elements, depictive and nondepictive, to convey ideas, concrete and abstract, clear and sketchy. The arrays and the non-depictive elements like boxes and arrows serve to show relationships and organizations, thematic, categorical, and more.
>
> — Tversky, 2015

> Semiotic Clarity: There should be a 1:1 correspondence between semantic constructs and graphical symbols. … Graphic Economy: The number of different graphical symbols should be cognitively manageable.
>
> — Daniel L. Moody, "The 'Physics' of Notations", 2009

## What makes grafical good?

**A weak model draws well with grafical. Drawing superbly takes a stronger one.**

Readers prefer different things, and so do the agents that draw: one draws every dependency as its own line, another one line to a group of them. No score settles that for everyone. grafical is measured by how easily an agent reaches a finished picture (few turns, little time, few tokens) and by how steady its floor is: the same facts give the same picture, a change moves only what it names, and a weak model's picture is already good. A superb picture needs fine tuning, and fine tuning takes thought, so it stays the work of a stronger model. grafical does not supply the taste. It owes that model the means to tune what it wants.

## Who draws?

**Agents draw. People say what they want, and read the result.**

With grafical, an agent draws a diagram good enough to use. A person who wants it changed says so in words, and the agent makes the change as operations. No person needs a canvas to drag boxes into place. What grafical lacks is not a second pair of hands but more ways to combine its operations, so that an agent can say more, in fewer steps.

When two answers collide, the facts the agent named win. grafical never changes what a diagram says to make it tidier, and never moves what nobody named to make it prettier.

## Sources

The quotes from Brooks, Larkin and Simon, and Tversky were checked against the works themselves. The others were checked against copies or works that quote them. `…` marks a cut.

- Frederick P. Brooks, Jr. *No Silver Bullet: Essence and Accident in Software Engineering*. 1986.
- Jill H. Larkin and Herbert A. Simon. *Why a Diagram is (Sometimes) Worth Ten Thousand Words*. *Cognitive Science* 11, 1987.
- Barbara Tversky. *The Cognitive Design of Tools of Thought*. *Review of Philosophy and Psychology* 6(1), 2015.
- Edward R. Tufte. *Envisioning Information*. 1990.
- Ludwig Wittgenstein. *Tractatus Logico-Philosophicus*. 1921. Translated by D. F. Pears and B. F. McGuinness.
- Antoine de Saint-Exupéry. *Terre des hommes*. 1939. The English line is our translation.
- Herbert A. Simon. *Rational Choice and the Structure of the Environment*. *Psychological Review* 63(2), 1956.
- Daniel L. Moody. *The "Physics" of Notations*. *IEEE Transactions on Software Engineering* 35(6), 2009.
- Jacques Bertin. *Sémiologie graphique*. 1967. English: *Semiology of Graphics*, 1983.
