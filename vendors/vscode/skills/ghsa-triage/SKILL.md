---
name: ghsa-triage
description: >-
  Fetch GitHub Security Advisories for any repo into a flat tracking table,
  flag prelim quality/duplicate issues, then move selected rows through
  validate → adversarial → fix-review stages on request. Readonly — writes
  only to <workspace>/.triage/<domain>/<repo>/ghsa/. Use when triaging GHSAs,
  validating a vulnerability report, or reviewing private advisory forks.
---

# GHSA Triage

Readonly advisory triage. Generic across GitHub repos. Separate from `project-triage`
(issues/PRs) — shares `.triage/<domain>/<repo>/` conventions only.

## Parameters

| Param | Source |
|-------|--------|
| `repo` | prompt, or `.triage/<domain>/<repo>/configs/triage.config.yaml`, or `git remote` |
| `domain` | workspace layout or prompt |
| `repo_path` | local checkout (required for validate stage) |
| `output_dir` | `$WORKSPACE/.triage/<domain>/<repo>/ghsa/` |
| `security_context` | prompt, or a workspace wrapper skill (e.g. `typeorm-ghsa-triage`); optional |

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
## GHSA-xqq5 — orderBy/groupBy col SQLi

### Evidence pack
`validate-xqq5-pack.json` — match_count / test_hit_count

### Code Complexity
…

### Impact and Reproducibility
…

### Security Assessment
…

### Adversarial (if run)
…

### Candidate fix review (if run)
…

### Recommended actions (copy-paste for user)
```bash
# example only — never executed by the skill
gh api -X PATCH repos/<repo>/security-advisories/<ghsa_id> -f state=…
```
````

## Workflow

### Stage 1: Prelim (load-or-fetch)

1. Resolve `repo` / `domain` / `repo_path` (prompt > existing triage config > `git remote`).
   Set `output_dir`, create if missing.
2. **Check for an existing artifact** at `$output_dir/ghsa-report.md`:
   - **Exists + user named a specific GHSA/row** (e.g. "work on GHSA-r5p3", "validate the
     where-key one") → skip fetch entirely. Load that row from the existing table, jump
     straight to the stage implied by the request (usually Stage 2; Stage 3/4 if the user
     says so explicitly).
   - **Exists + user made a generic request** ("triage GHSA", "what's next", bare skill
     invoke) → present the existing table, **stop** and wait for direction. Do not re-fetch.
   - **Doesn't exist, or user explicitly asks to refresh** ("check for new advisories",
     "re-run triage", "refresh") → continue to step 3.
3. Fetch: `gh api "repos/<repo>/security-advisories" --paginate > "$output_dir/advisories.json"`.
   403/404 → report no access, stop.
4. For each advisory, extract: GHSA ID, severity, summary, state, reporter, CWEs, version
   range, fork status.
5. Flag in Notes (main-chat judgment, no subagent — batch is small):
   - **Duplicate** — same mechanism + affected function/API as another row, even without
     self-declared "duplicate of X" text. Pick the best-documented row as canonical
     (most complete root-cause explanation + broadest accurate scope); mark the rest
     `dupe_of: <canonical>`.
   - **Incomplete** — missing CWE, CVSS, or reproduction detail.
   - **Low-quality** — vague description, no code reference.
   - **Report-mill signal** — similar phrasing/timing/multiple new accounts. Note only,
     never sole grounds for dismissal.
6. **On refresh** (artifact already existed): re-run the duplicate/quality/report-mill
   pass across all rows (old + new) — cheap, no subagent cost, and lets a better-documented
   new advisory become canonical over an older one. Add new GHSA rows. **Never overwrite**
   Validated/Adversarial/Fix reviewed/Disposition for a row that already has them set —
   only Sev/Summary/Notes are prelim-owned and may change on refresh.
7. Write/update the table at `$output_dir/ghsa-report.md`, sorted severity critical > high
   > medium > low, then triage/draft before published/closed. Mark Prelim `x` for all rows.
8. Present the table and **stop** — wait for the user to pick row(s) to validate.

### Stage 2: Validate (on request, per advisory)

Sequential dispatch — do not parallelize (avoids triple full-tree reads):

1. Load the advisory (full description) + `repo_path` + `security_context`.
2. Extract search terms (API/method/file identifiers from summary + description) to
   `$output_dir/validate-<id>-terms.txt`.
3. Build an evidence pack: `rg` the terms against `src/` and `test/` in `repo_path`,
   write match/test-hit counts to `$output_dir/validate-<id>-pack.json`.
4. Dispatch `code-complexity` (Task, `readonly: true`, `subagent_type` matching agent name,
   tier as registered — **never override model**). Pass: advisory, `repo_path`,
   `security_context`, evidence pack.
5. Dispatch `impact-repro` with the above + code-complexity output.
6. Dispatch `security-assess` with the above + impact-repro output.
7. Append the detail section under the table. Update the row: Validated `x`, Disposition
   from security-assess verdict.

### Stage 3: Adversarial (opt-in, on request)

Only when the user asks for a skeptical second pass ("I'm not convinced", "double check").

1. Round 1: `red-team` (assessment outputs + pack) → `defender` (challenges).
2. Round 2: same, unless round 1 reaches full consensus.
3. Append Consensus/Disputed to the detail section. Update row: Adversarial `x`; if
   disputed, set Disposition to `disputed`.

### Stage 4: Candidate-fix bridge (when applicable)

If the advisory has `private_fork.full_name` with commits beyond its base:

1. Add remote if missing, `git fetch` (readonly).
2. Prepare so `security-review` can see branch changes (follow `review-security` skill).
3. Launch `security-review` with the prompt below, then fold the resulting
   Severity/Location/Finding table into the detail section and update the row: Fix
   reviewed `x`.

```text
Full Repository Path: <repo_path>
Diff: branch changes
Custom Instructions: Review candidate fix for <GHSA-id> (<summary>). Confirm the diff closes the described sink; flag incomplete fixes and residual injection paths.
```

If no fork or no fix commits: skip, note "no candidate fix in private fork".

### Relay

After any stage, present the updated table row(s) + what changed. Do not mutate
advisories or push branches.

## Constraints

- Readonly against source and advisory forks — no advisory edits, no publishing, no pushes.
- Writes only under `$output_dir` (may add/fetch git remotes for private forks).
- All mutating `gh`/git commands are copy-paste text for the user, never executed.
- Do not override agent `model`/`model_tier` at dispatch time.
- **Run-scoped cache, fetch/build at most once:** `advisories.json` (Stage 1) and each
  advisory's evidence pack (Stage 2 step 3). Inline their content **by value** into every
  subagent's dispatch prompt — never tell a subagent to fetch or re-scan for itself.
  Subagents rely solely on `item`/`evidence_pack` as provided; they must not call `gh api`
  for the advisory or re-run a tree-wide scan `evidence_pack` already covers.

## Agents used

| Agent | Role | `model_tier` | Stage |
|-------|------|--------------|-------|
| `code-complexity` | sink lines, tests, fix size | `fast` | validate (1st) |
| `impact-repro` | repro quality, mitigability | `standard` | validate (2nd) |
| `security-assess` | CVSS, verdict, reachability | `inherit` | validate (3rd) |
| `red-team` / `defender` | skeptical second pass | `inherit` | adversarial (opt-in) |
| `security-review` | review private-fork fix diff | (own def) | fix bridge (when fork has commits) |
