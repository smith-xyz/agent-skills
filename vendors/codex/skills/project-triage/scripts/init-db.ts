import { Database } from "bun:sqlite";
import { resolve } from "path";
import { triageDb, triageRepo, ensureTriageDir, triageDir, scriptsDir } from "./paths";

const SCHEMA_PATH = resolve(scriptsDir(), "sql/schema.sql");

async function main() {
  ensureTriageDir();
  await Bun.write(resolve(triageDir(), ".gitkeep"), "");

  const schema = await Bun.file(SCHEMA_PATH).text();
  const db = new Database(triageDb(), { create: true });
  db.exec("PRAGMA journal_mode=WAL");
  db.exec(schema);

  const result = Bun.spawnSync(
    ["gh", "label", "list", "--repo", triageRepo(), "--limit", "200", "--json", "name,description,color"],
    { stdout: "pipe", stderr: "pipe" }
  );

  if (result.exitCode !== 0) {
    console.error(`Failed to fetch labels: ${result.stderr.toString()}`);
    process.exit(1);
  }

  const labels: Array<{ name: string; description: string; color: string }> =
    JSON.parse(result.stdout.toString());

  const upsert = db.prepare(
    "INSERT OR REPLACE INTO labels (name, description, color) VALUES (?, ?, ?)"
  );

  const tx = db.transaction(() => {
    for (const label of labels) {
      upsert.run(label.name, label.description ?? "", label.color ?? "");
    }
  });
  tx();

  console.log(JSON.stringify({ tables_created: true, labels_synced: labels.length }));
  db.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
