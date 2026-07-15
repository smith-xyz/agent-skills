# Artifact Emit Scripts

## session-end-hook.sh

Cursor hook that fires on `stop` (agent turn complete). Outputs a prompt reminding agents to:
- Update artifacts they touched
- Emit suggestions for schema improvements
- Create links between related artifacts

### Setup

The hook is registered in `<workspace>/.cursor/hooks.json` under the `stop` event. It runs automatically at the end of each agent turn.

### How it works

The script returns a `followup_message` JSON payload that Cursor injects into the agent context. It does NOT run artifact-emit directly — it prompts the agent to do so if relevant. This keeps the agent in control of what gets emitted.

