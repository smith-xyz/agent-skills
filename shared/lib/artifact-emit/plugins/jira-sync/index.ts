import type { ArtifactPlugin, PluginContext, PluginResult } from "../../src/plugin.ts";
import { loadConfig, defaultConfigPath } from "./config.ts";
import { fetchIssues } from "./jira-client.ts";
import { mapStatus } from "./status-mapper.ts";
import { upsertArtifact } from "../../src/db.ts";
import type { Envelope } from "../../src/types.ts";

function deriveNext(
  status: string,
  assignee: string | undefined,
  summary: string
): string | undefined {
  if (status !== "active" && status !== "waiting") return undefined;
  return assignee ? `${assignee}: ${summary}` : summary;
}

const plugin: ArtifactPlugin = {
  name: "jira-sync",
  description: "Sync Jira issues into artifacts.db as jira-item records",

  async run(ctx: PluginContext): Promise<PluginResult> {
    const configPath = (ctx.args.config as string) ?? defaultConfigPath(ctx.workspaceRoot);
    const config = loadConfig(configPath);
    const result: PluginResult = { synced: 0, created: 0, updated: 0, errors: [] };

    for (const query of config.queries) {
      let issues;
      try {
        issues = await fetchIssues(config, query);
      } catch (error) {
        result.errors.push(`query (${query.domain}): ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }

      for (const issue of issues) {
        const status = mapStatus(issue.data.jira_status, issue.statusCategory);
        const next = deriveNext(status, issue.data.assignee, issue.data.summary);

        try {
          const envelope: Envelope = {
            id: `jira-item/${query.domain}/${issue.data.key}`,
            kind: "jira-item",
            title: issue.data.summary,
            domain: query.domain,
            source: "jira-sync",
            url: issue.data.url,
            status,
            next: next ?? null,
            updated: new Date().toISOString(),
            created: new Date().toISOString(),
          };

          const kindData: Record<string, unknown> = {
            key: issue.data.key,
            summary: issue.data.summary,
            jira_status: issue.data.jira_status,
            labels: issue.data.labels,
          };
          if (issue.data.priority) kindData.priority = issue.data.priority;
          if (issue.data.assignee) kindData.assignee = issue.data.assignee;
          if (issue.data.sprint) kindData.sprint = issue.data.sprint;
          if (issue.data.due_date) kindData.due_date = issue.data.due_date;

          const emitResult = upsertArtifact(ctx.db, envelope, kindData);
          result.synced!++;
          if (emitResult.action === "created") result.created!++;
          else result.updated!++;
        } catch (error) {
          result.errors.push(`${issue.data.key}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return result;
  },
};

export default plugin;
