You are judging an architecture diagram. You see only the brief below, the picture, and (for a change request) the request. You do not know who or what drew it. Judge what you see.

Open the picture file with the Read tool. Look at it as a reader would in a document: it will be shown 1000 px wide.

## The brief

{{BRIEF}}

{{REQUEST_BLOCK}}

## Files

{{FILES}}

## Score

Give each criterion a whole number from 1 (bad) to 5 (excellent).

- accuracy: it shows the facts in the brief, with no invented components and no important item missing. List invented and missing items in `invented` and `missing`.
- clarity: a reader can follow the structure and the flows at once.
- visual: it looks clean and professional: alignment, spacing, consistent type, restrained colour.
- defects: 5 means none. Subtract for text overflowing its box, overlapping nodes, lines running through nodes, colliding labels, lines sharing a segment, unreadable text. List each one in `defect_list`.
- fit: it stays readable when placed in a document at 1000 px wide.

{{OTHER_CHANGES}}

## Reply

Reply with one JSON object and nothing else:

{"accuracy": 0, "clarity": 0, "visual": 0, "defects": 0, "fit": 0, "invented": [], "missing": [], "defect_list": [], "notes": "one or two sentences"{{OTHER_CHANGES_FIELD}}}
