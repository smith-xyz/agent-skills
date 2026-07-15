import { Database } from "bun:sqlite";
import { triageDb, triageRepo } from "./paths";

interface GHIssue {
  number: number;
  title: string;
  body: string;
  author: { login: string };
  state: string;
  createdAt: string;
  updatedAt: string;
  comments: Array<{ id: string; author: { login: string }; body: string; createdAt: string }>;
  labels: Array<{ name: string }>;
  reactionGroups: Array<{ content: string; users: { totalCount: number } }>;
}

function gh(args: string[]): string {
  const result = Bun.spawnSync(["gh", ...args], { stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) {
    throw new Error(`gh ${args.join(" ")} failed: ${result.stderr.toString()}`);
  }
  return result.stdout.toString();
}

async function main() {
  const db = new Database(triageDb());
  db.exec("PRAGMA journal_mode=WAL");
  const repo = triageRepo();

  const upsertIssue = db.prepare(`
    INSERT OR REPLACE INTO issues (number, title, body, author, state, created_at, updated_at, comment_count, reaction_count, has_linked_pr, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteLabels = db.prepare("DELETE FROM issue_labels WHERE issue_number = ?");
  const insertLabel = db.prepare("INSERT OR IGNORE INTO issue_labels (issue_number, label) VALUES (?, ?)");

  const deleteComments = db.prepare("DELETE FROM issue_comments WHERE issue_number = ?");
  const insertComment = db.prepare(
    "INSERT OR IGNORE INTO issue_comments (id, issue_number, author, body, created_at) VALUES (?, ?, ?, ?, ?)"
  );

  const now = new Date().toISOString();
  let fetched = 0;
  let updated = 0;

  const existingUpdated = new Map<number, string>();
  for (const row of db.prepare("SELECT number, updated_at FROM issues").all() as Array<{ number: number; updated_at: string }>) {
    existingUpdated.set(row.number, row.updated_at);
  }

  const allIssuesJson = gh([
    "issue", "list",
    "--repo", repo,
    "--state", "open",
    "--limit", "500",
    "--json", "number,title,body,author,state,createdAt,updatedAt,comments,labels,reactionGroups",
  ]);
  const allIssues: GHIssue[] = JSON.parse(allIssuesJson);

  const tx = db.transaction(() => {
    for (const issue of allIssues) {
      const reactionCount = (issue.reactionGroups ?? []).reduce(
        (sum, g) => sum + (g.users?.totalCount ?? 0), 0
      );
      const prev = existingUpdated.get(issue.number);

      if (prev && prev === issue.updatedAt) continue;

      upsertIssue.run(
        issue.number,
        issue.title,
        issue.body ?? "",
        issue.author?.login ?? "",
        issue.state.toLowerCase(),
        issue.createdAt,
        issue.updatedAt,
        issue.comments?.length ?? 0,
        reactionCount,
        0,
        now
      );

      deleteLabels.run(issue.number);
      for (const l of issue.labels ?? []) {
        insertLabel.run(issue.number, l.name);
      }

      deleteComments.run(issue.number);
      (issue.comments ?? []).forEach((c, idx) => {
        const commentId = parseInt(c.id, 10) || (issue.number * 10000 + idx);
        insertComment.run(commentId, issue.number, c.author?.login ?? "", c.body ?? "", c.createdAt);
      });

      updated++;
    }
    fetched = allIssues.length;
  });
  tx();

  db.close();
  console.log(JSON.stringify({ fetched, updated, skipped: fetched - updated }));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
