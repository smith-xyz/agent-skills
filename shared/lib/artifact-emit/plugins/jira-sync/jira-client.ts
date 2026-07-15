import type { JiraSyncConfig } from "./config.ts";

export interface JiraQuery {
  jql: string;
  domain: string;
  max_results?: number;
}

export interface JiraItemData {
  key: string;
  summary: string;
  jira_status: string;
  priority?: "blocker" | "critical" | "major" | "minor" | "trivial";
  assignee?: string;
  sprint?: string;
  due_date?: string;
  labels: string[];
  url: string;
}

export interface JiraIssueRecord {
  data: JiraItemData;
  statusCategory: string;
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  total?: number;
  nextPageToken?: string;
}

interface JiraIssue {
  key: string;
  fields: {
    summary?: string;
    status?: {
      name?: string;
      statusCategory?: { key?: string; name?: string };
    };
    priority?: { name?: string };
    assignee?: { displayName?: string; name?: string } | null;
    duedate?: string | null;
    labels?: string[];
    [key: string]: unknown;
  };
}

const SEARCH_FIELDS = [
  "summary",
  "status",
  "priority",
  "assignee",
  "duedate",
  "labels",
  "sprint",
  "customfield_10020",
].join(",");

function resolveAuthHeader(auth: JiraSyncConfig["auth"]): string {
  if ("email_env_var" in auth && "token_env_var" in auth) {
    const email = process.env[auth.email_env_var];
    const token = process.env[auth.token_env_var];
    if (!email) throw new Error(`Missing auth env var: ${auth.email_env_var}`);
    if (!token) throw new Error(`Missing auth env var: ${auth.token_env_var}`);
    return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
  }

  const value = process.env[(auth as { env_var: string }).env_var];
  if (!value) {
    throw new Error(`Missing auth env var: ${(auth as { env_var: string }).env_var}`);
  }

  if (auth.type === "token") {
    return `Bearer ${value}`;
  }

  if (value.includes(":")) {
    return `Basic ${Buffer.from(value).toString("base64")}`;
  }

  return `Basic ${value}`;
}

function mapPriority(name: string | undefined): JiraItemData["priority"] | undefined {
  if (!name) return undefined;

  const normalized = name.toLowerCase();
  if (normalized.includes("blocker")) return "blocker";
  if (normalized.includes("critical") || normalized.includes("highest")) return "critical";
  if (normalized.includes("major") || normalized.includes("high")) return "major";
  if (normalized.includes("minor") || normalized.includes("medium")) return "minor";
  if (normalized.includes("trivial") || normalized.includes("low")) return "trivial";
  return undefined;
}

function extractSprint(fields: JiraIssue["fields"]): string | undefined {
  const candidates = [fields.sprint, fields.customfield_10020];
  for (const candidate of candidates) {
    if (!candidate) continue;

    if (Array.isArray(candidate) && candidate.length > 0) {
      const last = candidate[candidate.length - 1];
      if (typeof last === "string") {
        const match = last.match(/name=([^,\]]+)/);
        if (match?.[1]) return match[1];
      }
      if (typeof last === "object" && last !== null && "name" in last) {
        return String((last as { name: string }).name);
      }
    }

    if (typeof candidate === "object" && candidate !== null && "name" in candidate) {
      return String((candidate as { name: string }).name);
    }
  }

  return undefined;
}

function mapIssue(config: JiraSyncConfig, issue: JiraIssue): JiraIssueRecord {
  const key = issue.key;
  const summary = issue.fields.summary ?? key;
  const jiraStatus = issue.fields.status?.name ?? "Unknown";
  const assignee =
    issue.fields.assignee?.displayName ?? issue.fields.assignee?.name ?? undefined;

  return {
    statusCategory: issue.fields.status?.statusCategory?.key ?? "indeterminate",
    data: {
      key,
      summary,
      jira_status: jiraStatus,
      priority: mapPriority(issue.fields.priority?.name),
      assignee,
      sprint: extractSprint(issue.fields),
      due_date: issue.fields.duedate ?? undefined,
      labels: issue.fields.labels ?? [],
      url: `${config.instance_url}/browse/${key}`,
    },
  };
}

async function fetchSearchPage(
  config: JiraSyncConfig,
  query: JiraQuery,
  _startAt: number,
  maxResults: number,
  nextPageToken?: string
): Promise<JiraSearchResponse> {
  const url = `${config.instance_url}/rest/api/3/search/jql`;

  const body: Record<string, unknown> = {
    jql: query.jql,
    maxResults,
    fields: SEARCH_FIELDS.split(","),
  };
  if (nextPageToken) {
    body.nextPageToken = nextPageToken;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: resolveAuthHeader(config.auth),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jira search failed (${response.status}): ${body}`);
  }

  return (await response.json()) as JiraSearchResponse;
}

export async function fetchIssues(
  config: JiraSyncConfig,
  query: JiraQuery
): Promise<JiraIssueRecord[]> {
  const maxResults = query.max_results ?? 50;
  const items: JiraIssueRecord[] = [];
  let nextPageToken: string | undefined;

  while (items.length < maxResults) {
    const pageSize = Math.min(maxResults - items.length, 50);
    const page = await fetchSearchPage(config, query, 0, pageSize, nextPageToken);
    for (const issue of page.issues) {
      items.push(mapIssue(config, issue));
    }

    if (page.issues.length === 0 || !page.nextPageToken || items.length >= maxResults) {
      break;
    }
    nextPageToken = page.nextPageToken;
  }

  return items;
}
