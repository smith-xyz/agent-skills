import { Database } from "bun:sqlite";
import { triageDb } from "./paths";

interface IssueTriageItem {
  number: number;
  current_labels: string[];
  add_labels: string[];
  remove_labels: string[];
  confidence: number;
  rationale: string;
  comment_signal?: string;
}

interface BacklogItem {
  number: number;
  effort: string;
  confidence: number;
  area: string;
  drivers?: string[];
  fix_plan?: { file: string; approach: string; test?: string; branch?: string };
  related_issues?: number[];
}

interface PRTriageItem {
  number: number;
  score: number;
  recommendation: string;
  rationale: string;
  linked_issue?: number | null;
  staleness_days?: number;
}

interface DuplicateGroup {
  issue: number;
  prs: Array<{ number: number; score: number; recommendation: string }>;
  winner: number;
  close_action?: string;
}

async function main() {
  const agentName = process.argv[2];
  const outputFile = process.argv[3];

  if (!agentName || !outputFile) {
    console.error("Usage: bun persist-results.ts <agent-name> <output-file>");
    process.exit(1);
  }

  const raw = await Bun.file(outputFile).text();
  const data = JSON.parse(raw);
  const now = new Date().toISOString();

  const db = new Database(triageDb());
  db.exec("PRAGMA journal_mode=WAL");

  const insertLog = db.prepare(`
    INSERT INTO triage_log (item_type, item_number, triaged_at, agent, status, confidence, labels_added, labels_removed, score, effort, area, drivers, recommendation, notes, comment_signal, fix_plan, related_issues, agent_output)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDuplicateGroup = db.prepare(`
    INSERT INTO duplicate_groups (issue_number, winner_pr, losers_json, close_action, triaged_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    if (agentName === "issue-triage") {
      const items: IssueTriageItem[] = data.items;
      for (const item of items) {
        const hasChanges = item.add_labels.length > 0 || item.remove_labels.length > 0;
        const status = hasChanges ? "triaged" : "skipped";
        insertLog.run(
          "issue", item.number, now, agentName, status, item.confidence,
          JSON.stringify(item.add_labels), JSON.stringify(item.remove_labels),
          null, null, null, null, null,
          item.rationale, item.comment_signal ?? null, null, null,
          JSON.stringify(item)
        );
      }
    } else if (agentName === "backlog-planner") {
      const items: BacklogItem[] = data.items;
      for (const item of items) {
        const status = item.effort === "quick-fix" && item.confidence >= 0.8 ? "quick-fix" : "triaged";
        insertLog.run(
          "issue", item.number, now, agentName, status, item.confidence,
          null, null,
          null, item.effort, item.area, JSON.stringify(item.drivers ?? []),
          null, null, null,
          item.fix_plan ? JSON.stringify(item.fix_plan) : null,
          item.related_issues ? JSON.stringify(item.related_issues) : null,
          JSON.stringify(item)
        );
      }
    } else if (agentName === "pr-triage") {
      const items: PRTriageItem[] = data.items;
      for (const item of items) {
        const status = item.recommendation === "CLOSE" ? "needs-review" : "triaged";
        insertLog.run(
          "pr", item.number, now, agentName, status, null,
          null, null,
          item.score, null, null, null,
          item.recommendation, item.rationale, null, null, null,
          JSON.stringify(item)
        );
      }

      const groups: DuplicateGroup[] = data.duplicate_groups ?? [];
      const deleteDuplicateGroup = db.prepare("DELETE FROM duplicate_groups WHERE issue_number = ?");
      for (const group of groups) {
        deleteDuplicateGroup.run(group.issue);
        const losers = group.prs.filter((p) => p.number !== group.winner);
        insertDuplicateGroup.run(
          group.issue, group.winner, JSON.stringify(losers),
          group.close_action ?? null, now
        );
      }
    }
  });
  tx();

  const count = (data.items ?? []).length;
  const groups = (data.duplicate_groups ?? []).length;
  db.close();
  console.log(JSON.stringify({ persisted: count, duplicate_groups: groups }));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
