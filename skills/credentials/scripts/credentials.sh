#!/bin/bash

get_credential() {
  local service="$1"
  local account="$2"
  local env_var="$3"

  if [[ -n "${!env_var:-}" ]]; then
    echo "${!env_var}"
    return 0
  fi

  echo "No credential found. Set: export ${env_var}='YOUR_TOKEN'" >&2
  echo "Best practice: store in keychain, then export in your profile for agent contexts." >&2
  echo "Agents cannot access the keychain; use env var when running via agent/sandbox." >&2
  echo "" >&2
  echo "Store in keychain (for interactive use):" >&2
  case "$(uname -s)" in
    Darwin)
      echo "  echo -n 'YOUR_TOKEN' | security add-generic-password -s '$service' -a '$account' -w - -U" >&2
      echo "  export ${env_var}=\$(security find-generic-password -s '$service' -a '$account' -w 2>/dev/null)" >&2
      ;;
    Linux)
      echo "  echo -n 'YOUR_TOKEN' | secret-tool store --label='$service' service '$service' account '$account'" >&2
      echo "  export ${env_var}=\$(secret-tool lookup service '$service' account '$account' 2>/dev/null)" >&2
      ;;
  esac
  return 1
}
