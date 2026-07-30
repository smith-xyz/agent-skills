# Generator Patterns

Hard-won techniques for Excalidraw emitters. Both sections exist because the
naive approach produces diagrams that fall apart the first time a human touches
them.

## Bound text — always

Every box's label must be a **container label** (bound text), not a separate
text element positioned over the rectangle. Bound text moves, resizes, and
edits as one unit with its shape. Free-floating text drifts out of sync the
moment anyone drags the box in the app.

Wiring: the container rect needs
`boundElements: [{"id": text_id, "type": "text"}]`, and the text element needs
`containerId: <rect_id>`.

A container binds **exactly one** text label. For a bold title plus a smaller
caption, join them with `\n` in a single text element — one `fontSize` and one
color for the whole block. Do not try to bind two.

```python
def node(elements, id, x, y, w, h, label, bg, stroke, sub=None, size=11):
    full = label if not sub else f"{label}\n{sub}"
    r = rect(id, x, y, w, h, bg, stroke)
    text_id = f"{id}_t"
    r["boundElements"] = [{"id": text_id, "type": "text"}]
    elements.append(r)
    # ~ size*0.62*max_line_len wide, size*1.25*n_lines tall
    tw, th = measure(full, size)
    elements.append(text(text_id, x + (w - tw) / 2, y + (h - th) / 2,
                         tw, th, full, size, stroke,
                         "center", "middle", 1, container_id=id))
```

Free-floating `text()` is still correct for things that are not a shape's
label: zone headers, arrow captions, and diagram titles.

## Avoiding crisscrossed arrows

A few diagonal lines between adjacent boxes is normal. It becomes unreadable
when many-to-one or long-distance edges — aggregator inputs, dashboard feeds,
anything skipping two or more zones — cut diagonally across unrelated boxes.

Fix this with **margin bus lanes**, not by nudging coordinates:

1. Make the canvas wider than the content. Reserve `CONTENT_W` for normal row
   centering and keep the strip out to `CANVAS_W` empty.
2. Give each long-distance edge its own vertical lane `x` in that strip.
3. Exit the source through its **bottom** if a sibling sits to its right in the
   same row — travelling right would cross that sibling. Exit through the
   **right** only when the source is rightmost or alone in its row.
4. Travel down the private lane. Nothing else lives out there, so it is clear
   by construction.
5. Re-enter the destination through its **top**, jogging horizontally only in
   the empty gap *above* the destination row — never at the row's own
   mid-height, which would cross its siblings.

```python
def bus(elements, boxes, src_id, dst_id, lane_x, color,
        exit_side="right", dash="dashed"):
    s, d = boxes[src_id], boxes[dst_id]
    sx, sy = (bottom(s) if exit_side == "bottom" else right(s))
    dcx, dtop = top(d)
    gap_y = dtop - 15  # inter-zone gap above the destination row, never mid-row
    pts = [[0, 0],
           [lane_x - sx, 0],
           [lane_x - sx, gap_y - sy],
           [dcx - sx, gap_y - sy],
           [dcx - sx, dtop - sy]]
    elements.append(arrow(f"bus_{src_id}_{dst_id}", sx, sy, dcx, dtop,
                          color, 1, points=pts, dash=dash))
```

Lines crossing other *lines* inside the lane is fine — that is what a bus is.
What you are eliminating is lines crossing *boxes*.

## Geometric verification

Do not eyeball the result. After generating, walk every arrow's polyline
segments against every rect's bounding box and flag any segment passing
through a rect it does not connect to. Zero hits means no crisscross.

```python
def crossings(elements):
    rects = [e for e in elements if e["type"] == "rectangle"]
    hits = []
    for a in (e for e in elements if e["type"] == "arrow"):
        endpoints = {a.get("startBinding", {}).get("elementId"),
                     a.get("endBinding", {}).get("elementId")}
        for p0, p1 in zip(a["points"], a["points"][1:]):
            x0, y0 = a["x"] + p0[0], a["y"] + p0[1]
            x1, y1 = a["x"] + p1[0], a["y"] + p1[1]
            for r in rects:
                if r["id"] in endpoints:
                    continue
                if _segment_hits_box(x0, y0, x1, y1, r):
                    hits.append((a["id"], r["id"]))
    return hits
```

Reuse whatever `rect`, `text`, `arrow`, and `measure` helpers already exist in
the repo's generators rather than rewriting them. Elements need a unique `id`,
`seed`, and `versionNonce`, plus a fractional `index` for z-ordering.
