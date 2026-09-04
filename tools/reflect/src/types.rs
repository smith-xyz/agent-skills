use serde::{Deserialize, Serialize};

/// Normalized hook event from Claude, Cursor, or VS Code payloads.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HookEvent {
    SessionStart {
        session_id: String,
        cwd: Option<String>,
    },
    Stop {
        session_id: String,
        cwd: Option<String>,
        prompt: Option<String>,
        status: Option<String>,
    },
    Unknown,
}

/// One recorded turn/session handoff.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trace {
    pub id: String,
    pub session_id: String,
    pub repo: Option<String>,
    pub cwd: Option<String>,
    pub prompt_summary: Option<String>,
    pub status: Option<String>,
    pub created_at: String,
}

/// Kind of skill catalog proposal.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProposalKind {
    New,
    Amend,
    Delete,
}

impl ProposalKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::New => "new",
            Self::Amend => "amend",
            Self::Delete => "delete",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "new" => Some(Self::New),
            "amend" => Some(Self::Amend),
            "delete" => Some(Self::Delete),
            _ => None,
        }
    }
}

/// A review-queue draft before catalog sync.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    pub id: String,
    pub kind: ProposalKind,
    pub skill_name: String,
    pub rationale: String,
    pub evidence_trace_ids: Vec<String>,
    pub draft_body: String,
    pub created_at: String,
}

/// Counts shown by `reflect status`.
#[derive(Debug, Clone, Default, Serialize)]
pub struct ReviewStatus {
    pub new: usize,
    pub amended: usize,
    pub deleted: usize,
}

impl ReviewStatus {
    pub fn format_line(&self) -> String {
        format!(
            "{} new · {} amended · {} deleted",
            self.new, self.amended, self.deleted
        )
    }

    pub fn total(&self) -> usize {
        self.new + self.amended + self.deleted
    }
}
