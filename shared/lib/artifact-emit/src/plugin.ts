import { existsSync, readdirSync } from "fs";
import { join } from "path";
import type { DbHandle } from "./db.ts";

export interface PluginContext {
  workspaceRoot: string;
  dbPath: string;
  db: DbHandle;
  args: Record<string, string | boolean>;
}

export interface PluginResult {
  synced?: number;
  created?: number;
  updated?: number;
  closed?: number;
  errors: string[];
}

export interface ArtifactPlugin {
  name: string;
  description: string;
  run(ctx: PluginContext): Promise<PluginResult>;
}

function pluginsDirs(): string[] {
  const candidates = [
    join(import.meta.dir, "..", "plugins"),
    join(process.env.HOME ?? "", "rh", "smith-xyz", "agent-skills", "shared", "lib", "artifact-emit", "plugins"),
  ];
  return candidates.filter(existsSync);
}

export async function discoverPlugins(): Promise<Map<string, string>> {
  const plugins = new Map<string, string>();

  for (const dir of pluginsDirs()) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !plugins.has(entry.name)) {
        const indexPath = join(dir, entry.name, "index.ts");
        if (existsSync(indexPath)) {
          plugins.set(entry.name, indexPath);
        }
      }
    }
  }
  return plugins;
}

export async function loadPlugin(pluginPath: string): Promise<ArtifactPlugin> {
  const mod = await import(pluginPath);
  if (!mod.default || typeof mod.default.run !== "function") {
    throw new Error(`Plugin at ${pluginPath} must export default with { name, run }`);
  }
  return mod.default as ArtifactPlugin;
}
