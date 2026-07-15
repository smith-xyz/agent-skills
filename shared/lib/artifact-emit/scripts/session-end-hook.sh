#!/usr/bin/env bash
# Cursor session-end hook: reminds agent to emit structured updates
set -euo pipefail

cat >/dev/null

# Check for unlinked work in jira-linked domains
unlinked_note=""
DB_PATH="${ARTIFACT_DB_PATH:-.cursor/artifacts.db}"
SCHEMAS_DIR="${ARTIFACT_SCHEMAS_DIR:-.cursor/schemas/domains}"

if [ -f "$DB_PATH" ] && command -v sqlite3 &>/dev/null; then
  # Find jira-linked domains from YAML configs
  jira_domains=""
  if [ -d "$SCHEMAS_DIR" ]; then
    for f in "$SCHEMAS_DIR"/*.yaml "$SCHEMAS_DIR"/*.yml; do
      [ -f "$f" ] || continue
      if grep -q "jira_linked: true" "$f" 2>/dev/null; then
        domain=$(grep "^domain:" "$f" | head -1 | awk '{print $2}')
        [ -n "$domain" ] && jira_domains="${jira_domains}'${domain}',"
      fi
    done
  fi

  if [ -n "$jira_domains" ]; then
    jira_domains="${jira_domains%,}"
    count=$(sqlite3 "$DB_PATH" "
      SELECT COUNT(*) FROM artifacts
      WHERE domain IN (${jira_domains})
        AND kind != 'jira-item'
        AND status != 'done'
        AND id NOT IN (SELECT from_id FROM artifact_links WHERE rel = 'tracks')
    " 2>/dev/null || echo "0")

    if [ "$count" -gt 0 ]; then
      unlinked_note="
4. **Unlinked work detected**: ${count} artifact(s) in Jira-linked domains have no \`tracks\` link. Consider:
   \`\`\`bash
   artifact emit --jira <KEY> ...   # link at emit time
   artifact link --from <id> --to jira-item/<domain>/<KEY> --rel tracks
   \`\`\`
   Or use \`--auto-jira\` to detect from branch name."
    fi
  fi
fi

prompt=$(cat <<PROMPT
Before ending this session, check if any of the following apply:

1. **Artifact updates**: If you modified or advanced work tracked in artifacts.db, update the relevant artifact(s):
   \`\`\`bash
   artifact emit --kind <kind> --domain <domain> --id <id> --title "..." --status <new-status> --last-action "<what you just did>" --next "<what's needed next>"
   \`\`\`

2. **New suggestions**: If you noticed schema gaps, missing kinds, or improvements to the structured artifact system:
   \`\`\`bash
   artifact suggest --source-skill <your-skill> --text "<suggestion>"
   \`\`\`

3. **New links**: If you discovered connections between artifacts:
   \`\`\`bash
   artifact link --from <id> --to <id> --rel <feeds-into|depends-on|tracks|dupes>
   \`\`\`
${unlinked_note}
Skip if this session didn't touch any tracked work.
PROMPT
)

jq -n --arg msg "$prompt" '{followup_message: $msg}'
