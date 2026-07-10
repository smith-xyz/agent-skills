import { Database } from "bun:sqlite";
import { resolve } from "path";
import { triageDb, scriptsDir } from "./paths";

const SCORING_SQL_PATH = resolve(scriptsDir(), "sql/scoring.sql");

interface ScoreRow {
  number: number;
  base_score: number;
}

interface TriageEntry {
  item_number: number;
  confidence: number | null;
  score: number | null;
}

async function main() {
  const scoringSql = await Bun.file(SCORING_SQL_PATH).text();
  const db = new Database(triageDb());
  db.exec("PRAGMA journal_mode=WAL");

  const baseScores = db.prepare(scoringSql).all() as ScoreRow[];
  const scoreMap = new Map(baseScores.map((r) => [r.number, r.base_score]));

  const latestTriage = db.prepare(`
    SELECT item_number, confidence, score
    FROM triage_log
    WHERE item_type = 'issue' AND agent = 'backlog-planner'
      AND id IN (SELECT MAX(id) FROM triage_log WHERE item_type = 'issue' AND agent = 'backlog-planner' GROUP BY item_number)
  `).all() as TriageEntry[];

  const overrides = db.prepare(
    "SELECT item_number, value FROM overrides WHERE item_type = 'issue' AND field = 'score'"
  ).all() as Array<{ item_number: number; value: string }>;
  const overrideMap = new Map(overrides.map((r) => [r.item_number, parseFloat(r.value)]));

  const updateScore = db.prepare(
    "UPDATE triage_log SET score = ? WHERE item_type = 'issue' AND agent = 'backlog-planner' AND item_number = ? AND id = (SELECT MAX(id) FROM triage_log WHERE item_type = 'issue' AND agent = 'backlog-planner' AND item_number = ?)"
  );

  let scored = 0;
  let overridesApplied = 0;

  const tx = db.transaction(() => {
    for (const entry of latestTriage) {
      const base = scoreMap.get(entry.item_number) ?? 0;
      const confidence = entry.confidence ?? 0.5;

      let finalScore = base * (0.6 + 0.4 * confidence);

      const override = overrideMap.get(entry.item_number);
      if (override !== undefined) {
        finalScore = override;
        overridesApplied++;
      }

      updateScore.run(Math.round(finalScore * 100) / 100, entry.item_number, entry.item_number);
      scored++;
    }
  });
  tx();

  db.close();
  console.log(JSON.stringify({ scored, overrides_applied: overridesApplied }));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
