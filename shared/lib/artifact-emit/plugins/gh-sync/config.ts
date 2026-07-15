import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import yaml from "js-yaml";

export interface GhSyncConfig {
  github?: {
    repos: string[];
    token_env?: string;
  };
  gitlab?: {
    instance_url: string;
    projects: string[];
    token_env?: string;
  };
}

function assertConfig(raw: unknown, configPath: string): GhSyncConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid config at ${configPath}: expected mapping`);
  }

  const config = raw as Record<string, unknown>;
  const result: GhSyncConfig = {};

  if (config.github !== undefined) {
    if (!config.github || typeof config.github !== "object") {
      throw new Error(`Invalid config at ${configPath}: github must be a mapping`);
    }
    const github = config.github as Record<string, unknown>;
    if (!Array.isArray(github.repos) || github.repos.length === 0) {
      throw new Error(`Invalid config at ${configPath}: github.repos is required`);
    }
    for (const [index, repo] of github.repos.entries()) {
      if (typeof repo !== "string" || !repo) {
        throw new Error(`Invalid config at ${configPath}: github.repos[${index}] must be a string`);
      }
    }
    if (github.token_env !== undefined && typeof github.token_env !== "string") {
      throw new Error(`Invalid config at ${configPath}: github.token_env must be a string`);
    }
    result.github = {
      repos: github.repos as string[],
      token_env: (github.token_env as string | undefined) ?? "GITHUB_TOKEN",
    };
  }

  if (config.gitlab !== undefined) {
    if (!config.gitlab || typeof config.gitlab !== "object") {
      throw new Error(`Invalid config at ${configPath}: gitlab must be a mapping`);
    }
    const gitlab = config.gitlab as Record<string, unknown>;
    if (typeof gitlab.instance_url !== "string" || !gitlab.instance_url) {
      throw new Error(`Invalid config at ${configPath}: gitlab.instance_url is required`);
    }
    if (!Array.isArray(gitlab.projects)) {
      throw new Error(`Invalid config at ${configPath}: gitlab.projects must be an array`);
    }
    for (const [index, project] of gitlab.projects.entries()) {
      if (typeof project !== "string" || !project) {
        throw new Error(`Invalid config at ${configPath}: gitlab.projects[${index}] must be a string`);
      }
    }
    if (gitlab.token_env !== undefined && typeof gitlab.token_env !== "string") {
      throw new Error(`Invalid config at ${configPath}: gitlab.token_env must be a string`);
    }
    result.gitlab = {
      instance_url: (gitlab.instance_url as string).replace(/\/$/, ""),
      projects: gitlab.projects as string[],
      token_env: (gitlab.token_env as string | undefined) ?? "GITLAB_TOKEN",
    };
  }

  if (!result.github && !result.gitlab) {
    throw new Error(`Invalid config at ${configPath}: at least one of github or gitlab is required`);
  }

  return result;
}

export function defaultConfigPath(workspaceRoot: string): string {
  return join(workspaceRoot, ".cursor", "gh-sync.yaml");
}

export function loadConfig(configPath: string): GhSyncConfig {
  const resolved = resolve(configPath);
  if (!existsSync(resolved)) {
    throw new Error(`Config not found: ${resolved}`);
  }

  const raw = readFileSync(resolved, "utf8");
  const parsed = yaml.load(raw) as unknown;
  return assertConfig(parsed, resolved);
}
