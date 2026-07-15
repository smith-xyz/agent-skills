#!/bin/bash
set -e

REPO="${1:-typeorm/typeorm}"
PR_NUMBER="$2"

if [ -z "$PR_NUMBER" ]; then
  echo "Usage: $0 [repo] <pr_number>" >&2
  exit 1
fi

PR=$(gh pr view "$PR_NUMBER" \
  --repo "$REPO" \
  --json number,title,body,author,labels,createdAt,updatedAt,reviewDecision,isDraft,headRefName,baseRefName,additions,deletions,changedFiles,url,state,mergeable,commits \
  | jq '{
    number,
    title,
    url: .url,
    author: .author.login,
    state: .state,
    base: .baseRefName,
    head: .headRefName,
    is_draft: .isDraft,
    review_decision: .reviewDecision,
    mergeable: .mergeable,
    additions: .additions,
    deletions: .deletions,
    changed_files: .changedFiles,
    commits: .commits | length,
    created: .createdAt,
    updated: .updatedAt,
    labels: [.labels[].name],
    body: (.body | if length > 2000 then .[:2000] + "\n...(truncated)" else . end)
  }')

DIFF_FILE=$(mktemp)
trap 'rm -f "$DIFF_FILE"' EXIT
gh pr diff "$PR_NUMBER" --repo "$REPO" 2>/dev/null | head -c 50000 > "$DIFF_FILE" || true

REVIEWS=$(gh api "repos/$REPO/pulls/$PR_NUMBER/reviews" \
  --jq '[.[] | {
    author: .user.login,
    state: .state,
    body: (.body // "" | if length > 500 then .[:500] + "...(truncated)" else . end),
    submitted_at: .submitted_at
  }]' 2>/dev/null || echo '[]')

COMMENTS=$(gh api "repos/$REPO/pulls/$PR_NUMBER/comments" \
  --jq '[.[] | {
    author: .user.login,
    path: .path,
    line: .line,
    body: (.body | if length > 500 then .[:500] + "...(truncated)" else . end),
    created_at: .created_at
  }]' 2>/dev/null || echo '[]')

ISSUE_COMMENTS=$(gh api "repos/$REPO/issues/$PR_NUMBER/comments" \
  --jq '[.[] | {
    author: .user.login,
    body: (.body | if length > 500 then .[:500] + "...(truncated)" else . end),
    created_at: .created_at
  }]' 2>/dev/null || echo '[]')

CHECKS_RAW=$(gh pr checks "$PR_NUMBER" --repo "$REPO" --json name,state,conclusion 2>/dev/null || true)
if [ -z "$CHECKS_RAW" ]; then
  CHECKS='[]'
else
  CHECKS=$(echo "$CHECKS_RAW" | jq '[.[] | {name, state, conclusion}]' 2>/dev/null || echo '[]')
fi

jq -n \
  --argjson pr "$PR" \
  --rawfile diff "$DIFF_FILE" \
  --argjson reviews "$REVIEWS" \
  --argjson review_comments "$COMMENTS" \
  --argjson issue_comments "$ISSUE_COMMENTS" \
  --argjson checks "$CHECKS" \
  '{pr: $pr, diff: $diff, reviews: $reviews, review_comments: $review_comments, issue_comments: $issue_comments, checks: $checks}'
