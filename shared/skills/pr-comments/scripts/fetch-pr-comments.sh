#!/usr/bin/env bash
set -euo pipefail

BOT_PATTERN=""
BOTS_MODE=0
FORMAT="json"

# Known automated review bots (used with --bots)
KNOWN_BOTS='qodo|coderabbit|codium|copilot|github-actions\[bot\]|sonarcloud|deepsource'

usage() {
  cat <<EOF
Usage: $(basename "$0") [--format json|text] [--bot PATTERN | --bots]

Fetch PR review + issue comments for the current branch's PR.

Options:
  --format json|text   Output format (default: json)
  --bot PATTERN        Only comments whose author matches PATTERN (case-insensitive)
  --bots               Only known review bots (qodo, coderabbit, codium, …)
  -h, --help           Show this help

Default: all comments (human + bot).

Requires: gh CLI authenticated, branch with an open PR.
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --format) FORMAT="$2"; shift 2 ;;
    --bot) BOT_PATTERN="$2"; shift 2 ;;
    --bots) BOTS_MODE=1; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ "$BOTS_MODE" -eq 1 && -n "$BOT_PATTERN" ]]; then
  echo "Error: use --bot or --bots, not both" >&2
  exit 1
fi

if [[ "$BOTS_MODE" -eq 1 ]]; then
  BOT_PATTERN="$KNOWN_BOTS"
fi

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

REVIEW_COMMENTS=$(gh api "repos/$REPO/pulls/$PR_NUM/comments" --paginate 2>/dev/null || echo "[]")
ISSUE_COMMENTS=$(gh api "repos/$REPO/issues/$PR_NUM/comments" --paginate 2>/dev/null || echo "[]")

FILTERED=$(jq -n \
  --arg pattern "$BOT_PATTERN" \
  --arg pr_num "$PR_NUM" \
  --arg pr_url "$PR_URL" \
  --arg pr_title "$PR_TITLE" \
  --arg branch "$BRANCH" \
  --argjson review "$REVIEW_COMMENTS" \
  --argjson issue "$ISSUE_COMMENTS" \
  '
  def author_ok:
    if ($pattern | length) == 0 then true
    else (.user.login | test($pattern; "i"))
    end;

  def known_bot:
    (.user.login | test("qodo|coderabbit|codium|copilot|sonarcloud|deepsource|github-actions"; "i"));

  {
    pr: { number: ($pr_num | tonumber), url: $pr_url, title: $pr_title, branch: $branch },
    inline_comments: [
      $review[] | select(author_ok) | {
        id: .id,
        author: .user.login,
        is_bot: known_bot,
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
      $issue[] | select(author_ok) | {
        id: .id,
        author: .user.login,
        is_bot: known_bot,
        body: .body,
        created_at: .created_at,
        url: .html_url
      }
    ]
  }
  | .by_author = (
      ([.inline_comments[].author, .summary_comments[].author] | unique) as $authors
      | [ $authors[] as $a | {
          author: $a,
          inline: [.inline_comments[] | select(.author == $a)],
          summary: [.summary_comments[] | select(.author == $a)]
        }]
    )
  | .stats = {
      inline_count: (.inline_comments | length),
      summary_count: (.summary_comments | length),
      authors: ([.inline_comments[].author, .summary_comments[].author] | unique),
      bot_authors: ([.inline_comments[], .summary_comments[] | select(.is_bot) | .author] | unique),
      files_mentioned: ([.inline_comments[].path] | unique)
    }
  ')

if [[ "$FORMAT" == "text" ]]; then
  echo "$FILTERED" | jq -r '
    "PR #\(.pr.number): \(.pr.title)",
    "Branch: \(.pr.branch)",
    "URL: \(.pr.url)",
    "",
    "=== PR COMMENTS ===",
    "Inline: \(.stats.inline_count) | Summary: \(.stats.summary_count)",
    "Authors: \(.stats.authors | join(", "))",
    (if (.stats.bot_authors | length) > 0 then "Bots: \(.stats.bot_authors | join(", "))" else empty end),
    "Files: \(.stats.files_mentioned | join(", "))",
    "",
    (.by_author[] |
      "--- \(.author) ---",
      (if (.summary | length) > 0 then
        (.summary[] | "[\(.created_at)] (summary)\n\(.body)\n")
      else empty end),
      (if (.inline | length) > 0 then
        (.inline[] | "\(.path):\(.line // "?") — \(.body)\n")
      else empty end)
    )
  '
else
  echo "$FILTERED"
fi
