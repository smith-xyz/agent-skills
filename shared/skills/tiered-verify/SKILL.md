---
name: tiered-verify
description: >-
  Config-driven multi-tier verification. Runs unit, contract, integration, UX,
  and smoke checks from a verify.config.yaml. Use when verifying a change after
  implementation, before merge, during e2e validation, or when asked to run the
  full check suite. Complements the verifier agent.
---

# Tiered Verify

Generic verification skill. Domain scenarios live in project/workspace config — not in this skill.

## Config

Place `verify.config.yaml` at the repo root, or at `<repo>/.agent/verify.config.yaml`:

```yaml
name: my-project
tiers:
  - id: unit
    script: scripts/verify-tier1.sh
    description: Per-repo unit/lint/typecheck
  - id: contract
    script: scripts/verify-tier2-contracts.sh
    description: Cross-repo type/API drift
  - id: integration
    script: scripts/verify-tier3-e2e.sh
    description: e2e / Playwright
  - id: ux
    script: scripts/verify-tier4-ux.sh
    description: Journey + a11y + visual regression
  - id: smoke
    script: scripts/smoke-test.sh
    description: Health endpoints
full_regression: scripts/verify-all-complete.sh
```

## Protocol

1. Locate `verify.config.yaml` (prompt path, repo root, or `<repo>/.agent/`)
2. Run requested tiers (default: all) via their scripts from the config's base dir
3. Categorize failures: unit | contract | integration | ux-journey | a11y | visual | deploy
4. Report: exact error, repo, file, suggested fix
5. Re-verify after fix — full scenario, not just the failing test

## Feedback Loop

```text
run tier → fail → categorize → report → fix → re-run tier → next tier
```

## UX Failure Severity (when ux tier present)

| Category | Severity |
| ---------- | ---------- |
| Dead end, data incoherence | Critical |
| Missing state, confusing UX | High |
| Visual regression, a11y violation | Medium |
| Stale data without indicator | Low |

UX failures require screenshots as evidence.

## Relationship to other tools

- **verifier agent** — LLM-driven skeptic pass; load this skill for the scripted tiers
- **verify-gate** — post-turn hooks (compile/lint/test between turns); this skill is task-level
- Domain scripts (e.g. CASEboard verify scripts) stay in project/workspace — this skill only orchestrates

## Done when

Every configured tier either passed or is reported with its exact failing command and output. No tier was silently skipped — a tier with no config is reported as unconfigured, not as passing.
