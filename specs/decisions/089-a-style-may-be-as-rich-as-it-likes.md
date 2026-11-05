# 089. A style may be as rich as it likes

Decided: 2026-11-06

## The problem

An agent wants one look on objects of many sorts. A style that picks its own objects by a condition would make a look hard to trace, since an object would not say what touches it.

## The choice

A `<style>` holds every look grafical can draw and says nothing of who uses it. An object that wants it names it with `style`. It may name several, and a later one overrides an earlier one. An object beats a style, a style beats a type, and a type beats the theme. `show` gives each value's source.

## Not chosen

- A condition on the style, as in CSS selectors.
  - The owner holds that whoever uses a style marks it, so an object says all that touches it.

## Consequences

An agent names a style on each object that wants it, and a look that follows a whole group is named on each member or on the group. A named look of a stylesheet is a style.
