# 076. A band in a lane of its name draws no label

Decided: 2026-11-06

## The problem

A layer in a lane that is also the end of an edge got the lane's label and a band label of its own. Where the two read the same, a reader saw one word twice.

## The choice

A band draws no label when its text matches its lane's label. The layer keeps its label in the file, and a band whose text differs keeps its own.

## Not chosen

- Dropping the band's label when its layer is the lane's only layer.
  - Two different texts then lose one, and each says something.
- Keeping the band's label at its top left and letting edges pass it.
  - An edge would run through text.

## Consequences

A diagram whose two texts match has a band with no head. A rename of either text brings the label back.
