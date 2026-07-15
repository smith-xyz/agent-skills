import type { GhSyncConfig } from "./config.ts";

import type { CiStatus, OpenPrRecord, PrState } from "./types.ts";

interface GitLabUser {
  username: string;
}

interface GitLabLabel {
  name?: string;
}

interface GitLabReviewer {
  username?: string;
}

interface GitLabPipeline {
  status?: string;
}

interface GitLabMergeRequest {
  iid: number;
  title: string;
  web_url: string;
  state: string;
  draft?: boolean;
  work_in_progress?: boolean;
  author?: { username?: string };
  created_at?: string;
  updated_at?: string;
  labels?: string[];
  reviewers?: GitLabReviewer[];
  head_pipeline?: GitLabPipeline | null;
  approvals_before_merge?: number | null;
  approved?: boolean;
  references?: { full?: string };
  project_id?: number;
}

function resolveToken(envVar: string): string {
  const token = process.env[envVar];
  if (!token) {
    throw new Error(`Missing auth env var: ${envVar}`);
  }
  return token;
}

function mapCiStatus(pipeline: GitLabPipeline | null | undefined): CiStatus {
  if (!pipeline?.status) return null;

  switch (pipeline.status) {
    case "success":
      return "passing";
    case "failed":
    case "canceled":
      return "failing";
    case "running":
    case "pending":
    case "created":
    case "preparing":
    case "waiting_for_resource":
      return "pending";
    default:
      return null;
  }
}

function mapState(mr: GitLabMergeRequest): PrState {
  if (mr.draft || mr.work_in_progress) return "draft";
  if (mr.approved) return "approved";
  return "open";
}

function encodeProjectPath(path: string): string {
  return encodeURIComponent(path);
}

async function gitLabFetch<T>(
  instanceUrl: string,
  token: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${instanceUrl}/api/v4${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Private-Token": token,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitLab request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

async function fetchCurrentUser(instanceUrl: string, token: string): Promise<GitLabUser> {
  return gitLabFetch<GitLabUser>(instanceUrl, token, "/user");
}

function mapMergeRequest(mr: GitLabMergeRequest, projectPath: string): OpenPrRecord {
  return {
    id: `gitlab/${projectPath}/${mr.iid}`,
    source: "gitlab",
    repo: projectPath,
    number: mr.iid,
    title: mr.title,
    url: mr.web_url,
    state: mapState(mr),
    author: mr.author?.username,
    created_at: mr.created_at,
    updated_at: mr.updated_at,
    labels: mr.labels ?? [],
    reviewers: (mr.reviewers ?? [])
      .map((reviewer) => reviewer.username)
      .filter((username): username is string => Boolean(username)),
    ci_status: mapCiStatus(mr.head_pipeline),
  };
}

async function fetchProjectMergeRequests(
  instanceUrl: string,
  token: string,
  projectPath: string,
  username: string
): Promise<OpenPrRecord[]> {
  const encoded = encodeProjectPath(projectPath);
  const mergeRequests = await gitLabFetch<GitLabMergeRequest[]>(
    instanceUrl,
    token,
    `/projects/${encoded}/merge_requests`,
    {
      author_username: username,
      state: "opened",
      per_page: "100",
    }
  );

  return mergeRequests.map((mr) => mapMergeRequest(mr, projectPath));
}

async function fetchScopedMergeRequests(
  instanceUrl: string,
  token: string
): Promise<OpenPrRecord[]> {
  const mergeRequests = await gitLabFetch<GitLabMergeRequest[]>(
    instanceUrl,
    token,
    "/merge_requests",
    {
      state: "opened",
      scope: "created_by_me",
      per_page: "100",
    }
  );

  return mergeRequests.map((mr) => {
    const projectPath = mr.references?.full?.replace(/^!/, "").split("!")[0]
      ?? `project-${mr.project_id ?? "unknown"}`;
    return mapMergeRequest(mr, projectPath);
  });
}

export async function fetchGitLabMergeRequests(
  config: NonNullable<GhSyncConfig["gitlab"]>
): Promise<OpenPrRecord[]> {
  const token = resolveToken(config.token_env ?? "GITLAB_TOKEN");

  if (config.projects.length === 0) {
    return fetchScopedMergeRequests(config.instance_url, token);
  }

  const user = await fetchCurrentUser(config.instance_url, token);
  const results = await Promise.allSettled(
    config.projects.map((project) =>
      fetchProjectMergeRequests(config.instance_url, token, project, user.username)
    )
  );

  const prs: OpenPrRecord[] = [];
  const errors: string[] = [];

  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      prs.push(...result.value);
      continue;
    }
    errors.push(`${config.projects[index]}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
  }

  if (errors.length > 0 && prs.length === 0) {
    throw new Error(errors.join("; "));
  }

  return prs;
}
