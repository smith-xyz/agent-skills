---
name: skill-audit
description: >-
  Audit the skill catalog against the R1-R7 rubric — triggerable, routine,
  repeatable, focused, verifiable, portable, distinct. Use when reviewing
  skills, checking skill quality, finding overlapping or stale skills, or
  before promoting reflect proposals into the catalog. Reports verdicts; fixes only on request.
---

# Skill Audit

A weak catalog turns reflection proposals into noise. Run this whenever the
catalog grows, and before accepting a batch of `reflect` drafts.

## Scope

Audit every `SKILL.md` under the canonical catalog:

```bash
reflect catalog --paths
```

Falls back to each vendor's skills directory plus this repo's `shared/skills/`.

## The rubric

| # | Criterion | Test |
| --- | ----------- | ------ |
| R1 | **Triggerable** | The `description` names *when* to invoke it, in words you would actually type. "Use when..." phrasing present. |
| R2 | **A routine** | Numbered steps, an explicit start, and an explicit stop condition. |
| R3 | **Repeatable** | Same input yields the same shape of output. Deterministic scripts beat prose. |
| R4 | **Focused** | One job. `SKILL.md` at or under 120 lines; detail lives in `references/`. |
| R5 | **Verifiable** | States its own done-condition or acceptance check. |
| R6 | **Portable** | No hardcoded workspace paths, no vendor assumptions, no dead dependencies. |
| R7 | **Distinct** | No sibling skill claims the same trigger. |

## Procedure

1. **Inventory.** List every skill with its line count and description.
2. **Score each skill** R1–R7 as `pass`, `weak`, or `fail`. Judge from the file
   itself — do not assume a skill works because its name sounds right.
3. **Run the mechanical checks** before reading any prose:

   ```bash
   bash <skill-dir>/references/checks.sh
   ```

   It scores R1, R4, R5, and R6 for every skill and lists R7 candidates. R6
   flags home-anchored paths, which break the moment a skill installs to a
   different vendor directory. Repo-relative paths are fine.

   A skill with a genuine need for a home path declares it inline:

   ```html
   <!-- r6-ok: why this path is legitimate -->
   ```

   The marker must start at column 0 to count.

   The check then reports `ok*`. Treat every `ok*` as something to re-justify,
   not something settled — that marker is how R6 quietly rots.

4. **Check R7 across the catalog, not per skill.** Build a trigger map — for
   each skill, the verbs and nouns in its description. Any two skills sharing a
   trigger phrase are an R7 conflict, and one of them must narrow or merge.
5. **Report** the verdict table and stop:

   ```markdown
   | Skill | Lines | R1 | R2 | R3 | R4 | R5 | R6 | R7 | Verdict |
   |-------|-------|----|----|----|----|----|----|----|---------|
   ```

   Verdicts: `keep`, `trim` (R4 only), `fix` (specific criteria), `merge into
   <skill>`, `delete`.
6. **Fix only what the user approves.** This skill reports by default. A
   catalog-wide rewrite without a gate is how drift gets introduced.

## Judging calls

- **R4 is a budget, not a cliff.** 130 lines with one job is `trim`; 90 lines
  doing three jobs is `fix`.
- **R7 conflicts are usually real work.** Two skills with overlapping triggers
  means the boundary was never decided. Decide it, then narrow both
  descriptions so the split is visible from the description alone.
- **A skill that only you could follow fails R3.** The reader is an agent with
  no memory of why the skill was written.
- **Prefer deleting over keeping.** An unused skill still costs catalog space
  and dilutes routing.

## Done when

Every skill in the catalog has a row in the verdict table, every `fail` names
the specific criterion and the concrete fix, and R7 conflicts are listed as
pairs with a proposed resolution.
