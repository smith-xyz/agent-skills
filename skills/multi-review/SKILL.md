---
name: multi-review
description: Launch parallel sub-agents to review code from different perspectives (security, architecture, quality, perf), then reconcile. Use when user asks for code review, multi-perspective review, or thorough review.
disable-model-invocation: true
---

# Multi-Review

Parallel sub-agent review from multiple perspectives, reconciled into unified findings.

## Parameters

| Param | Values | Default |
| ----- | ------ | ------- |
| perspectives | security, code-quality, architecture, skeptic, ux, perf | security, code-quality, architecture |
| count | 2–5 | 3 |
| consensus | true, false | true |

Parse from user: "security and perf review", "have 3 agents review", "no consensus just raw findings".

## Perspective focus

| Perspective | Focus |
| ----------- | ----- |
| security | Injection, auth bypass, secrets exposure, supply chain, input validation |
| code-quality | Readability, duplication, naming, error handling, test coverage gaps |
| architecture | Coupling, separation of concerns, extensibility, dependency direction |
| skeptic | Challenge assumptions, find edge cases, question necessity of changes |
| ux | Accessibility, responsiveness, user flow, error states, loading states |
| perf | Time complexity, memory allocation, N+1 queries, unnecessary computation |

## Workflow

1. Identify target: current file, staged changes, PR URL, or whatever user points at.
2. Launch `count` sub-agents in parallel, one per perspective. All readonly.
3. Collect findings.
4. If consensus: reconcile into unified summary with action items ranked by severity.
5. If not: return each perspective's findings separately.

## Output

Per-perspective section (2–5 bullet findings each), then unified summary if consensus is on. Reference specific files/lines.

## Rules

- Sub-agents are readonly.
- Skip perspectives that don't apply (e.g. ux for a CLI tool).
- If all perspectives agree on no issues, say so briefly and stop.
