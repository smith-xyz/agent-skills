#!/usr/bin/env bash
set -euo pipefail

OWNER="${GH_PROJECT_OWNER:-@me}"
PROJECT_NUM="${GH_PROJECT_NUMBER:-}"

require_tools() {
  command -v gh &>/dev/null || { echo "Error: gh required" >&2; exit 1; }
  command -v jq &>/dev/null || { echo "Error: jq required" >&2; exit 1; }
}

resolve_project_num() {
  if [[ -n "$PROJECT_NUM" ]]; then
    return
  fi
  local projects count
  projects=$(gh project list --owner "$OWNER" --limit 20 --format json)
  count=$(echo "$projects" | jq '.projects | length')
  if [[ "$count" -eq 0 ]]; then
    echo "Error: no projects for $OWNER" >&2
    exit 1
  fi
  if [[ "$count" -eq 1 ]]; then
    PROJECT_NUM=$(echo "$projects" | jq -r '.projects[0].number')
    return
  fi
  echo "PROJECT_PICK_NEEDED"
  echo "$projects" | jq -r '.projects[] | "\(.number)\t\(.title)\t\(.url)"'
  exit 0
}

get_item() {
  local query="${GH_PROJECT_QUERY:--status:Done}" limit=30
  while [[ $# -gt 0 ]]; do
    case $1 in
      --number) PROJECT_NUM="$2"; shift 2 ;;
      --owner) OWNER="$2"; shift 2 ;;
      --query) query="$2"; shift 2 ;;
      --limit) limit="$2"; shift 2 ;;
      *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
  done

  resolve_project_num

  local meta id title status_field status_options items
  meta=$(gh project view "$PROJECT_NUM" --owner "$OWNER" --format json)
  id=$(echo "$meta" | jq -r '.id')
  title=$(echo "$meta" | jq -r '.title')
  status_field=$(gh project field-list "$PROJECT_NUM" --owner "$OWNER" --format json \
    | jq '.fields[] | select(.name == "Status")')
  status_options=$(echo "$status_field" | jq '[.options[] | {id, name}]')
  items=$(gh project item-list "$PROJECT_NUM" --owner "$OWNER" \
    --query "$query" --limit "$limit" --format json)

  jq -n \
    --arg owner "$OWNER" \
    --argjson number "$PROJECT_NUM" \
    --arg id "$id" \
    --arg title "$title" \
    --arg query "$query" \
    --arg status_field_id "$(echo "$status_field" | jq -r '.id')" \
    --argjson status_options "$status_options" \
    --argjson items_raw "$items" \
    '{
      project: {owner: $owner, number: $number, id: $id, title: $title, status_field_id: $status_field_id, status_options: $status_options},
      query: $query,
      items: [$items_raw.items[] | {id, title: (.content.title // "Untitled"), status, type: .content.type, url: .content.url}]
    }'
}

change_status() {
  local item_id="" status_name=""
  while [[ $# -gt 0 ]]; do
    case $1 in
      --item-id) item_id="$2"; shift 2 ;;
      --status) status_name="$2"; shift 2 ;;
      --number) PROJECT_NUM="$2"; shift 2 ;;
      --owner) OWNER="$2"; shift 2 ;;
      *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
  done

  [[ -n "$item_id" && -n "$status_name" ]] || {
    echo "Usage: project.sh change_status --item-id ID --status NAME" >&2
    exit 1
  }

  resolve_project_num

  local project_id status_field field_id option_id
  project_id=$(gh project view "$PROJECT_NUM" --owner "$OWNER" --format json | jq -r '.id')
  status_field=$(gh project field-list "$PROJECT_NUM" --owner "$OWNER" --format json \
    | jq '.fields[] | select(.name == "Status")')
  field_id=$(echo "$status_field" | jq -r '.id')
  option_id=$(echo "$status_field" | jq -r --arg n "$status_name" '.options[] | select(.name == $n) | .id')

  if [[ -z "$option_id" || "$option_id" == "null" ]]; then
    echo "Error: status \"$status_name\" not found. Available: $(echo "$status_field" | jq -r '[.options[].name] | join(", ")')" >&2
    exit 1
  fi

  gh project item-edit \
    --id "$item_id" --project-id "$project_id" \
    --field-id "$field_id" --single-select-option-id "$option_id" >/dev/null

  jq -n --arg item_id "$item_id" --arg status "$status_name" \
    '{item_id: $item_id, status: $status}'
}

usage() {
  cat <<EOF
Usage: $(basename "$0") <action> [options]

Actions:
  get_item      List project items (default query: -status:Done)
  change_status Set item status (--item-id, --status)

Env: GH_PROJECT_OWNER, GH_PROJECT_NUMBER, GH_PROJECT_QUERY
EOF
  exit 0
}

ACTION="${1:-}"
shift || true

case "$ACTION" in
  get_item) require_tools; get_item "$@" ;;
  change_status) require_tools; change_status "$@" ;;
  -h|--help|"") usage ;;
  *) echo "Unknown action: $ACTION" >&2; usage ;;
esac
