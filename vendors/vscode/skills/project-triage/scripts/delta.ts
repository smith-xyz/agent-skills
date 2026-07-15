import { Database } from "bun:sqlite";
import { resolve } from "path";
import { triageDb, scriptsDir } from "./paths";

const DELTA_SQL_PATH = resolve(scriptsDir(), "sql/delta.sql");

type DeltaType = "issues" | "prs" | "all";

async function main() {
  const typeArg = process.argv.find((a) => a.startsWith("--type="));
  const type: DeltaType = (typeArg?.split("=")[1] as DeltaType) ?? "all";

  const agentArg = process.argv.find((a) => a.startsWith("--agent="));
  const agent = agentArg?.split("=")[1] ?? "issue-triage";

  const rawSql = await Bun.file(DELTA_SQL_PATH).text();
  const [issuesSql, prsSql, allPrsLinkedSql] = rawSql.split("---SEPARATOR---").map((s) => s.trim());

  const db = new Database(triageDb(), { readonly: true });

  let issues: unknown[] = [];
  let prs: unknown[] = [];
  let allLinkedPrs: unknown[] = [];

  if (type === "issues" || type === "all") {
    const issueAgent = agent === "pr-triage" ? "issue-triage" : agent;
    issues = db.prepare(issuesSql).all(issueAgent, issueAgent);
  }

  if (type === "prs" || type === "all") {
    prs = db.prepare(prsSql).all("pr-triage", "pr-triage");
    allLinkedPrs = db.prepare(allPrsLinkedSql).all();
  }

  db.close();

  const output = {
    issues,
    prs,
    all_linked_prs: allLinkedPrs,
    counts: { issues: issues.length, prs: prs.length, all_linked_prs: allLinkedPrs.length },
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
