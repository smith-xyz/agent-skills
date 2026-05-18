---
name: fact-check
description: Verify claims, citations, URLs, or code assertions with per-claim verdicts. Use when user asks to fact-check, verify, sanity check, or triple check something.
disable-model-invocation: true
---

# Fact-Check

Verify claims and return per-claim verdicts with evidence.

## Parameters

| Param | Values | Default |
| ----- | ------ | ------- |
| depth | quick, thorough | quick |

Parse from user: "triple check" / "verify thoroughly" → thorough. "quick check" / "sanity check" → quick.

## Depth

- quick: single-pass verification, sequential. Stop early if all confirmed.
- thorough: 2–3 sub-agents independently verify the same claims, then reconcile disagreements.

## Claim verification

| Type | How to verify |
| ---- | ------------- |
| URL/citation | Fetch URL. Confirm title, authors, content match the claim. |
| Code assertion | Read the referenced code. Confirm behavior matches claim. |
| Factual claim | Web search authoritative sources. Cross-reference multiple. |
| Statistical claim | Find original source. Confirm number and context. |

## Output

Per-claim table:

| Claim | Verdict | Evidence |
| ----- | ------- | -------- |
| ... | confirmed / unconfirmed / false | Brief supporting evidence or contradiction |

If thorough: note where sub-agents disagreed and resolution.

## Rules

- Never assume a claim is true.
- A 404 is a finding, not an error.
- For code assertions: read actual code, don't rely on comments or docs alone.
- If verification is impossible (no network, private repo), say so per-claim.
