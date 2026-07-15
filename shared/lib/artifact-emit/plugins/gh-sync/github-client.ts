import type { GhSyncConfig } from "./config.ts";
import type { CiStatus, OpenPrRecord, PrState } from "./types.ts";

const GH_BIN = "/opt/homebrew/bin/gh";

const PR_JSON_FIELDS = [
  "number",
  "title",
  "url",
  "state",
  "labels",
  "reviewDecision",
  "statusCheckRollup",
  "createdAt",
  "updatedAt",
  "headRepository",
  "isDraft",
].join(",");

interface GhLabel {
  name?: string;
}

interface GhRepository {
  nameWithOwner?: string;
}

interface GhStatusCheck {
  state?: string;
  conclusion?: string;
  status?: string;
}

interface GhPullRequest {
  number: number;
  title: string;
  url: string;
  state?: string;
  labels?: GhLabel[];
  reviewDecision?: string | null;
  statusCheckRollup?: GhStatusCheck[] | null;
  createdAt?: string;
  updatedAt?: string;
  headRepository?: GhRepository | null;
  isDraft?: boolean;
}

function mapCiStatus(checks: GhStatusCheck[] | null | undefined): CiStatus {
  if (!checks || checks.length === 0) return null;

  let hasPending = false;
  for (const check of checks) {
    const state = (check.state ?? check.status ?? "").toUpperCase();
    const conclusion = (check.conclusion ?? "").toUpperCase();

    if (conclusion === "FAILURE" || conclusion === "FAILED" || state === "FAILURE" || state === "FAILED") {
      return "failing";
    }
    if (
      state === "PENDING"
      || state === "IN_PROGRESS"
      || state === "QUEUED"
      || state === "EXPECTED"
      || state === "REQUESTED"
      || conclusion === ""
    ) {
      hasPending = true;
    }
  }

  if (hasPending) return "pending";
  return "passing";
}

function mapState(pr: GhPullRequest): PrState {
  if (pr.isDraft) return "draft";
  if (pr.reviewDecision === "APPROVED") return "approved";
  if (pr.reviewDecision === "CHANGES_REQUESTED") return "review-requested";
  return "open";
}

function mapPullRequest(pr: GhPullRequest, repoOverride?: string): OpenPrRecord {
  const repo = repoOverride ?? pr.headRepository?.nameWithOwner;
  if (!repo) {
    throw new Error(`PR #${pr.number} missing repository`);
  }

  return {
    id: `github/${repo}/${pr.number}`,
    source: "github",
    repo,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    state: mapState(pr),
    created_at: pr.createdAt,
    updated_at: pr.updatedAt,
    labels: (pr.labels ?? []).map((label) => label.name).filter((name): name is string => Boolean(name)),
    ci_status: mapCiStatus(pr.statusCheckRollup),
  };
}

async function runGh(args: string[], cwd?: string): Promise<string> {
  const proc = Bun.spawn([GH_BIN, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd,
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `gh exited with code ${exitCode}`);
  }

  return stdout;
}

async function fetchPullRequestsForRepo(repo?: string): Promise<OpenPrRecord[]> {
  const args = [
    "pr",
    "list",
    "--author",
    "@me",
    "--state",
    "open",
    "--json",
    PR_JSON_FIELDS,
    "--limit",
    "100",
  ];
  if (repo) {
    args.push("--repo", repo);
  }

  const output = await runGh(args, repo ? undefined : process.cwd());
  const parsed = JSON.parse(output) as GhPullRequest[];
  return parsed.map((pr) => mapPullRequest(pr, repo));
}

async function discoverReposWithOpenPrs(): Promise<string[]> {
  const output = await runGh([
    "search",
    "prs",
    "--author",
    "@me",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "repository",
  ]);

  const parsed = JSON.parse(output) as Array<{ repository?: GhRepository }>;
  const repos = new Set<string>();
  for (const entry of parsed) {
    const repo = entry.repository?.nameWithOwner;
    if (repo) repos.add(repo);
  }
  return [...repos];
}

async function fetchAllUserPullRequests(): Promise<OpenPrRecord[]> {
  try {
    return await fetchPullRequestsForRepo();
  } catch {
    const repos = await discoverReposWithOpenPrs();
    const results = await Promise.allSettled(repos.map((repo) => fetchPullRequestsForRepo(repo)));

    const prs: OpenPrRecord[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        prs.push(...result.value);
      }
    }
    return prs;
  }
}

export async function fetchGitHubPullRequests(
  config: NonNullable<GhSyncConfig["github"]>
): Promise<OpenPrRecord[]> {
  const useAllRepos = config.repos.length === 1 && config.repos[0] === "@me";
  if (useAllRepos) {
    return fetchAllUserPullRequests();
  }

  const results = await Promise.allSettled(
    config.repos.map((repo) => fetchPullRequestsForRepo(repo))
  );

  const prs: OpenPrRecord[] = [];
  const errors: string[] = [];

  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      prs.push(...result.value);
      continue;
    }
    errors.push(`${config.repos[index]}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
  }

  if (errors.length > 0 && prs.length === 0) {
    throw new Error(errors.join("; "));
  }

  return prs;
}
