---
name: deep-research
description: >-
  Iterative deep research on any topic. Launches a background subagent that runs
  a multi-round loop: decompose, scout, deepen, synthesize, gap-analyze, then
  loops until convergence or interrupt. Use when asked to research, deep-dive,
  investigate, survey, or explore a topic in depth.
---

# Deep Research

Launch a background subagent that iteratively researches a topic and writes a
research memo, updated after each round. Runs until convergence or interrupt.

## Parameters

| Param        | Default                                  | Meaning                                |
| ------------ | ---------------------------------------- | -------------------------------------- |
| `topic`      | required                                 | What to research                       |
| `max_rounds` | 3                                        | Hard ceiling before forced convergence |
| `output`     | `.agent/research/<slug>-<YYYY-MM-DD>.md` | Memo path, repo-relative               |

The output lives under `.agent/` so it stays out of the repo's tracked tree.
If the repo defines `.agent/profiles/deep-research.md`, read it first — it may
override the output path or pin preferred sources.

## Procedure

1. Resolve `topic`, `max_rounds`, and `output`.
2. Build the research brief from
   [references/research-brief.md](references/research-brief.md), substituting
   the parameters. The subagent cannot read this skill file, so the brief must
   be self-contained.
3. Launch a background subagent with the brief:

   ```text
   Task(subagent_type: "general-purpose", run_in_background: true,
        description: "Deep research: <topic>", prompt: <brief>)
   ```

4. Report to the user: the memo path, that it runs in the background, and that
   they can interrupt or redirect it.
5. Stop. Do not summarize findings in chat — the memo is the deliverable.

## Convergence

The subagent stops when any of these holds:

- Two consecutive low-yield rounds.
- All sub-questions reach `[confirmed]`.
- `max_rounds` is reached — remaining gaps get noted in the memo.

Three rounds is almost always enough. The ceiling exists to prevent bloat, not
to cut research short.

## Redirecting a run

| User says                  | Action                                                |
| -------------------------- | ----------------------------------------------------- |
| "keep going" / "go deeper" | Resume from gap analysis, another round               |
| "go deeper on X"           | Resume with X as a high-priority sub-question         |
| "stop"                     | Interrupt; the memo already reflects completed rounds |

## Rules

- **Memo budget: 120 lines.** Bottom line, themes, open questions, sources,
  and a round log. No round-by-round narrative.
- **Cite before claiming.** Findings without a source do not go in the memo.
- **Counter-evidence is mandatory.** Every round runs at least one
  disconfirming search. Weight of evidence, not false balance.
- **Label inference separately from sourced fact.**
- **Stay scoped.** Topic drift is the primary failure mode. Log tangents as
  open questions instead of chasing them.
- **Prefer primary sources**: specs and RFCs, then official docs and release
  notes, then peer-reviewed papers, then engineering blogs, then derivative
  content. Flag any claim resting only on derivative sources.

## Done when

The memo exists at `output`, its status line reads `complete`, every theme
carries a confidence tag, and each claim cites a numbered source.
