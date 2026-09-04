/**
 * OpenCode bridge for the Rust `reflect` engine.
 *
 * Matches OpenCode 1.x classic plugin API (`Plugin` → `Hooks.event`):
 *   https://opencode.ai/docs/plugins
 *
 * Mapping:
 *   session.created / session.updated → reflect hook session-start
 *   session.idle / session.deleted    → reflect hook stop
 *
 * Fail-open. Never throws. Never re-enters the agent loop.
 * Soft rules still come from installed AGENTS.md.
 *
 * Requires `@opencode-ai/plugin` in ~/.config/opencode/package.json
 * (same as other local TS plugins).
 */
import type { Plugin } from "@opencode-ai/plugin"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const REFLECT_BIN =
  process.env.REFLECT_BIN || join(homedir(), ".agent-skills", "bin", "reflect")

type SessionProps = {
  sessionID?: string
  info?: { id?: string }
}

function reflectMissing(): boolean {
  try {
    return !existsSync(REFLECT_BIN)
  } catch {
    return true
  }
}

/**
 * Run a reflect hook. Uses spawnSync so work finishes even when OpenCode
 * fire-and-forgets `event` handlers (does not await the returned Promise).
 */
function runHook(
  sub: "session-start" | "stop",
  payload: Record<string, unknown>,
): { stdout: string; ok: boolean } {
  if (reflectMissing()) {
    return { stdout: "{}", ok: true }
  }
  try {
    const r = spawnSync(REFLECT_BIN, ["hook", sub], {
      input: JSON.stringify(payload),
      encoding: "utf8",
      timeout: 8_000,
      env: {
        ...process.env,
        OPENCODE_SESSION_ID: String(payload.session_id || ""),
      },
    })
    if (r.error) return { stdout: "{}", ok: true }
    return { stdout: (r.stdout || "{}").trim(), ok: (r.status ?? 0) === 0 }
  } catch {
    return { stdout: "{}", ok: true }
  }
}

function sessionIDFromEvent(event: { properties?: SessionProps }): string {
  const props = event.properties
  return props?.sessionID || props?.info?.id || ""
}

function additionalContext(stdout: string): string | undefined {
  try {
    const parsed = JSON.parse(stdout || "{}") as {
      hookSpecificOutput?: { additionalContext?: string }
      additional_context?: string
    }
    return (
      parsed.hookSpecificOutput?.additionalContext || parsed.additional_context
    )
  } catch {
    return undefined
  }
}

export const ReflectPlugin: Plugin = async ({
  client,
  directory,
  worktree,
}) => {
  const cwd = directory || worktree || process.cwd()
  const seen = new Set<string>()

  const log = async (message: string, extra?: Record<string, unknown>) => {
    try {
      await client.app.log({
        body: { service: "reflect", level: "info", message, extra },
      })
    } catch {
      // ignore
    }
  }

  /** Inject session-start context once per session (OpenCode has no shell hook inject). */
  const onSessionStart = async (sessionID: string) => {
    if (!sessionID || seen.has(sessionID)) return
    seen.add(sessionID)

    const result = runHook("session-start", {
      hook_event_name: "SessionStart",
      session_id: sessionID,
      cwd,
    })

    const ctx = additionalContext(result.stdout)
    if (!ctx) return

    try {
      await client.session.prompt({
        path: { id: sessionID },
        body: {
          noReply: true,
          parts: [{ type: "text", text: ctx }],
        },
      })
    } catch (err) {
      await log("session-start inject failed", { error: String(err) })
    }
  }

  const onSessionStop = (sessionID: string) => {
    if (!sessionID) return
    runHook("stop", {
      hook_event_name: "Stop",
      session_id: sessionID,
      cwd,
      status: "idle",
    })
    seen.delete(sessionID)
  }

  return {
    event: async ({ event }) => {
      const type = event.type
      const sessionID = sessionIDFromEvent(
        event as { properties?: SessionProps },
      )

      if (type === "session.created" || type === "session.updated") {
        // Prefer sync hook work first; then optional inject (may be dropped if
        // the host does not await this handler).
        if (sessionID) await onSessionStart(sessionID)
        return
      }

      if (type === "session.idle" || type === "session.deleted") {
        onSessionStop(sessionID)
      }
    },
  }
}

export default ReflectPlugin
