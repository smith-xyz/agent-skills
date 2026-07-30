# Validation Stages

Detailed procedure for stages 2 through 4 of GHSA triage.

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
