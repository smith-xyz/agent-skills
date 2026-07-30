/**
 * OpenCode adapter for agent-gate.
 *
 * Shells out to the Go binary for SessionStart / PreToolUse / Stop decisions
 * and exposes route/override as first-class tools so claims bind to the
 * OpenCode session id.
 *
 * Fail-open: a missing or crashed binary never bricks an editing session.
 */
import { tool } from "@opencode-ai/plugin"
import type { Plugin } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const GATE_BIN =
  process.env.AGENT_GATE_BIN ||
  join(homedir(), ".agent-skills", "bin", "agent-gate")

type HookResult = {
  ok: boolean
  exitCode: number
  stdout: string
  stderr: string
  additionalContext?: string
  denyReason?: string
}

function gateMissing(): boolean {
  try {
    return !existsSync(GATE_BIN)
  } catch {
    return true
  }
}

function runGate(
  event: string,
  payload: Record<string, unknown>,
  env: Record<string, string | undefined> = {},
): Promise<HookResult> {
  return new Promise((resolve) => {
    if (gateMissing()) {
      resolve({ ok: true, exitCode: 0, stdout: "{}", stderr: "" })
      return
    }

    const child = spawn(GATE_BIN, ["hook", event], {
      env: {
        ...process.env,
        ...env,
        OPENCODE_SESSION_ID:
          env.OPENCODE_SESSION_ID ||
          String(payload.session_id || payload.sessionId || ""),
      },
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString()
    })
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString()
    })

    child.on("error", () => {
      // Fail open — binary missing or not executable.
      resolve({ ok: true, exitCode: 0, stdout: "{}", stderr: "" })
    })

    child.on("close", (code) => {
      const exitCode = code ?? 0
      let additionalContext: string | undefined
      let denyReason: string | undefined
      try {
        const parsed = JSON.parse(stdout.trim() || "{}") as {
          hookSpecificOutput?: {
            additionalContext?: string
            permissionDecision?: string
            permissionDecisionReason?: string
          }
          agent_message?: string
          permission?: string
        }
        additionalContext =
          parsed.hookSpecificOutput?.additionalContext || parsed.agent_message
        if (
          parsed.hookSpecificOutput?.permissionDecision === "deny" ||
          parsed.permission === "deny"
        ) {
          denyReason =
            parsed.hookSpecificOutput?.permissionDecisionReason ||
            parsed.agent_message ||
            stderr.trim() ||
            "denied by agent-gate"
        }
      } catch {
        // ignore parse errors — fail open unless exit 2
      }
      if (exitCode === 2 && !denyReason) {
        denyReason = stderr.trim() || "denied by agent-gate"
      }
      resolve({
        ok: exitCode !== 2 && !denyReason,
        exitCode,
        stdout,
        stderr,
        additionalContext,
        denyReason,
      })
    })

    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
  })
}

function runCli(
  args: string[],
  env: Record<string, string | undefined> = {},
): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    if (gateMissing()) {
      resolve({
        ok: false,
        output: `agent-gate binary not found at ${GATE_BIN}. Run: make install-gates`,
      })
      return
    }
    const child = spawn(GATE_BIN, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let out = ""
    child.stdout.on("data", (d: Buffer) => {
      out += d.toString()
    })
    child.stderr.on("data", (d: Buffer) => {
      out += d.toString()
    })
    child.on("error", (err) => {
      resolve({ ok: false, output: String(err) })
    })
    child.on("close", (code) => {
      resolve({ ok: (code ?? 1) === 0, output: out.trim() })
    })
  })
}

/** Extract a path from apply_patch marker lines when present. */
function pathFromPatchText(patchText: unknown): string {
  if (typeof patchText !== "string") return ""
  const m = patchText.match(
    /^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/m,
  )
  return m?.[1]?.trim() || ""
}

function buildToolInput(toolName: string, args: Record<string, unknown>) {
  const input: Record<string, unknown> = { ...args }
  const path =
    (typeof args.filePath === "string" && args.filePath) ||
    (typeof args.file_path === "string" && args.file_path) ||
    (typeof args.path === "string" && args.path) ||
    pathFromPatchText(args.patchText)
  if (path && !input.file_path) {
    input.file_path = path
  }
  if (toolName === "bash" && typeof args.command === "string") {
    input.command = args.command
  }
  return input
}

const MUTATING_TOOLS = new Set([
  "edit",
  "write",
  "apply_patch",
  "multiedit",
  "notebookedit",
])

