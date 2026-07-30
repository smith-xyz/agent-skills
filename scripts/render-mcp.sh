#!/usr/bin/env bash
# Render vendor-specific MCP configs from the canonical mcp/mcp.json.
#
# Usage: render-mcp.sh <vendor> [--dest <path>]
#   vendor: cursor | claude | vscode | codex | opencode
#   --dest: override output path (default: stdout)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANONICAL="$SCRIPT_DIR/../shared/mcp/mcp.json"

die() { echo "error: $*" >&2; exit 1; }

[[ -f "$CANONICAL" ]] || die "canonical config not found: $CANONICAL"
command -v jq >/dev/null || die "jq required (brew install jq)"

VENDOR="${1:?Usage: render-mcp.sh <cursor|claude|vscode|codex|opencode>}"
shift

DEST=""
if [[ "${1:-}" == "--dest" ]]; then
  DEST="${2:?--dest requires a path}"
fi

output() {
  if [[ -n "$DEST" ]]; then
    mkdir -p "$(dirname "$DEST")"
    cat > "$DEST"
    echo "Wrote $VENDOR MCP config → $DEST" >&2
  else
    cat
  fi
}

case "$VENDOR" in
  cursor|claude)
    # Both use { "mcpServers": { ... } } format
    jq '.' "$CANONICAL" | output
    ;;

  vscode)
    # VS Code uses { "servers": { ... } } with "type" field per server
    jq '{
      servers: (
        .mcpServers | to_entries | map({
          key: .key,
          value: (
            if .value.command then
              { type: "stdio" } + .value
            elif .value.url then
              { type: "http" } + .value
            else
              .value
            end
          )
        }) | from_entries
      )
    }' "$CANONICAL" | output
    ;;

  codex)
    # Codex uses TOML: [mcp_servers.<name>] with command/args/url/http_headers
    jq -r '
      .mcpServers | to_entries[] | (
        "\n[mcp_servers.\(.key)]",
        if .value.command then
          "command = \(.value.command | @json)",
          if .value.args then
            "args = \(.value.args | @json)"
          else empty end,
          if .value.env then
            (.value.env | to_entries[] | "\n[mcp_servers.\(.key).env]\n\(.key) = \(.value | @json)")
          else empty end
        elif .value.url then
          "url = \(.value.url | @json)",
          if .value.headers then
            (
              "http_headers = {" +
              ([.value.headers | to_entries[] | "\(.key) = \(.value | @json)"] | join(", ")) +
              "}"
            )
          else empty end
        else empty end
      )
    ' "$CANONICAL" | output
    ;;

  opencode)
    # OpenCode uses { "mcp": { "<name>": { "type": "local"|"remote", ... } } }
    # - Local servers: "type":"local", "command" merges command+args into array
    # - Remote servers: "type":"remote", "url", optional "headers"
    # - Env var syntax: ${VAR} → {env:VAR}
    jq '{
      mcp: (
        .mcpServers | to_entries | map({
          key: .key,
          value: (
            if .value.command then
              {
                type: "local",
                command: ([.value.command] + (.value.args // []))
              } + (if .value.env then { environment: .value.env } else {} end)
            elif .value.url then
              {
                type: "remote",
                url: .value.url
              } + (
                if .value.headers then
                  { headers: (.value.headers | to_entries | map({
                      key: .key,
                      value: (.value | gsub("\\$\\{(?<v>[^}]+)}"; "{env:\(.v)}"))
                    }) | from_entries)
                  }
                else {}
                end
              )
            else
              .value
            end
          )
        }) | from_entries
      )
    }' "$CANONICAL" | output
    ;;

  *)
    die "unknown vendor: $VENDOR (expected cursor|claude|vscode|codex|opencode)"
    ;;
esac
