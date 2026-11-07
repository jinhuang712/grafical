# 095. A good route is one the eye can follow

Decided: 2026-11-07

## The problem

The router is judged by counts of bends and crossings, and a picture can score well on them and still read badly. The owner holds that the router is not smart, and any work on it needs to know what a better route is.

## The choice

A good route is one a reader's eye follows from end to end with no effort. Counts are a means to that. Seven standards say what such a route is. The first matters most, and no detour ranks below a simple shape and few crossings:

1. **It can be followed:** the eye goes from one end to the other and does not lose the line.
2. **It takes no detour:** its length suits how far apart its ends are.
3. **Its shape is simple:** a straight line beats one bend, and one bend beats two.
4. **Its crossings are few and clean:** a crossing is square, and lines do not crowd through one.
5. **It keeps a rhythm:** lines going one way run parallel and evenly spaced, clear of nodes and of each other.
6. **It lands well:** an arrowhead meets the middle of a side, or lines meet a side evenly.
7. **It shows what matters:** the main flow runs straight, and return lines and lesser lines stand back.

## Not chosen

- The fewest crossings as the first aim.
  - One crossing saved can cost a long detour, and a clean crossing reads better than that detour.
- A single score of how readable a picture is.
  - Readers differ, and these standards guide the router and rate no picture.

## Consequences

The counts show bends, crossings and length today, and detour shows in `show --drawn`. Nothing yet measures the first, the fifth or the seventh standard. The order of the standards is the owner's to change, and they can pull against each other.
