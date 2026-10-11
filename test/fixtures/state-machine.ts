// A state machine (D34): an order's life, from the start dot to the end ring,
// with a loop back and a two-way pause.

import type { Diagram } from "../../src/model/types.ts";
import { e, n } from "./build.ts";

export const stateMachine: Diagram = {
  grafical: 1,
  title: "Order states",
  density: "normal",
  layers: [
    { id: "begin", label: "Begin", nodes: [n("start", "start", "initial", "m")] },
    { id: "new", label: "New", nodes: [n("placed", "Placed", "state", "m")] },
    {
      id: "work",
      label: "Work",
      nodes: [n("paid", "Paid", "state", "m"), n("held", "On hold", "state", "m")],
    },
    {
      id: "out",
      label: "Out",
      nodes: [n("shipped", "Shipped", "state", "m"), n("cancelled", "Cancelled", "state", "m")],
    },
    { id: "close", label: "Close", nodes: [n("end", "end", "final", "m")] },
  ],
  edges: [
    e("start", "placed", "call"),
    e("placed", "paid", "call", "pay"),
    e("placed", "cancelled", "call", "cancel"),
    e("paid", "held", "call", "hold"),
    e("held", "paid", "call", "release"),
    e("paid", "shipped", "call", "ship"),
    e("shipped", "end", "call"),
    e("cancelled", "end", "call"),
  ],
  legend: { solid: "transition" },
};
