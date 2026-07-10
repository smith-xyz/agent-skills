#!/usr/bin/env bash
# Deterministic scoring for triage items.
# Input: JSON with items array (from agent output merged with fetch data).
# Output: same JSON with score field added to each item.
set -euo pipefail

INPUT="${1:--}"

jq '
def severity_mult:
  if . == "critical" then 10
  elif . == "high" then 5
  elif . == "medium" then 2
  elif . == "low" then 1
  else 0
  end;

def priority_from_labels:
  [.[] | select(startswith("priority:"))] | first // "" |
  ltrimstr("priority:");

.items |= [.[] | . + {
  score: (
    ((.reaction_count // 0) * 2) +
    (.comment_count // 0) +
    ((.labels // []) | priority_from_labels | severity_mult)
  ) * ((.confidence // 1) | if . == 0 then 1 else . end)
}] | .items |= sort_by(-.score)
' < "${INPUT}"
