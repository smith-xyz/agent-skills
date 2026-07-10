#!/usr/bin/env bash
set -euo pipefail

BOT_PATTERN="qodo"
FORMAT="json"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--format json|text] [--bot PATTERN]

Fetch Qodo bot comments from the current branch's PR.

Options:
  --format json|text   Output format (default: json)
  --bot PATTERN        Username match pattern (default: qodo, case-insensitive)
  -h, --help           Show this help

Requires: gh CLI authenticated, branch with an open PR.
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --format) FORMAT="$2"; shift 2 ;;
    --bot) BOT_PATTERN="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI not found" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "Error: jq not found" >&2
  exit 1
fi

PR_JSON=$(gh pr view --json number,url,title,headRefName 2>/dev/null) || {
  echo "Error: no PR found for current branch" >&2
  exit 1
}

PR_NUM=$(echo "$PR_JSON" | jq -r '.number')
PR_URL=$(echo "$PR_JSON" | jq -r '.url')
PR_TITLE=$(echo "$PR_JSON" | jq -r '.title')
BRANCH=$(echo "$PR_JSON" | jq -r '.headRefName')

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')

# Fetch inline review comments (code-level)
REVIEW_COMMENTS=$(gh api "repos/$REPO/pulls/$PR_NUM/comments" --paginate 2>/dev/null || echo "[]")

# Fetch issue comments (top-level, includes summary)
ISSUE_COMMENTS=$(gh api "repos/$REPO/issues/$PR_NUM/comments" --paginate 2>/dev/null || echo "[]")

# Filter and structure
FILTERED=$(jq -n \
  --arg pattern "$BOT_PATTERN" \
  --arg pr_num "$PR_NUM" \
  --arg pr_url "$PR_URL" \
  --arg pr_title "$PR_TITLE" \
  --arg branch "$BRANCH" \
  --argjson review "$REVIEW_COMMENTS" \
  --argjson issue "$ISSUE_COMMENTS" \
  '{
    pr: { number: ($pr_num | tonumber), url: $pr_url, title: $pr_title, branch: $branch },
    inline_comments: [
      $review[] | select(.user.login | test($pattern; "i")) | {
        id: .id,
        path: .path,
        line: (.line // .original_line),
        side: .side,
        body: .body,
        diff_hunk: .diff_hunk,
        created_at: .created_at,
        url: .html_url,
        in_reply_to: .in_reply_to_id
      }
    ],
    summary_comments: [
      $issue[] | select(.user.login | test($pattern; "i")) | {
        id: .id,
        body: .body,
        created_at: .created_at,
        url: .html_url
      }
    ]
  }
  | .stats = {
      inline_count: (.inline_comments | length),
      summary_count: (.summary_comments | length),
      files_mentioned: ([.inline_comments[].path] | unique)
    }
  ')

if [[ "$FORMAT" == "text" ]]; then
  echo "$FILTERED" | jq -r '
    "PR #\(.pr.number): \(.pr.title)",
    "Branch: \(.pr.branch)",
    "URL: \(.pr.url)",
    "",
    "=== QODO COMMENTS ===",
    "Inline: \(.stats.inline_count) | Summary: \(.stats.summary_count)",
    "Files: \(.stats.files_mentioned | join(", "))",
    "",
    if (.summary_comments | length) > 0 then
      "--- Summary Comments ---",
      (.summary_comments[] | "[\(.created_at)]\n\(.body)\n")
    else empty end,
    if (.inline_comments | length) > 0 then
      "--- Inline Comments ---",
      (.inline_comments[] | "\(.path):\(.line // "?") — \(.body)\n")
    else empty end
  '
else
  echo "$FILTERED"
fi
