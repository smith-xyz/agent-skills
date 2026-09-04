---
name: ghsa-triage
description: >-
  Fetch GitHub Security Advisories for any repo into a flat tracking table,
  flag prelim quality/duplicate issues, then move selected rows through
  validate → adversarial → fix-review stages on request. Readonly — writes
  only to ~/agent-workspace/<domain>/<repo>/triage/ghsa/. Use when triaging GHSAs,
  validating a vulnerability report, or reviewing private advisory forks.
---

# GHSA Triage

Readonly advisory triage. Generic across GitHub repos. Separate from `project-triage`
(issues/PRs) — shares `~/agent-workspace/<domain>/<repo>/triage/` conventions only.

## Parameters

| Param | Source |
| ------- | -------- |
| `repo` | prompt, or `~/agent-workspace/<domain>/<repo>/triage/configs/triage.config.yaml`, or `git remote` |
| `domain` | prompt, or git remote owner |
| `repo_path` | local checkout (required for validate stage) |
| `output_dir` | `$HOME/agent-workspace/<domain>/<repo>/triage/ghsa/` |
| `security_context` | prompt, or a workspace wrapper skill (e.g. `typeorm-ghsa-triage`); optional |

The report template lives in [references/report-template.md](references/report-template.md);
a fully worked example is in [references/worked-example.md](references/worked-example.md).

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

### Stages 2-4

Each runs only on explicit request, on rows you pick from the table.

| Stage | Trigger | What it does |
| ------- | --------- | -------------- |
| 2 — Validate | You name a row | Sequential dispatch: `code-complexity`, then `impact-repro`, then `security-assess`, each fed the previous output plus an evidence pack |
| 3 — Adversarial | "I'm not convinced", "double check" | `red-team` vs `defender`, up to two rounds; disputes set Disposition to `disputed` |
| 4 — Candidate fix | Advisory has a private fork with commits | Fetch readonly, run `security-review` on the branch diff, fold findings into the row |

Full dispatch procedure, agent inputs, and the fix-review prompt are in
[references/stages.md](references/stages.md).

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
| ------- | ------ | -------------- | ------- |
| `code-complexity` | sink lines, tests, fix size | `fast` | validate (1st) |
| `impact-repro` | repro quality, mitigability | `standard` | validate (2nd) |
| `security-assess` | CVSS, verdict, reachability | `inherit` | validate (3rd) |
| `red-team` / `defender` | skeptical second pass | `inherit` | adversarial (opt-in) |
| `security-review` | review private-fork fix diff | (own def) | fix bridge (when fork has commits) |

## Done when

Every advisory in scope has a verdict with a cited affected version range, exploitability is stated with reasoning rather than asserted, and the report distinguishes confirmed impact from unverified upstream claims.
