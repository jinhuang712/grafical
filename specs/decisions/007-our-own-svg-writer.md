# 007. Our own SVG writer

Decided: 2026-10-11

## The problem

The same file must give the same SVG bytes, and resvg does not choose a font for each character, so a label that mixes Latin and Chinese text drew in one font.

## The choice

The engine writes the SVG itself, with a fixed element and attribute order. `@resvg/resvg-js` turns it into a PNG using the same bundled fonts. No browser takes part.

The writer splits each label into runs that use one font, and writes one `<text>` element per run, at x positions from its own measurements. resvg-js 2.6.2 does not choose a font per character: given a font stack, it draws the whole label from Noto Sans SC as soon as Inter lacks one of its characters. The phase 0 text spike measured errors of up to 15.67 px from this.

## Not chosen

- One `<text>` element with a font stack, for the reason above.
- X6 for the output. Running it outside a browser is unproven.
- A headless browser, because it is slow and large.

## Consequences

grafical maintains its own SVG writer, and every label is written as runs that each use one font.
