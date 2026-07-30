#!/usr/bin/env bash
# Mechanical rubric checks. Run from a skills catalog directory.
#
# Lives here rather than in SKILL.md because the R6 pattern necessarily
# contains the very path prefixes it searches for, which would make the skill
# body fail its own audit.
set -uo pipefail

# Home-anchored paths only. A repo-relative '.cursor/hooks.json' is legitimate
# vendor documentation; '~/.cursor/skills/x' breaks under a different vendor.
R6_PATTERN='(/Users/|/home/|~/\.[a-z]+/|~/[a-z]+/)'

printf "%-24s %5s %-5s %-5s %-5s %-5s\n" SKILL LINES R1 R4 R5 R6
for d in */; do
  n="${d%/}"; f="$n/SKILL.md"
  [ -f "$f" ] || continue
  lines=$(wc -l < "$f" | tr -d ' ')
  r1=$(grep -qi 'use when' "$f" && echo pass || echo FAIL)
  r4=$([ "$lines" -le 120 ] && echo pass || echo FAIL)
  r5=$(grep -qi '^## Done when' "$f" && echo pass || echo FAIL)
  # A skill may declare an explicit, reviewable exception:
  #   <!-- r6-ok: reason -->   (must start at column 0)
  if grep -q '^<!-- r6-ok:' "$f"; then
    r6="ok*"
  else
    r6=$(grep -rqE "$R6_PATTERN" "$f" && echo FAIL || echo pass)
  fi
  printf "%-24s %5s %-5s %-5s %-5s %-5s\n" "$n" "$lines" "$r1" "$r4" "$r5" "$r6"
done

echo
echo "ok* = declared R6 exception (<!-- r6-ok: ... -->); review these deliberately."
echo
echo "R7 candidates (skills sharing a trigger word in their description):"
for d in */; do
  n="${d%/}"; f="$n/SKILL.md"
  [ -f "$f" ] || continue
  # Description field only: from `description:` to the next top-level YAML key.
  awk '/^description:/{d=1} d && !/^description:/ && /^[a-zA-Z_-]+:/{exit} d' "$f" \
    | tr 'A-Z' 'a-z' \
    | grep -oE '\b(review|triage|verify|plan|research|scan|synthesize|diagram|commit|audit)\b' \
    | sort -u | sed "s/^/$n /"
done | awk '{k[$2]=k[$2]" "$1} END{for(t in k){n=split(k[t],a," "); if(n>1) print "  "t":"k[t]}}' | sort
