import { resolve, dirname } from "path";
import { existsSync, mkdirSync } from "fs";

/** Resolve triage artifact dir from env. Never falls back into a project source tree. */
export function triageDir(): string {
  const dir = process.env.TRIAGE_DIR;
  if (!dir) {
    throw new Error(
      "TRIAGE_DIR is required (e.g. $HOME/agent-workspace/<domain>/<repo>/triage)"
    );
  }
  return resolve(dir);
}

export function triageDb(): string {
  return resolve(triageDir(), "triage.db");
}

export function triageRepo(): string {
  const repo = process.env.TRIAGE_REPO;
  if (!repo) {
    throw new Error("TRIAGE_REPO is required (e.g. owner/name)");
  }
  return repo;
}

export function ensureTriageDir(): string {
  const dir = triageDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function scriptsDir(): string {
  return dirname(new URL(import.meta.url).pathname);
}
