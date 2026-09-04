---
name: notes-synthesize
description: >-
  Synthesize and lean the ~/agent-workspace notes tree: classify notes,
  soft-archive fat, promote system design into diagrams, and write a synthesis
  log. Use when synthesizing notes, trimming note sprawl, triaging notes, or
  cleaning up accumulated markdown. Logs backlog candidates but never writes
  them.
---

# Notes Synthesize

Prevent note sprawl. Keep prose lean; push visuals into diagrams.

**Hard rule:** never create new research memos or long-form notes here. This
skill only classifies, trims, archives, or promotes what already exists. To
research something, use `deep-research` instead.

**Out of scope:** moving work into a backlog. Log candidates only.

**Depends on:** the `excalidraw-diagram` skill, whenever a note needs a picture.

## Destinations

All paths are under `~/agent-workspace/<domain>/<repo>/` (see
`agent-artifacts` for domain/repo resolution).

| Kind | Path |
| ------ | ------ |
| Live notes | `~/agent-workspace/<domain>/<repo>/notes/<area>/` |
| Unclassified | `~/agent-workspace/<domain>/<repo>/notes/_review/` |
| Soft-archive | `~/agent-workspace/<domain>/<repo>/notes/_archive/<YYYY-MM-DD>/<original-relative-path>` |
| Diagrams | `~/agent-workspace/<domain>/<repo>/diagrams/<area>/`, via `excalidraw-diagram` |
| Synthesis log | `~/agent-workspace/<domain>/<repo>/notes/_synthesis/<YYYY-MM-DD>.md` |

Archiving preserves the original path beneath the date folder:

`.../notes/case-bot/design/foo.md`
→ `.../notes/_archive/2026-07-10/case-bot/design/foo.md`

If `~/agent-workspace/<domain>/<repo>/profiles/notes-synthesize.md` exists,
read it first — it may remap these destinations.

## Classification

| Verdict | Meaning | Action |
| --------- | --------- | -------- |
| `keep-lean` | Still useful as prose | Rewrite shorter; drop fluff and dupes |
| `diagram` | System design needs a picture | Run `excalidraw-diagram`; leave a pointer note |
| `archive` | Dead, superseded, or duplicate | Soft-move under `_archive/<date>/` |
| `stay` | Meeting or scratch note that earns its keep | Trim lightly or leave alone |
| `backlog-candidate` | Actionable work | Record in the log only — do not file it |

`diagram` plus `keep-lean` is a valid pair: a lean pointer alongside the
diagram. Otherwise prefer a single verdict per file.

## Procedure

1. **Scope.** Whole tree, one area, one path, or `_review/`. Default to the
   path the user named.
2. **Inventory.** List markdown in scope. Skip `_archive/` and `_synthesis/`
   unless explicitly asked to reprocess them.
3. **Classify — no writes yet.** Read enough of each file to judge. Separate
   durable facts from scratch. Flag duplicates. Spatial or structural design
   becomes `diagram`; actionable work becomes `backlog-candidate`.
4. **Present the digest and stop.**

   ```markdown
   | File | Verdict | Destination / diagram | Notes |
   |------|---------|-----------------------|-------|
   ```

   Wait for an explicit approval or edits. **Do not proceed without it.**
5. **Apply**, in this order:
   1. Diagrams first, via `excalidraw-diagram`.
   2. Rewrite survivors lean: facts, decisions, open questions, links.
   3. Soft-archive by moving. Never hard-delete.
   4. For diagrammed design, reduce the live note to a pointer plus whatever
      is genuinely non-visual; archive the prose the diagram replaced.
6. **Write the synthesis log** to
   `~/agent-workspace/<domain>/<repo>/notes/_synthesis/<YYYY-MM-DD>.md`
   with sections: Scope, Actions table, Diagrams created or updated,
   Soft-archived, Backlog candidates, Still open.

## Lean note standard

**Keep:** decisions, constraints, open questions that still matter, pointers to
diagrams and canonical docs, meeting outcomes.

**Cut:** restated repo context, superseded exploratory drafts, duplicate copies,
meeting transcripts.

## Principles

- Synthesize; do not research.
- Be opinionated. Prefer archiving over "maybe useful someday."
- The human gate before apply is mandatory, not advisory.
- Diagrams are deliverables, not TODOs.
- Never write to a backlog, never edit contributable repo files, never push.

## Done when

Every in-scope file has a verdict recorded in the synthesis log, all approved
moves are applied, no file was hard-deleted, and the log exists at its dated
path.
