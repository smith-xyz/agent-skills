import { sql } from "drizzle-orm";
import type { DbHandle } from "../../src/db.ts";
import type { OpenPrRecord, PrSource, PrState } from "./types.ts";

const ACTIVE_STATES: PrState[] = ["open", "draft", "review-requested", "approved"];

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS open_prs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  repo TEXT NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  state TEXT NOT NULL,
  author TEXT,
  created_at TEXT,
  updated_at TEXT,
  labels TEXT,
  reviewers TEXT,
  ci_status TEXT,
  last_synced TEXT NOT NULL
)`;

function sqlLiteral(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function ensureOpenPrsTable(handle: DbHandle): void {
  handle.db.run(sql.raw(CREATE_TABLE_SQL));
}

export function openPrExists(handle: DbHandle, id: string): boolean {
  const row = handle.db.get<{ id: string }>(
    sql.raw(`SELECT id FROM open_prs WHERE id = ${sqlLiteral(id)} LIMIT 1`)
  );
  return Boolean(row);
}

export function upsertOpenPr(handle: DbHandle, pr: OpenPrRecord, lastSynced: string): void {
  const labels = pr.labels ? JSON.stringify(pr.labels) : null;
  const reviewers = pr.reviewers ? JSON.stringify(pr.reviewers) : null;

  handle.db.run(sql.raw(`
    INSERT OR REPLACE INTO open_prs (
      id, source, repo, number, title, url, state, author,
      created_at, updated_at, labels, reviewers, ci_status, last_synced
    ) VALUES (
      ${sqlLiteral(pr.id)},
      ${sqlLiteral(pr.source)},
      ${sqlLiteral(pr.repo)},
      ${pr.number},
      ${sqlLiteral(pr.title)},
      ${sqlLiteral(pr.url)},
      ${sqlLiteral(pr.state)},
      ${sqlLiteral(pr.author ?? null)},
      ${sqlLiteral(pr.created_at ?? null)},
      ${sqlLiteral(pr.updated_at ?? null)},
      ${sqlLiteral(labels)},
      ${sqlLiteral(reviewers)},
      ${sqlLiteral(pr.ci_status ?? null)},
      ${sqlLiteral(lastSynced)}
    )
  `));
}

export function markStaleOpenPrs(
  handle: DbHandle,
  source: PrSource,
  activeIds: Set<string>,
  lastSynced: string
): number {
  const activeStateList = ACTIVE_STATES.map((state) => sqlLiteral(state)).join(", ");
  const rows = handle.db.all<{ id: string }>(
    sql.raw(`
      SELECT id FROM open_prs
      WHERE source = ${sqlLiteral(source)}
        AND state IN (${activeStateList})
    `)
  );

  let closed = 0;
  for (const row of rows) {
    if (activeIds.has(row.id)) continue;
    handle.db.run(sql.raw(`
      UPDATE open_prs
      SET state = 'closed', last_synced = ${sqlLiteral(lastSynced)}
      WHERE id = ${sqlLiteral(row.id)}
    `));
    closed++;
  }

  return closed;
}
