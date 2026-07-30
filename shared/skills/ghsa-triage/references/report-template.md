# GHSA Report Template

## Artifact: `ghsa-report.md`

One flat table, one row per advisory (not per cluster). Detail sections append below the
table only once a row enters the Validated/Adversarial/Fix-reviewed stages.

```markdown
# GHSA Triage — <owner/repo> — <date>

| GHSA | Sev | Summary | Prelim | Validated | Adversarial | Fix reviewed | Disposition | Notes |
|------|-----|---------|--------|-----------|-------------|--------------|-------------|-------|
| GHSA-xqq5 | critical | orderBy/groupBy col SQLi | x |  |  |  |  | canonical |
| GHSA-236h | none | orderBy col SQLi (dup) | x | - | - | - | closed-dupe | dupe_of: GHSA-xqq5 |
```

**Columns:**

- **Prelim** — fetched + quality-checked. Always `x` after stage 1.
- **Validated** — code-complexity → impact-repro → security-assess complete.
- **Adversarial** — red-team/defender pass complete (opt-in).
- **Fix reviewed** — security-review of a candidate fix diff complete.
- **Disposition** — `confirmed` / `already-fixed` / `cannot-confirm` / `not-applicable` /
  `disputed` / `closed-dupe`. Set once the relevant stage renders a verdict.
- **Notes** — `dupe_of: GHSA-xxxx`, `maintainer: disputes`, `split recommended`, quality flags.

Rows marked `dupe_of:` get `-` in Validated/Adversarial/Fix reviewed — no further pipeline
work unless the user overrides.

Detail sections (one per validated advisory) append below the table:

````markdown