function maybeMutating(toolName: string, args: Record<string, unknown>): boolean {
  if (MUTATING_TOOLS.has(toolName)) return true
  if (toolName === "bash" && typeof args.command === "string") {
    // Cheap pre-filter; the Go binary is the authority.
    const c = args.command.toLowerCase()
    if (c.includes(">>") || /(^|[;&|]\s*)(rm |mv |cp |tee |mkdir |touch |sed -i|git (apply|checkout|reset|clean|commit|merge|rebase)|patch )/.test(c)) {
      return true
    }
    if (/(^|[^-=])>(?!&|=|-)/.test(c)) return true
  }
  return false
}

const injectedSessions = new Set<string>()

export const AgentGatePlugin: Plugin = async ({ client, directory, worktree }) => {
  const log = async (message: string, extra?: Record<string, unknown>) => {
    try {
      await client.app.log({
        body: {
          service: "agent-gate",
          level: "info",
          message,
          extra,
        },
      })
    } catch {
      // ignore
    }
  }

  const injectCatalog = async (sessionID: string) => {
    if (!sessionID || injectedSessions.has(sessionID)) return
    injectedSessions.add(sessionID)

    const result = await runGate(
      "SessionStart",
      {
        hook_event_name: "SessionStart",
        session_id: sessionID,
        cwd: directory || worktree || process.cwd(),
      },
      { OPENCODE_SESSION_ID: sessionID },
    )

    const ctx = result.additionalContext
    if (!ctx) return

    try {
      await client.session.prompt({
        path: { id: sessionID },
        body: {
          noReply: true,
          parts: [
            {
              type: "text",
              text:
                ctx +
                "\n\nIn OpenCode, claim a skill with the `route` tool " +
                "(or `agent-gate route --skill <name> --intent \"...\"`).",
            },
          ],
        },
      })
    } catch (err) {
      await log("catalog inject failed", { error: String(err) })
    }
  }

  return {
    event: async ({ event }) => {
      const type = (event as { type?: string }).type
      if (type === "session.created" || type === "session.updated") {
        const props = (event as { properties?: { sessionID?: string; info?: { id?: string } } })
          .properties
        const sessionID = props?.sessionID || props?.info?.id
        if (sessionID) await injectCatalog(sessionID)
      }
      if (type === "session.idle" || type === "session.deleted") {
        const props = (event as { properties?: { sessionID?: string } }).properties
        const sessionID = props?.sessionID
        if (!sessionID) return
        await runGate(
          "Stop",
          {
            hook_event_name: "Stop",
            session_id: sessionID,
            cwd: directory || worktree || process.cwd(),
          },
          { OPENCODE_SESSION_ID: sessionID },
        )
        injectedSessions.delete(sessionID)
      }
    },

    "tool.execute.before": async (input, output) => {
      const toolName = String(input.tool || "").toLowerCase()
      const sessionID = String(input.sessionID || "")
      const args = (output.args || {}) as Record<string, unknown>

      if (sessionID) await injectCatalog(sessionID)

      // Inject routing contract once per mutating call path via UserPrompt-style
      // context only when we are about to gate — keeps research ungated.
      if (!maybeMutating(toolName, args)) return

      const toolInput = buildToolInput(toolName, args)
      const result = await runGate(
        "PreToolUse",
        {
          hook_event_name: "PreToolUse",
          session_id: sessionID || "no-session",
          cwd: directory || worktree || process.cwd(),
          tool_name: toolName,
          tool_input: toolInput,
        },
        { OPENCODE_SESSION_ID: sessionID },
      )

      if (result.denyReason) {
        throw new Error(result.denyReason)
      }
    },

    tool: {
      route: tool({
        description:
          "Claim an agent-gate skill route before making edits. Required for mutating work.",
        args: {
          skill: tool.schema.string().describe("Skill name from the catalog"),
          intent: tool.schema
            .string()
            .optional()
            .describe("What you are doing and why"),
        },
        async execute(args, context) {
          const session = context.sessionID || "no-session"
          const cliArgs = ["route", "--skill", args.skill, "--session", session]
          if (args.intent) cliArgs.push("--intent", args.intent)
          const result = await runCli(cliArgs, {
            OPENCODE_SESSION_ID: session,
          })
          return result.ok
            ? result.output
            : `route failed:\n${result.output}`
        },
      }),

      override: tool({
        description:
          "Grant a logged, time-boxed agent-gate override for a small sharpen-language edit.",
        args: {
          reason: tool.schema
            .string()
            .describe("Why the agent must make this edit"),
        },
        async execute(args, context) {
          const session = context.sessionID || "no-session"
          const result = await runCli(
            ["override", "--reason", args.reason, "--session", session],
            { OPENCODE_SESSION_ID: session },
          )
          return result.ok
            ? result.output
            : `override failed:\n${result.output}`
        },
      }),
    },
  }
}

export default AgentGatePlugin
