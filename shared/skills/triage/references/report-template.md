# Triage Report Template

## Run Summary

- Items processed: N
- New since last run: N
- Unchanged: N

## Issues by Score

| Score | # | Title | Labels | Effort | Recommendation | Command |
|-------|---|-------|--------|--------|---------------|---------|

## PRs by Score

| Score | # | Title | CI | Review | Recommendation | Command |
|-------|---|-------|----|----|---------------|---------|

## Action Items

### Needs Review

- [ ] #N title — `gh issue view N` / `gh pr view N`

### Recommend Close

- [ ] #N title — `gh issue close N -c "reason"` / `gh pr close N -c "reason"`

### Merge-Ready (PRs only)

- [ ] #N title — `gh pr merge N`

### Needs Reproduction

- [ ] #N title — reproduce via `gh issue view N --json title,body,comments`

### Duplicate Groups (PRs)

- Issue #N: PRs #A, #B — winner #A
  - `gh pr close B -c "Closing in favor of #A which addresses #N."`
