---
name: jira
description: Jira REST API patterns - search, auth, JQL. Use when integrating with Jira or when a skill needs to fetch or manage Jira issues.
---

# Jira

Jira REST API integration for fetching and managing issues.

**Skill Dependencies:** `credentials`

## Auth

Jira Cloud uses **Basic auth** with Atlassian account email + API token (not Bearer):

```text
Authorization: Basic $(echo -n "${JIRA_EMAIL}:${JIRA_API_TOKEN}" | base64)
Content-Type: application/json
```

Credential: `JIRA_EMAIL` (env) + `JIRA_API_TOKEN` (env or keychain).

## Env Vars

| Var              | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| JIRA_HOST        | Base URL (e.g. `https://your-domain.atlassian.net`), no trailing slash      |
| JIRA_EMAIL       | Atlassian account email (for Basic auth)                                    |
| JIRA_PROJECT     | Project key (e.g. `PROJ`)                                                   |
| JIRA_API_TOKEN   | API token (required; set via env, or from keychain in profile)              |

## Scripts

| Script                             | Purpose                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `fetch-issues.sh [days] [project]` | Fetch issues assigned to current user, updated in last N days |

**Output format:** First line is status (`JIRA_OK`, `JIRA_EMPTY`, `JIRA_DISABLED`, `JIRA_ERROR:...`). When `JIRA_OK`, subsequent lines are `key|summary|status|updated`.

## API Patterns

**Search (Jira Cloud):** Use v3 search/jql (v2 search removed).

```text
POST /rest/api/3/search/jql
{"jql": "...", "maxResults": 50, "fields": ["key", "summary", "status", "issuetype", "parent", "updated"]}
```

**Common JQL:**

- `project = PROJ` - filter by project
- `assignee = currentUser()` - current user's issues
- `updated >= -7d` - recently updated
- `status in (Open, "In Progress")` - by status

**Get single issue:** `GET /rest/api/3/issue/PROJ-123`

**Custom fields:** Jira instances vary. Use `GET /rest/api/3/field` to discover field IDs (Epic Link, Epic Name, etc.).

## Keychain (macOS)

Service `jira-api-token`, account = `JIRA_HOST` (URL). Use `-w "$VAR"` (not stdin); piping to `-w -` can store "-".

**Create (one-time):**

```bash
read -s -r JIRA_API_TOKEN && security add-generic-password -s "jira-api-token" -a "$JIRA_HOST" -w "$JIRA_API_TOKEN" -U && unset JIRA_API_TOKEN
```

**Profile:**

```bash
export JIRA_API_TOKEN=$(security find-generic-password -s "jira-api-token" -a "$JIRA_HOST" -w 2>/dev/null)
```

## Notes

- Rate limits vary by instance
- Token may have project-level restrictions
- Use `sed '$d'` not `head -n -1` for portable "all but last line" (macOS compatibility)
