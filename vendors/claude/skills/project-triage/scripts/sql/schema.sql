-- Project Triage Schema
-- Loaded by init-db.ts via db.exec(). All statements are idempotent.

CREATE TABLE IF NOT EXISTS issues (
  number INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  author TEXT,
  state TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  comment_count INTEGER NOT NULL DEFAULT 0,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  has_linked_pr INTEGER NOT NULL DEFAULT 0,
  fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_labels (
  issue_number INTEGER NOT NULL REFERENCES issues(number),
  label TEXT NOT NULL,
  PRIMARY KEY (issue_number, label)
);

CREATE TABLE IF NOT EXISTS issue_comments (
  id INTEGER PRIMARY KEY,
  issue_number INTEGER NOT NULL REFERENCES issues(number),
  author TEXT,
  body TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prs (
  number INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  author TEXT,
  state TEXT NOT NULL DEFAULT 'open',
  base_branch TEXT,
  head_branch TEXT,
  is_draft INTEGER NOT NULL DEFAULT 0,
  review_decision TEXT,
  ci_status TEXT,
  additions INTEGER NOT NULL DEFAULT 0,
  deletions INTEGER NOT NULL DEFAULT 0,
  changed_files INTEGER NOT NULL DEFAULT 0,
  linked_issue INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pr_labels (
  pr_number INTEGER NOT NULL REFERENCES prs(number),
  label TEXT NOT NULL,
  PRIMARY KEY (pr_number, label)
);

CREATE TABLE IF NOT EXISTS labels (
  name TEXT PRIMARY KEY,
  description TEXT,
  color TEXT
);

CREATE TABLE IF NOT EXISTS triage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_type TEXT NOT NULL CHECK(item_type IN ('issue', 'pr')),
  item_number INTEGER NOT NULL,
  triaged_at TEXT NOT NULL,
  agent TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('triaged', 'needs-review', 'quick-fix', 'skipped')),
  confidence REAL,
  labels_added TEXT,
  labels_removed TEXT,
  score REAL,
  effort TEXT,
  area TEXT,
  drivers TEXT,
  recommendation TEXT,
  notes TEXT,
  comment_signal TEXT,
  fix_plan TEXT,
  related_issues TEXT,
  agent_output TEXT
);

CREATE INDEX IF NOT EXISTS idx_triage_log_item
  ON triage_log(item_type, item_number, agent, triaged_at DESC);

CREATE TABLE IF NOT EXISTS duplicate_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_number INTEGER NOT NULL,
  winner_pr INTEGER NOT NULL,
  losers_json TEXT NOT NULL,
  close_action TEXT,
  triaged_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS overrides (
  item_type TEXT NOT NULL,
  item_number INTEGER NOT NULL,
  field TEXT NOT NULL,
  value TEXT,
  set_at TEXT NOT NULL,
  PRIMARY KEY (item_type, item_number, field)
);
