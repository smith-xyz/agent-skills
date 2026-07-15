import initSqlJs, { type Database } from "sql.js";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import type {
  ArtifactRow,
  CiStatus,
  DomainConfig,
  EventRow,
  LinkRow,
  OpenPrRow,
  PrSource,
  PrState,
  SuggestionRow,
} from "./types";

type RawRow = Record<string, unknown>;
type LogFn = (msg: string) => void;

let sqlJsPromise: Promise<ReturnType<typeof initSqlJs>> | undefined;

function getSqlJs(log?: LogFn): Promise<ReturnType<typeof initSqlJs>> {
  if (!sqlJsPromise) {
    const wasmPath = join(__dirname, "sql-wasm.wasm");
    log?.(`sql.js: loading WASM from ${wasmPath}`);
    if (!existsSync(wasmPath)) {
      const err = `sql-wasm.wasm not found at ${wasmPath}`;
      log?.(`ERROR: ${err}`);
      return Promise.reject(new Error(err));
    }
    sqlJsPromise = initSqlJs({ locateFile: () => wasmPath });
    sqlJsPromise.then(
      () => log?.("sql.js: WASM loaded successfully"),
      (e) => {
        log?.(`sql.js: WASM load FAILED: ${e}`);
        sqlJsPromise = undefined;
      }
    );
  }
  return sqlJsPromise;
}

function parseRelated(value: unknown): string[] | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : undefined;
  } catch {
    return undefined;
  }
}

function mapArtifactRow(row: RawRow): ArtifactRow {
  return {
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.title),
    domain: String(row.domain),
    source: String(row.source),
    url: row.url ? String(row.url) : undefined,
    related: parseRelated(row.related),
    diagram_ref: row.diagram_ref ? String(row.diagram_ref) : undefined,
    node: row.node ? String(row.node) : undefined,
    next: row.next ? String(row.next) : undefined,
    blocked: row.blocked ? String(row.blocked) : undefined,
    status: row.status as ArtifactRow["status"],
    last_action: row.last_action ? String(row.last_action) : undefined,
    last_action_at: row.last_action_at ? String(row.last_action_at) : undefined,
    updated: String(row.updated),
    created: String(row.created),
  };
}

function rowsToObjects(db: Database, sql: string, params?: unknown[]): RawRow[] {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const results: RawRow[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as RawRow);
  }
  stmt.free();
  return results;
}

function suggestionsHaveStatusColumn(db: Database): boolean {
  const rows = rowsToObjects(db, "PRAGMA table_info(suggestions)");
  return rows.some((row) => row.name === "status");
}

function tableExists(db: Database, tableName: string): boolean {
  const rows = rowsToObjects(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName]
  );
  return rows.length > 0;
}

function parseJsonArray(value: unknown): string[] | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : undefined;
  } catch {
    return undefined;
  }
}

function mapOpenPrRow(row: RawRow): OpenPrRow {
  return {
    id: String(row.id),
    source: String(row.source) as PrSource,
    repo: String(row.repo),
    number: Number(row.number),
    title: String(row.title),
    url: String(row.url),
    state: String(row.state) as PrState,
    author: row.author ? String(row.author) : undefined,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
    labels: parseJsonArray(row.labels),
    reviewers: parseJsonArray(row.reviewers),
    ci_status: row.ci_status != null ? (String(row.ci_status) as CiStatus) : undefined,
  };
}

export class ArtifactDbReader {
  constructor(
    private readonly dbPath: string,
    private readonly log?: LogFn
  ) {}

  private async open(): Promise<Database> {
    const SQL = await getSqlJs(this.log);
    if (!existsSync(this.dbPath)) {
      throw new Error(`DB file missing: ${this.dbPath}`);
    }
    const buffer = readFileSync(this.dbPath);
    this.log?.(`Opened DB (${buffer.length} bytes)`);
    return new SQL.Database(buffer);
  }

  async getArtifacts(): Promise<ArtifactRow[]> {
    const db = await this.open();
    try {
      const rows = rowsToObjects(db, "SELECT * FROM artifacts ORDER BY updated DESC");
      this.log?.(`Loaded ${rows.length} artifacts`);
      return rows.map(mapArtifactRow);
    } finally {
      db.close();
    }
  }

