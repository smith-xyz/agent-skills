#!/usr/bin/env bash
# Render a source agent markdown file for a target vendor.
# Source uses model_tier (fast | standard | inherit); output uses vendor-specific model values.
set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") --vendor <cursor|agents|claude|codex> --source <file.md> --dest <path>

Source frontmatter: name, description, model_tier, readonly (optional).
Body becomes prompt / developer_instructions.
EOF
  exit 1
}

vendor=""
source=""
dest=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --vendor) vendor="$2"; shift 2 ;;
    --source) source="$2"; shift 2 ;;
    --dest) dest="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

[[ -n "$vendor" && -n "$source" && -n "$dest" ]] || usage
[[ -f "$source" ]] || { echo "Error: source not found: $source" >&2; exit 1; }

case "$vendor" in
  cursor|agents|claude|codex|vscode) ;;
  *) echo "Error: vendor must be cursor, agents, claude, codex, or vscode" >&2; exit 1 ;;
esac

extract_frontmatter() {
  awk '/^---$/{ if (++n == 1) next; if (n == 2) exit } n == 1' "$1"
}

extract_body() {
  awk '/^---$/{ if (++n == 2) { p = 1; next } } p' "$1"
}

fm_field() {
  local fm=$1 key=$2
  echo "$fm" | awk -v k="$key" '
    $0 ~ "^" k ": " {
      sub("^" k ": ", "")
      gsub(/^"/, "")
      gsub(/"$/, "")
      print
      exit
    }
  '
}

model_for_tier() {
  local tier=$1
  case "$vendor:$tier" in
    cursor:fast|agents:fast|vscode:fast) echo "fast" ;;
    cursor:standard|agents:standard|vscode:standard) echo "composer-2.5" ;;
    cursor:inherit|agents:inherit|cursor:*|agents:*|vscode:inherit|vscode:*) echo "inherit" ;;

    claude:fast) echo "haiku" ;;
    claude:standard) echo "sonnet" ;;
    claude:inherit|claude:*) echo "inherit" ;;

    codex:fast) echo "gpt-5.4-mini" ;;
    codex:standard) echo "gpt-5.4" ;;
    codex:inherit|codex:*) echo "" ;;
  esac
}

frontmatter=$(extract_frontmatter "$source")
body=$(extract_body "$source")

name=$(fm_field "$frontmatter" "name")
description=$(fm_field "$frontmatter" "description")
tier=$(fm_field "$frontmatter" "model_tier")
readonly=$(fm_field "$frontmatter" "readonly")

[[ -n "$name" && -n "$description" ]] || {
  echo "Error: source must define name and description: $source" >&2
  exit 1
}

tier=${tier:-inherit}
model=$(model_for_tier "$tier")
readonly=${readonly:-false}

mkdir -p "$(dirname "$dest")"

render_markdown() {
  local out=$1
  {
    echo "---"
    echo "name: $name"
    echo "description: $description"
    if [[ -n "$model" && "$model" != "inherit" ]]; then
      echo "model: $model"
    elif [[ "$model" == "inherit" ]]; then
      echo "model: inherit"
    fi
    if [[ "$readonly" == "true" ]]; then
      echo "readonly: true"
    fi
    echo "---"
    echo "$body"
  } > "$out"
}

render_codex() {
  local out=$1
  {
    echo "name = \"$name\""
    echo "description = \"$description\""
    if [[ -n "$model" ]]; then
      echo "model = \"$model\""
    fi
    if [[ "$readonly" == "true" ]]; then
      echo "sandbox_mode = \"read-only\""
    fi
    echo 'developer_instructions = """'
    echo "$body"
    echo '"""'
  } > "$out"
}

case "$vendor" in
  codex) render_codex "$dest" ;;
  *) render_markdown "$dest" ;;
esac
