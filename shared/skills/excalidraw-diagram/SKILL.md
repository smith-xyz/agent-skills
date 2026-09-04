---
name: excalidraw-diagram
description: >-
  Create and regenerate Excalidraw system-design diagrams, preferring Python
  gen-*.py emitters over hand-written JSON. Use when drawing architecture,
  flows, trust boundaries, or lifecycle diagrams, or when a workflow needs a
  real .excalidraw deliverable rather than a "TODO: draw this".
---

# Excalidraw Diagram

Produce a real diagram file. Never leave "TODO: draw this" behind.

## When to diagram

Spatial system design: components, data and control flow, trust boundaries,
lifecycle stages, ownership. Prefer a diagram over long architecture prose —
if you are about to write four paragraphs describing what connects to what,
draw it instead.

## Layout

```text
~/agent-workspace/<domain>/<repo>/diagrams/<area>/
  <name>.excalidraw     # the required deliverable
  gen-<name>.py         # preferred for anything non-trivial
```

Scratch diagrams live under `~/agent-workspace/`, not in the repo. If a
diagram belongs in the tracked tree, the user says so explicitly — then
mirror the repo's existing docs layout. Never drop diagrams at the root of a
contributable repo.

If `~/agent-workspace/<domain>/<repo>/profiles/excalidraw-diagram.md` exists,
read it first for the repo's preferred output path and reference generators.

## Procedure

1. Identify the one job the diagram does. Two jobs means two diagrams, or two
   clearly separated frames.
2. Name every box with a real system name taken from the source material — not
   a placeholder or a generic role.
3. Choose the generation approach:
   - **Under ~15 elements** — write the `.excalidraw` JSON directly.
   - **Anything larger** — write `gen-<name>.py` that emits Excalidraw JSON
     v2, run it, and keep both files. Regenerate by re-running the script.
     Do not hand-edit large JSON.
4. Apply the craft rules in
   [references/generator-patterns.md](references/generator-patterns.md):
   bound text for every box label, and margin bus lanes for long-distance
   edges.
5. Verify geometrically, not by eye (see below).
6. Report the file path.

## Minimal file shape

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [],
  "appState": { "gridSize": null, "viewBackgroundColor": "#ffffff" },
  "files": {}
}
```

## The two rules that matter most

- **Every box label is bound text**, never a free-floating text element
  positioned on top of a shape. Free text drifts out of sync the moment
  anyone moves the shape in the app.
- **Long-distance edges travel in reserved margin lanes**, not diagonally
  across unrelated boxes. Lines crossing other lines is fine; lines crossing
  *boxes* is the defect.

Both techniques, with working code, are in
[references/generator-patterns.md](references/generator-patterns.md).

## Content rules

- One job per diagram, or clearly separated frames.
- Show edges that carry meaning: data flow, trust boundary, sequence. Cut
  decorative edges.
- Real system names only.

## Done when

The `.excalidraw` file exists and opens without error; every box label is bound
text; the geometric check reports zero arrow-through-box crossings; and, for
non-trivial diagrams, the `gen-*.py` script reproduces the file when re-run.
