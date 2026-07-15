import type { ArtifactPlugin, PluginContext, PluginResult } from "../../src/plugin.ts";
import { loadConfig, defaultConfigPath } from "./config.ts";
import { fetchGitHubPullRequests } from "./github-client.ts";
import { fetchGitLabMergeRequests } from "./gitlab-client.ts";
import {
  ensureOpenPrsTable,
  markStaleOpenPrs,
  openPrExists,
  upsertOpenPr,
} from "./pr-store.ts";
import type { OpenPrRecord, PrSource } from "./types.ts";

async function syncSource(
  ctx: PluginContext,
  source: PrSource,
  prs: OpenPrRecord[],
  lastSynced: string,
  result: PluginResult
): Promise<void> {
  const activeIds = new Set<string>();

  for (const pr of prs) {
    activeIds.add(pr.id);
    try {
      const existed = openPrExists(ctx.db, pr.id);
      upsertOpenPr(ctx.db, pr, lastSynced);
      result.synced!++;
      if (existed) {
        result.updated!++;
      } else {
        result.created!++;
      }
    } catch (error) {
      result.errors.push(`${pr.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  result.closed! += markStaleOpenPrs(ctx.db, source, activeIds, lastSynced);
}

const plugin: ArtifactPlugin = {
  name: "gh-sync",
  description: "Sync open PRs from GitHub/GitLab for IDE visibility",

  async run(ctx: PluginContext): Promise<PluginResult> {
    const configPath = (ctx.args.config as string) ?? defaultConfigPath(ctx.workspaceRoot);
    const config = loadConfig(configPath);
    const result: PluginResult = {
      synced: 0,
      created: 0,
      updated: 0,
      closed: 0,
      errors: [],
    };

    ensureOpenPrsTable(ctx.db);
    const lastSynced = new Date().toISOString();

    if (config.github) {
      try {
        const prs = await fetchGitHubPullRequests(config.github);
        await syncSource(ctx, "github", prs, lastSynced, result);
      } catch (error) {
        result.errors.push(`github: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (config.gitlab) {
      try {
        const prs = await fetchGitLabMergeRequests(config.gitlab);
        await syncSource(ctx, "gitlab", prs, lastSynced, result);
      } catch (error) {
        result.errors.push(`gitlab: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  },
};

export default plugin;
