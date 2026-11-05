# 010. TypeScript on Node

Decided: 2026-10-11

## The problem

The command line, the layout and the renderer need one language, and the engine once had to run in a browser for a board that people would drag on.

## The choice

grafical is written in TypeScript and runs on Node 24 or later. The engine (model, layout, routing, measurement and SVG writing) uses no Node-only APIs. That was for a board that would run the engine in a browser while a person drags. The board was dropped on 2026-10-14, and the choice of TypeScript on Node stands without it.

## Not chosen

Go, which builds a single binary, because a browser build would have needed a second engine or a large WASM build. Rust, because development is slower.

## Consequences

grafical needs Node 24 or later. Without the board, nothing needs the engine to run in a browser any more.
