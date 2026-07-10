-- Delta query: returns issues and PRs needing (re)triage.
-- Agent-scoped: an item needs triage per-agent if:
--   1. No triage_log entry exists for this agent, OR
--   2. Item updated after most recent triage_log entry for this agent, OR
--   3. (Issues) new comments arrived after the most recent triage for this agent

-- Issues needing triage (agent-scoped via ---AGENT--- placeholder)
SELECT
  i.number,
  i.title,
  i.body,
  i.author,
  i.state,
  i.created_at,
  i.updated_at,
  i.comment_count,
  i.reaction_count,
  i.has_linked_pr,
  COALESCE(
    (SELECT json_group_array(il.label) FROM issue_labels il WHERE il.issue_number = i.number),
    '[]'
  ) AS labels_json,
  COALESCE(
    (SELECT json_group_array(json_object('author', ic.author, 'body', ic.body, 'created_at', ic.created_at))
     FROM issue_comments ic
     WHERE ic.issue_number = i.number
       AND (last_triage.triaged_at IS NULL OR ic.created_at > last_triage.triaged_at)
     ORDER BY ic.created_at DESC
     LIMIT 5),
    '[]'
  ) AS recent_comments_json,
  last_triage.triaged_at AS last_triaged_at,
  last_triage.status AS last_triage_status,
  CASE
    WHEN last_triage.triaged_at IS NULL THEN 'new'
    WHEN i.updated_at > last_triage.triaged_at THEN 'updated'
    WHEN EXISTS (
      SELECT 1 FROM issue_comments ic
      WHERE ic.issue_number = i.number
        AND ic.created_at > last_triage.triaged_at
    ) THEN 'new_comments'
    ELSE 'unchanged'
  END AS delta_reason
FROM issues i
LEFT JOIN (
  SELECT item_number, triaged_at, status
  FROM triage_log
  WHERE item_type = 'issue'
    AND agent = ?
    AND id IN (
      SELECT MAX(id) FROM triage_log
      WHERE item_type = 'issue' AND agent = ?
      GROUP BY item_number
    )
) last_triage ON last_triage.item_number = i.number
WHERE i.state = 'open'
  AND (
    last_triage.triaged_at IS NULL
    OR i.updated_at > last_triage.triaged_at
    OR EXISTS (
      SELECT 1 FROM issue_comments ic
      WHERE ic.issue_number = i.number
        AND ic.created_at > last_triage.triaged_at
    )
  )
ORDER BY i.reaction_count DESC, i.comment_count DESC;

---SEPARATOR---

-- PRs needing triage (agent-scoped)
SELECT
  p.number,
  p.title,
  p.body,
  p.author,
  p.state,
  p.base_branch,
  p.head_branch,
  p.is_draft,
  p.review_decision,
  p.ci_status,
  p.additions,
  p.deletions,
  p.changed_files,
  p.linked_issue,
  p.created_at,
  p.updated_at,
  COALESCE(
    (SELECT json_group_array(pl.label) FROM pr_labels pl WHERE pl.pr_number = p.number),
    '[]'
  ) AS labels_json,
  last_triage.triaged_at AS last_triaged_at,
  last_triage.status AS last_triage_status,
  CASE
    WHEN last_triage.triaged_at IS NULL THEN 'new'
    WHEN p.updated_at > last_triage.triaged_at THEN 'updated'
    ELSE 'unchanged'
  END AS delta_reason
FROM prs p
LEFT JOIN (
  SELECT item_number, triaged_at, status
  FROM triage_log
  WHERE item_type = 'pr'
    AND agent = ?
    AND id IN (
      SELECT MAX(id) FROM triage_log
      WHERE item_type = 'pr' AND agent = ?
      GROUP BY item_number
    )
) last_triage ON last_triage.item_number = p.number
WHERE p.state = 'open'
  AND (
    last_triage.triaged_at IS NULL
    OR p.updated_at > last_triage.triaged_at
  )
ORDER BY p.updated_at DESC;

---SEPARATOR---

-- All open PRs with linked issues (for duplicate detection — not delta-filtered)
SELECT
  p.number,
  p.title,
  p.body,
  p.author,
  p.state,
  p.base_branch,
  p.head_branch,
  p.is_draft,
  p.review_decision,
  p.ci_status,
  p.additions,
  p.deletions,
  p.changed_files,
  p.linked_issue,
  p.created_at,
  p.updated_at,
  COALESCE(
    (SELECT json_group_array(pl.label) FROM pr_labels pl WHERE pl.pr_number = p.number),
    '[]'
  ) AS labels_json
FROM prs p
WHERE p.state = 'open'
  AND p.linked_issue IS NOT NULL
ORDER BY p.linked_issue, p.updated_at DESC;
