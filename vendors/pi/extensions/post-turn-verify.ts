/**
 * Post-Turn Verify Extension
 *
 * After the agent settles, detects changed file extensions via git and runs
 * language-appropriate checks (cargo, go vet, tsc, ruff/mypy).
 * Failures are injected as a follow-up message so the agent can fix them.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { resolve } from "path";

async function changedExts(pi: ExtensionAPI, cwd: string): Promise<Set<string>> {
  const { stdout } = await pi.exec("git", ["diff", "--name-only", "HEAD"], { cwd });
  const exts = new Set<string>();
  for (const line of stdout.split("\n")) {
    const dot = line.lastIndexOf(".");
    if (dot !== -1) exts.add(line.slice(dot + 1));
  }
  return exts;
}

async function runCheck(
  pi: ExtensionAPI,
  label: string,
  cmd: string,
  args: string[],
  cwd: string,
): Promise<string> {
  const { stdout, stderr, code } = await pi.exec(cmd, args, { cwd }).catch((e: Error) => ({
    stdout: "",
    stderr: e.message,
    code: 1,
    killed: false,
  }));
  if (code !== 0) {
    const out = (stdout + stderr).trim().split("\n").slice(0, 30).join("\n");
    return `[${label}]\n${out}`;
  }
  return "";
}

export default function (pi: ExtensionAPI) {
  pi.on("agent_settled", async (_event, ctx) => {
    const cwd = ctx.cwd ?? resolve(".");
    const exts = await changedExts(pi, cwd).catch(() => new Set<string>());
    if (exts.size === 0) return;

    const errors: string[] = [];

    if (exts.has("rs")) {
      errors.push(await runCheck(pi, "cargo check", "cargo", ["check"], cwd));
      if (!errors.some(Boolean))
        errors.push(await runCheck(pi, "clippy", "cargo", ["clippy", "--", "-D", "warnings"], cwd));
      if (!errors.some(Boolean))
        errors.push(await runCheck(pi, "cargo test", "cargo", ["test"], cwd));
    }

    if (exts.has("go")) {
      errors.push(await runCheck(pi, "go vet", "go", ["vet", "./..."], cwd));
      if (!errors.some(Boolean))
        errors.push(
          await runCheck(pi, "go test", "go", ["test", "./...", "-count=1", "-short"], cwd),
        );
    }

    if (exts.has("ts") || exts.has("tsx") || exts.has("js") || exts.has("jsx")) {
      const { stdout: pkgMgr } = await pi
        .exec("ls", ["pnpm-lock.yaml", "bun.lock", "bun.lockb"], { cwd })
        .catch(() => ({ stdout: "" }));
      let tscCmd = "npx";
      let tscArgs = ["tsc", "--noEmit"];
      if (pkgMgr.includes("pnpm-lock.yaml")) {
        tscCmd = "pnpm";
        tscArgs = ["tsc", "--noEmit"];
      } else if (pkgMgr.includes("bun.lock")) {
        tscCmd = "bun";
        tscArgs = ["run", "tsc", "--noEmit"];
      }
      const { code: hasTsConfig } = await pi
        .exec("test", ["-f", "tsconfig.json"], { cwd })
        .catch(() => ({ code: 1 }));
      if (hasTsConfig === 0) {
        errors.push(await runCheck(pi, "typecheck", tscCmd, tscArgs, cwd));
      }
    }

    if (exts.has("py")) {
      errors.push(await runCheck(pi, "ruff check", "ruff", ["check", "."], cwd));
      const { code: hasCfg } = await pi
        .exec("test", ["-f", "pyproject.toml"], { cwd })
        .catch(() => ({ code: 1 }));
      if (hasCfg === 0) {
        errors.push(await runCheck(pi, "mypy", "mypy", ["."], cwd));
      }
    }

    const failures = errors.filter(Boolean).join("\n\n").trim();
    if (!failures) return;

    const trimmed = failures.length > 3000 ? failures.slice(0, 3000) + "\n…" : failures;
    pi.sendUserMessage(
      `Post-turn verification failed. Fix before continuing:\n\n${trimmed}`,
      { deliverAs: "followUp" },
    );
  });
}
