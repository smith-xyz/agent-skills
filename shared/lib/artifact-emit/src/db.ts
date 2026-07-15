import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq, sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import {
  findSchemasDir,
  kindTableName,
  loadAllKindSchemas,
  sqlTypeForField,
} from "./schema-loader.ts";
import { artifacts, artifactLinks, suggestions, events } from "./schema.ts";
import type { EmitResult, Envelope, InitDbResult, LinkRel, LinkResult } from "./types.ts";
import { LINK_RELS } from "./types.ts";

export function defaultDbPath(): string {
  return join(process.cwd(), ".cursor", "artifacts.db");
}

export interface DbHandle {
  db: ReturnType<typeof drizzle>;
  close: () => void;
}

export function openDb(dbPath: string): DbHandle {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(dbPath, { create: true });
  sqlite.run("PRAGMA journal_mode = WAL");
  return { db: drizzle(sqlite), close: () => sqlite.close() };
}

export function openRawDb(dbPath: string): Database {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath, { create: true });
  db.run("PRAGMA journal_mode = WAL");
  return db;
}

export function initDb(dbPath: string, schemasDir?: string): InitDbResult {
  const rawDb = openRawDb(dbPath);
  const tables: string[] = [];

  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      domain TEXT NOT NULL,
      source TEXT NOT NULL,
      url TEXT,
      related TEXT,
      diagram_ref TEXT,
      node TEXT,
      next TEXT,
      blocked TEXT,
      status TEXT NOT NULL CHECK(status IN ('done','active','waiting','needs-me','stale')),
      last_action TEXT,
      last_action_at TEXT,
      updated TEXT NOT NULL,
      created TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artifact_links (
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      rel TEXT NOT NULL CHECK(rel IN ('feeds-into','depends-on','tracks','dupes')),
      created_at TEXT NOT NULL,
      PRIMARY KEY (from_id, to_id, rel)
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      source_skill TEXT,
      session_id TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'accepted', 'dismissed')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id TEXT NOT NULL,
      action TEXT NOT NULL,
      changed_fields TEXT,
      created_at TEXT NOT NULL
    );
  `);
  tables.push("artifacts", "artifact_links", "suggestions", "events");

  const dir = schemasDir ?? findSchemasDir();
  for (const schema of loadAllKindSchemas(dir)) {
    const table = kindTableName(schema.kind);
    const cols = Object.entries(schema.fields)
      .map(([name, def]) => `${name} ${sqlTypeForField(def)}`)
      .join(", ");
    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS ${table} (
        artifact_id TEXT PRIMARY KEY REFERENCES artifacts(id),
        ${cols}
      );
    `);
    tables.push(table);
  }

  rawDb.close();
  return { db: dbPath, tables };
}

function checkpoint(db: ReturnType<typeof drizzle>): void {
  db.run(sql.raw("PRAGMA wal_checkpoint(PASSIVE)"));
}

function logEvent(
  db: ReturnType<typeof drizzle>,
  artifactId: string,
  action: string,
  changedFields: Record<string, unknown> | null = null
): void {
  db.insert(events).values({
    artifactId,
    action,
    changedFields: changedFields ? JSON.stringify(changedFields) : null,
    createdAt: new Date().toISOString(),
  }).run();
}

type DrizzleDb = ReturnType<typeof drizzle>;

export function upsertArtifact(
  handle: DbHandle,
  envelope: Envelope,
  kindData: Record<string, unknown>
): EmitResult {
  const db = handle.db;
  const existing = db
    .select({ id: artifacts.id, created: artifacts.created })
    .from(artifacts)
    .where(eq(artifacts.id, envelope.id))
    .get();

  const now = new Date().toISOString();
  const isNew = !existing;

  const row = {
    id: envelope.id,
    kind: envelope.kind,
    title: envelope.title,
    domain: envelope.domain,
    source: envelope.source,
    url: envelope.url ?? null,
    related: envelope.related ? JSON.stringify(envelope.related) : null,
    diagram_ref: envelope.diagram_ref ?? null,
    node: envelope.node ?? null,
    next: envelope.next ?? null,
    blocked: envelope.blocked ?? null,
    status: envelope.status,
    last_action: envelope.last_action ?? null,
    last_action_at: envelope.last_action_at ?? null,
    updated: now,
    created: existing?.created ?? envelope.created ?? now,
  };

  db.insert(artifacts)
    .values(row)
    .onConflictDoUpdate({ target: artifacts.id, set: { ...row, created: sql`artifacts.created` } })
    .run();

  const table = kindTableName(envelope.kind);
  const kindCols = Object.keys(kindData);
  if (kindCols.length > 0) {
    const kindValues = kindCols.map((col) => serializeValue(kindData[col]));
    const kindPlaceholders = kindCols.map(() => "?").join(", ");
    // Kind tables are dynamic (schema-driven), so we use raw SQL for these
    db.run(sql.raw(
      `INSERT OR REPLACE INTO ${table} (artifact_id, ${kindCols.join(", ")}) VALUES ('${envelope.id}', ${kindCols.map((_, i) => `'${String(kindValues[i] ?? "").replace(/'/g, "''")}'`).join(", ")})`
    ));
  }

  const action = isNew ? "created" : "updated";
  logEvent(db, envelope.id, action, { envelope: row, kind: kindData });
  checkpoint(db);
  return { id: envelope.id, action };
}

function serializeValue(value: unknown): string | number | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "number") return value;
  return String(value);
}

export function insertLink(
  handle: DbHandle,
  fromId: string,
  toId: string,
  rel: LinkRel
): LinkResult {
  if (!LINK_RELS.includes(rel)) {
    throw new Error(`Invalid rel: ${rel}`);
  }
  const db = handle.db;

  db.insert(artifactLinks)
    .values({ fromId, toId, rel, createdAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: [artifactLinks.fromId, artifactLinks.toId, artifactLinks.rel],
      set: { createdAt: new Date().toISOString() },
    })
    .run();

  logEvent(db, fromId, "linked", { to: toId, rel });
  checkpoint(db);
  return { from: fromId, to: toId, rel };
}

export function insertSuggestion(
  handle: DbHandle,
  text: string,
  sourceSkill?: string,
  sessionId?: string
): number {
  const db = handle.db;
  const result = db.insert(suggestions).values({
    text,
    sourceSkill: sourceSkill ?? null,
    sessionId: sessionId ?? null,
    createdAt: new Date().toISOString(),
  }).returning({ id: suggestions.id }).get();
  checkpoint(db);
  return result.id;
}

export function insertValidationSuggestion(
  handle: DbHandle,
  errors: Array<{ field: string; message: string }>
): void {
  const text = `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join("; ")}`;
  insertSuggestion(handle, text, "artifact-emit");
}