  async getSuggestions(): Promise<SuggestionRow[]> {
    const db = await this.open();
    try {
      const hasStatus = suggestionsHaveStatusColumn(db);
      const sql = hasStatus
        ? `SELECT id, text, source_skill, session_id, status, created_at
           FROM suggestions WHERE status = 'new' ORDER BY created_at DESC`
        : `SELECT id, text, source_skill, session_id, created_at
           FROM suggestions ORDER BY created_at DESC`;
      const rows = rowsToObjects(db, sql);
      return rows.map((row) => ({
        id: Number(row.id),
        text: String(row.text),
        source_skill: row.source_skill ? String(row.source_skill) : undefined,
        session_id: row.session_id ? String(row.session_id) : undefined,
        status: hasStatus ? String(row.status) : "new",
        created_at: String(row.created_at),
      }));
    } finally {
      db.close();
    }
  }

  async getLinks(): Promise<LinkRow[]> {
    const db = await this.open();
    try {
      const rows = rowsToObjects(db, "SELECT * FROM artifact_links");
      return rows.map((row) => ({
        from_id: String(row.from_id),
        to_id: String(row.to_id),
        rel: String(row.rel),
        created_at: String(row.created_at),
      }));
    } finally {
      db.close();
    }
  }

  async getEvents(since?: string): Promise<EventRow[]> {
    const db = await this.open();
    try {
      const sql = since
        ? `SELECT id, artifact_id, action, changed_fields, created_at AS timestamp
           FROM events WHERE created_at > ? ORDER BY timestamp DESC LIMIT 100`
        : `SELECT id, artifact_id, action, changed_fields, created_at AS timestamp
           FROM events ORDER BY timestamp DESC LIMIT 100`;
      const rows = since ? rowsToObjects(db, sql, [since]) : rowsToObjects(db, sql);
      return rows.map((row) => ({
        id: Number(row.id),
        artifact_id: String(row.artifact_id),
        action: String(row.action),
        changed_fields: row.changed_fields ? String(row.changed_fields) : undefined,
        timestamp: String(row.timestamp),
      }));
    } finally {
      db.close();
    }
  }

  async getOpenPrs(): Promise<OpenPrRow[]> {
    const db = await this.open();
    try {
      if (!tableExists(db, "open_prs")) {
        this.log?.("open_prs table not found, returning empty");
        return [];
      }
      const rows = rowsToObjects(
        db,
        `SELECT id, source, repo, number, title, url, state, author,
                created_at, updated_at, labels, reviewers, ci_status
         FROM open_prs
         WHERE state IN ('open', 'draft', 'review-requested', 'approved')
         ORDER BY updated_at DESC`
      );
      this.log?.(`Loaded ${rows.length} open PRs`);
      return rows.map(mapOpenPrRow);
    } finally {
      db.close();
    }
  }
}

export function getDomainConfigs(schemasDir: string): DomainConfig[] {
  if (!existsSync(schemasDir)) return [];

  const configs: DomainConfig[] = [];
  for (const file of readdirSync(schemasDir)) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
    try {
      const content = readFileSync(join(schemasDir, file), "utf8");
      const config = yaml.load(content) as DomainConfig | undefined;
      if (config?.domain) configs.push(config);
    } catch {
      // skip malformed YAML
    }
  }
  return configs;
}

export async function updateSuggestionStatus(
  dbPath: string,
  id: number,
  status: "dismissed" | "accepted",
  log?: LogFn
): Promise<void> {
  const SQL = await getSqlJs(log);
  const buffer = readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  try {
    if (!suggestionsHaveStatusColumn(db)) {
      db.run("ALTER TABLE suggestions ADD COLUMN status TEXT NOT NULL DEFAULT 'new'");
    }
    db.run("UPDATE suggestions SET status = ? WHERE id = ?", [status, id]);
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    log?.(`Suggestion ${id} → ${status}`);
  } finally {
    db.close();
  }
}

export async function createLink(
  dbPath: string,
  fromId: string,
  toId: string,
  rel: string,
  log?: LogFn
): Promise<void> {
  const SQL = await getSqlJs(log);
  const buffer = readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  try {
    db.run(
      "INSERT OR IGNORE INTO artifact_links (from_id, to_id, rel, created_at) VALUES (?, ?, ?, ?)",
      [fromId, toId, rel, new Date().toISOString()]
    );
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    log?.(`Link created: ${fromId} --${rel}--> ${toId}`);
  } finally {
    db.close();
  }
}

export async function dismissUnlinked(
  dbPath: string,
  artifactId: string,
  log?: LogFn
): Promise<void> {
  const SQL = await getSqlJs(log);
  const buffer = readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  try {
    db.run(
      "INSERT OR IGNORE INTO artifact_links (from_id, to_id, rel, created_at) VALUES (?, ?, ?, ?)",
      [artifactId, "dismissed", "tracks", new Date().toISOString()]
    );
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    log?.(`Dismissed unlinked: ${artifactId}`);
  } finally {
    db.close();
  }
}
