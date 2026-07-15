import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import yaml from "js-yaml";

export interface JiraSyncConfig {
  instance_url: string;
  auth:
    | { type: "token"; env_var: string }
    | { type: "basic"; env_var: string }
    | { type: "basic"; email_env_var: string; token_env_var: string };
  queries: Array<{
    jql: string;
    domain: string;
    max_results?: number;
  }>;
}

function assertConfig(raw: unknown, configPath: string): JiraSyncConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid config at ${configPath}: expected mapping`);
  }

  const config = raw as Record<string, unknown>;

  if (typeof config.instance_url !== "string" || !config.instance_url) {
    throw new Error(`Invalid config at ${configPath}: instance_url is required`);
  }

  if (!config.auth || typeof config.auth !== "object") {
    throw new Error(`Invalid config at ${configPath}: auth is required`);
  }

  const auth = config.auth as Record<string, unknown>;
  if (auth.type !== "token" && auth.type !== "basic") {
    throw new Error(`Invalid config at ${configPath}: auth.type must be token or basic`);
  }
  if (auth.email_env_var && auth.token_env_var) {
    // two-var basic auth (email + token separate)
  } else if (typeof auth.env_var !== "string" || !auth.env_var) {
    throw new Error(`Invalid config at ${configPath}: auth.env_var (or email_env_var + token_env_var) is required`);
  }

  if (!Array.isArray(config.queries) || config.queries.length === 0) {
    throw new Error(`Invalid config at ${configPath}: at least one query is required`);
  }

  const queries = config.queries.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Invalid config at ${configPath}: queries[${index}] must be a mapping`);
    }
    const query = entry as Record<string, unknown>;
    if (typeof query.jql !== "string" || !query.jql) {
      throw new Error(`Invalid config at ${configPath}: queries[${index}].jql is required`);
    }
    if (typeof query.domain !== "string" || !query.domain) {
      throw new Error(`Invalid config at ${configPath}: queries[${index}].domain is required`);
    }
    if (query.max_results !== undefined && typeof query.max_results !== "number") {
      throw new Error(`Invalid config at ${configPath}: queries[${index}].max_results must be a number`);
    }
    return {
      jql: query.jql,
      domain: query.domain,
      max_results: query.max_results,
    };
  });

  return {
    instance_url: config.instance_url.replace(/\/$/, ""),
    auth: auth as JiraSyncConfig["auth"],
    queries,
  };
}

export function defaultConfigPath(workspaceRoot: string): string {
  return join(workspaceRoot, ".cursor", "jira-sync.yaml");
}

export function loadConfig(configPath: string): JiraSyncConfig {
  const resolved = resolve(configPath);
  if (!existsSync(resolved)) {
    throw new Error(`Config not found: ${resolved}`);
  }

  const raw = readFileSync(resolved, "utf8");
  const parsed = yaml.load(raw) as unknown;
  return assertConfig(parsed, resolved);
}
