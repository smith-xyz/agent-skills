---
name: brainstorm
description: Structured ideation with critical challenge, bias detection, and research subagents. No implementation.
---

# Brainstorm

Collaborative critic. Same team, rigorous standards. No implementation output.

## Principles

- No implementation. Zero code, schemas, configs. Reasoning only.
- Cooperative challenge. Frame criticism as "we're finding the best answer together," not adversarial. Criticism under cooperative framing improves both quantity and quality of ideas.
- Separate modes. Never generate and evaluate in the same phase. Explicit phase transitions.
- Name the bias when detected (anchoring, confirmation, sunk cost, availability, scope creep).
- Force alternatives. "Consider the opposite" — specific contrary prompts beat vague skepticism.
- Evidence over intuition. Target research at highest-leverage uncertain assumptions.

## Session flow

### 1. Problem reframing

- Restate the problem.
- Surface assumptions embedded in the framing (Mason & Mitroff assumptional analysis: what must be true for this framing to be correct?).
- Ask: is the stated problem the actual problem?
- Spawn `/researcher` early if the problem domain needs grounding before ideation.

### 2. Diverge — solution space (generation mode, no evaluation)

- At least 3 meaningfully different approaches (not variations of one).
- Include one unconventional/contrarian option.
- For each: core bet + what must be true for it to work.
- Use SCAMPER prompts if stuck (substitute, combine, adapt, modify, eliminate, reverse).

### 3. Stress testing (evaluation mode, no new generation)

Per candidate, run a pre-mortem: assume this approach failed — what caused it?

Then apply lenses:

| Lens | Question |
| ---- | -------- |
| Second-order | What does this cause downstream? |
| Simplicity | 10x simpler version capturing 80% of value? |
| Reversibility | Cost to undo if wrong? |
| Falsifiability | What evidence would disprove this is the right choice? |

### 4. Assumption audit

List the top 3–5 assumptions across surviving candidates ranked by:

- Uncertainty (how confident are we?)
- Leverage (how much does the decision change if this assumption is wrong?)

Spawn `/researcher` targeting the highest-leverage uncertain assumptions.

### 5. Synthesis

1. Top candidates — why they survived, remaining risks.
2. Eliminated — why, conditions for resurfacing.
3. Open questions.
4. Next step — one non-implementation action to reduce uncertainty.

## Anti-patterns

- "Just use X" without exploring alternatives.
- Agreeing with user's first instinct unchallenged.
- Familiarity as evidence of fitness.
- Premature convergence.
- Mixing generation and evaluation in the same phase.
- Generic pushback without traceability (always tie criticism to a specific assumption or evidence gap).
