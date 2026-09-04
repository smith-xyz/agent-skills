use std::path::Path;

use rusqlite::{params, Connection};

use crate::error::{ReflectError, Result};
use crate::ledger::LedgerStore;
use crate::types::Trace;

/// SQLite-backed ledger for session traces.
pub struct SqliteLedgerStore {
    conn: Connection,
}

impl SqliteLedgerStore {
    /// Opens (or creates) the ledger database and ensures schema.
    pub fn open(path: &Path) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS traces (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                repo TEXT,
                cwd TEXT,
                prompt_summary TEXT,
                status TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_traces_created ON traces(created_at);
            CREATE INDEX IF NOT EXISTS idx_traces_session ON traces(session_id);",
        )?;
        Ok(Self { conn })
    }
}

impl LedgerStore for SqliteLedgerStore {
    fn append_trace(&self, trace: &Trace) -> Result<()> {
        self.conn.execute(
            "INSERT INTO traces (id, session_id, repo, cwd, prompt_summary, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                trace.id,
                trace.session_id,
                trace.repo,
                trace.cwd,
                trace.prompt_summary,
                trace.status,
                trace.created_at,
            ],
        )?;
        Ok(())
    }

    fn recent_traces(&self, limit: usize) -> Result<Vec<Trace>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, repo, cwd, prompt_summary, status, created_at
             FROM traces ORDER BY created_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], map_row)?;
        collect_rows(rows)
    }

    fn traces_since(&self, iso_prefix: &str) -> Result<Vec<Trace>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, repo, cwd, prompt_summary, status, created_at
             FROM traces WHERE created_at >= ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map(params![iso_prefix], map_row)?;
        collect_rows(rows)
    }
}

fn map_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Trace> {
    Ok(Trace {
        id: row.get(0)?,
        session_id: row.get(1)?,
        repo: row.get(2)?,
        cwd: row.get(3)?,
        prompt_summary: row.get(4)?,
        status: row.get(5)?,
        created_at: row.get(6)?,
    })
}

fn collect_rows(
    rows: rusqlite::MappedRows<'_, impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<Trace>>,
) -> Result<Vec<Trace>> {
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(ReflectError::from)?);
    }
    Ok(out)
}
