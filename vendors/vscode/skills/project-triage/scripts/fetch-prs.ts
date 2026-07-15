import { Database } from "bun:sqlite";
import { triageDb, triageRepo } from "./paths";

const LINKED_ISSUE_RE = /(?:fixes|closes|resolves)\s+#(\d+)/gi;

interface GHPR {
  number: number;
  title: string;
  body: string;
  author: { login: string };
  state: string;
  baseRefName: string;
  headRefName: string;
  isDraft: boolean;
  reviewDecision: string;
  labels: Array<{ name: string }>;
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
}

function gh(args: string[]): string {
  const result = Bun.spawnSync(["gh", ...args], { stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) {
    throw new Error(`gh ${args.join(" ")} failed: ${result.stderr.toString()}`);
  }
  return result.stdout.toString();
}

function extractLinkedIssue(body: string | null): number | null {
  if (!body) return null;
  const match = LINKED_ISSUE_RE.exec(body);
  LINKED_ISSUE_RE.lastIndex = 0;
  return match ? parseInt(match[1], 10) : null;
}

function fetchCIStatus(prNumber: number, repo: string): string {
  try {
    const json = gh(["pr", "checks", prNumber.toString(), "--repo", repo, "--json", "name,state,conclusion"]);
    const checks: Array<{ state: string; conclusion: string }> = JSON.parse(json);
    if (checks.length === 0) return "none";
    const failed = checks.some((c) => c.conclusion === "FAILURE" || c.state === "FAILURE");
    if (failed) return "fail";
    const pending = checks.some((c) => c.state === "PENDING" || c.state === "QUEUED");
    if (pending) return "pending";
    return "pass";
  } catch {
    return "unknown";
  }
}

async function main() {
  const db = new Database(triageDb());
  db.exec("PRAGMA journal_mode=WAL");
  const repo = triageRepo();

  const upsertPR = db.prepare(`
    INSERT OR REPLACE INTO prs (number, title, body, author, state, base_branch, head_branch, is_draft, review_decision, ci_status, additions, deletions, changed_files, linked_issue, created_at, updated_at, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteLabels = db.prepare("DELETE FROM pr_labels WHERE pr_number = ?");
  const insertLabel = db.prepare("INSERT OR IGNORE INTO pr_labels (pr_number, label) VALUES (?, ?)");

  const now = new Date().toISOString();
  let fetched = 0;
  let updated = 0;

  const existingUpdated = new Map<number, string>();
  for (const row of db.prepare("SELECT number, updated_at FROM prs").all() as Array<{ number: number; updated_at: string }>) {
    existingUpdated.set(row.number, row.updated_at);
  }

  const json = gh([
    "pr", "list",
    "--repo", repo,
    "--state", "open",
    "--limit", "500",
    "--json", "number,title,body,author,state,baseRefName,headRefName,isDraft,reviewDecision,labels,createdAt,updatedAt,additions,deletions,changedFiles",
  ]);
  const allPRs: GHPR[] = JSON.parse(json);

  const tx = db.transaction(() => {
    for (const pr of allPRs) {
      const prev = existingUpdated.get(pr.number);
      if (prev && prev === pr.updatedAt) continue;

      const linkedIssue = extractLinkedIssue(pr.body);
      const ciStatus = fetchCIStatus(pr.number, repo);

      upsertPR.run(
        pr.number,
        pr.title,
        pr.body ?? "",
        pr.author?.login ?? "",
        pr.state.toLowerCase(),
        pr.baseRefName ?? "",
        pr.headRefName ?? "",
        pr.isDraft ? 1 : 0,
        pr.reviewDecision ?? "",
        ciStatus,
        pr.additions ?? 0,
        pr.deletions ?? 0,
        pr.changedFiles ?? 0,
        linkedIssue,
        pr.createdAt,
        pr.updatedAt,
        now
      );

      deleteLabels.run(pr.number);
      for (const l of pr.labels ?? []) {
        insertLabel.run(pr.number, l.name);
      }

      updated++;
    }
    fetched = allPRs.length;
  });
  tx();

  db.prepare(`
    UPDATE issues SET has_linked_pr = 1
    WHERE number IN (SELECT DISTINCT linked_issue FROM prs WHERE linked_issue IS NOT NULL AND state = 'open')
  `).run();
  db.prepare(`
    UPDATE issues SET has_linked_pr = 0
    WHERE number NOT IN (SELECT DISTINCT linked_issue FROM prs WHERE linked_issue IS NOT NULL AND state = 'open')
      AND has_linked_pr = 1
  `).run();

  db.close();
  console.log(JSON.stringify({ fetched, updated, skipped: fetched - updated }));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
