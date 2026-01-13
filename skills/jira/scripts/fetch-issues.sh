#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../credentials/scripts/credentials.sh"

DAYS=${1:-7}
PROJECT="${2:-$JIRA_PROJECT}"

if [[ -z "$JIRA_HOST" ]] || [[ -z "$JIRA_EMAIL" ]]; then
  echo "JIRA_DISABLED"
  exit 0
fi

if [[ -z "$PROJECT" ]]; then
  echo "JIRA_DISABLED"
  exit 0
fi

JIRA_API_TOKEN=$(get_credential "jira-api-token" "$JIRA_HOST" "JIRA_API_TOKEN") || {
  echo "JIRA_ERROR:credential_unavailable" >&2
  exit 1
}

JQL="project = $PROJECT AND assignee = currentUser() AND updated >= -${DAYS}d ORDER BY issuetype ASC, updated DESC"
URL="${JIRA_HOST%/}/rest/api/3/search/jql"
JIRA_BASIC=$(echo -n "${JIRA_EMAIL}:${JIRA_API_TOKEN}" | base64)

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$URL" \
  -H "Authorization: Basic $JIRA_BASIC" \
  -H "Content-Type: application/json" \
  -d "{\"jql\": \"$JQL\", \"maxResults\": 50, \"fields\": [\"key\", \"summary\", \"status\", \"issuetype\", \"parent\", \"updated\"]}")

HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [[ "$HTTP_CODE" -ge 400 ]]; then
  echo "JIRA_ERROR:api_$HTTP_CODE"
  echo "$HTTP_BODY" >&2
  exit 1
fi

# v3 returns issues array; may have total or only nextPageToken
ISSUES_COUNT=$(echo "$HTTP_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('issues', [])))" 2>/dev/null || echo "0")
if [[ -z "$ISSUES_COUNT" ]] || [[ "$ISSUES_COUNT" -eq 0 ]]; then
  echo "JIRA_EMPTY"
  exit 0
fi

echo "JIRA_OK"
echo "$HTTP_BODY" | python3 -c "
import json, sys
j = json.load(sys.stdin)
for i in j.get('issues', []):
    k = i.get('key', '')
    f = i.get('fields', {})
    itype = f.get('issuetype', {}).get('name', '')
    s = f.get('status', {}).get('name', '')
    u = f.get('updated', '')[:10]
    summary = (f.get('summary') or '').replace('|', '/')
    parent_key = ''
    parent = f.get('parent')
    if parent:
        parent_key = parent.get('key', '')
    print(f'{k}|{itype}|{summary}|{s}|{parent_key}|{u}')
"
