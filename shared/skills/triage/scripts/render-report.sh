#!/usr/bin/env bash
# Render scored triage JSON into a markdown report.
# Input: scored JSON (from score.sh). Output: markdown to stdout.
set -euo pipefail

INPUT="${1:--}"
REPORT_TYPE="${2:-issues}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

jq -r --arg ts "$TIMESTAMP" --arg type "$REPORT_TYPE" '
"# Triage Report: \($type) — \($ts)\n" +
"\n## Run Summary\n" +
"- Items: \(.items | length)\n" +
"- Repo: \(.repo // "unknown")\n" +
"- Since: \(.since // "full scan")\n" +
"\n## Items by Score\n" +
"| Score | # | Title | Recommendation | Command |\n" +
"|-------|---|-------|---------------|----------|\n" +
(.items | map(
  "| \(.score | floor) | #\(.number) | \(.title[:60]) | \(.recommendation // "REVIEW") | `gh \(if $type == "prs" then "pr" else "issue" end) view \(.number)` |"
) | join("\n")) +
"\n\n## Action Items\n" +
"\n### Needs Review\n" +
([ .items[] | select((.recommendation // "REVIEW") == "REVIEW") |
  "- [ ] #\(.number) \(.title[:60]) — score \(.score | floor)\n  `gh \(if $type == "prs" then "pr" else "issue" end) view \(.number)`"
] | join("\n")) +
"\n\n### Recommend Close\n" +
([ .items[] | select(.recommendation == "CLOSE") |
  "- [ ] #\(.number) \(.title[:60])\n  `gh \(if $type == "prs" then "pr close" else "issue close" end) \(.number) -c \"Closing: \(.close_reason // "stale/superseded")\"`"
] | join("\n")) +
if $type == "prs" then
  "\n\n### Merge-Ready\n" +
  ([ .items[] | select(.recommendation == "MERGE-READY") |
    "- [ ] #\(.number) \(.title[:60])\n  `gh pr merge \(.number)`"
  ] | join("\n"))
else "" end +
"\n\n### Needs Reproduction\n" +
([ .items[] | select(.recommendation == "NEEDS-REPRO") |
  "- [ ] #\(.number) \(.title[:60]) — reproduce via\n  `gh issue view \(.number) --json title,body,comments`"
] | join("\n"))
' < "${INPUT}"
