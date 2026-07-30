# hooks.json Reference

Cursor hooks fire scripts on agent events. Place `hooks.json` at `.cursor/hooks.json` in the project root.

## Schema

```json
{
  "version": 1,
  "hooks": {
    "<event>": [
      {
        "command": "<path-to-script>",
        "loop_limit": 3,
        "matcher": "<tool-name>"
      }
    ]
  }
}
```

## Events

| Event | Fires when | Stdin | Can followup |
| ------- | ----------- | ------- | ------------- |
| `stop` | Agent turn ends | `{"status": "...", "loop_count": N}` | Yes |
| `subagentStop` | Subagent completes | Subagent context | Yes |
| `preToolUse` | Before a tool call | Tool call details | Block via `decision: "block"` |
| `postToolUse` | After a tool call | Tool result | Inject `additional_context` |
| `afterFileEdit` | After a file write | `{"path": "..."}` | No |
| `beforeShellExecution` | Before shell command | Command details | Block or modify |

## Followup Protocol

Return JSON from stdout:

- `{}` — no followup, turn ends normally
- `{"followup_message": "Fix this..."}` — agent receives message and continues
- `{"decision": "block", "reason": "..."}` — block the tool call (preToolUse only)

## loop_limit

Prevents infinite retry loops. After `loop_limit` followup messages, the hook stops returning followups regardless of check results. Recommended: `3`.

## matcher (afterFileEdit / preToolUse)

Filter which tool invocations trigger the hook. E.g. `"matcher": "Write"` only fires on Write tool calls.
