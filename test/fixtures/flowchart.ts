// A flowchart (D34): a refund request from start to end, with two decisions,
// a loop back for missing details, and Start and End terminals.

import type { Diagram } from "../../src/model/types.ts";
import { e, n } from "./build.ts";

export const flowchart: Diagram = {
  grafical: 1,
  title: "Refund request",
  density: "normal",
  layers: [
    { id: "begin", label: "Begin", nodes: [n("start", "Start", "terminal", "m")] },
    { id: "intake", label: "Intake", nodes: [n("form", "Read the request", "service", "m")] },
    {
      id: "check",
      label: "Check",
      nodes: [
        n("complete", "Details complete?", "decision", "l"),
        n("ask", "Ask for details", "service", "m"),
      ],
    },
    { id: "rule", label: "Rule", nodes: [n("within", "Within 30 days?", "decision", "l")] },
    {
      id: "act",
      label: "Act",
      nodes: [n("refund", "Issue refund", "service", "m"), n("decline", "Decline", "service", "m")],
    },
    { id: "close", label: "Close", nodes: [n("end", "End", "terminal", "m")] },
  ],
  edges: [
    e("start", "form", "call"),
    e("form", "complete", "call"),
    e("complete", "ask", "call", "no"),
    e("ask", "form", "call"),
    e("complete", "within", "call", "yes"),
    e("within", "refund", "call", "yes"),
    e("within", "decline", "call", "no"),
    e("refund", "end", "call"),
    e("decline", "end", "call"),
  ],
  legend: { solid: "next step" },
};
