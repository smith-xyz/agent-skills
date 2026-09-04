use chrono::Utc;
use uuid::Uuid;

use crate::error::Result;
use crate::ledger::LedgerStore;
use crate::types::{Proposal, ProposalKind, Trace};

/// Port for clustering traces into skill proposals.
pub trait Digester {
    fn digest(&self, traces: &[Trace]) -> Result<Vec<Proposal>>;
}

/// v1 heuristic: group non-empty prompt summaries by normalized key; propose
/// `new` when a cluster has support >= 3 and no existing skill name match.
pub struct HeuristicDigester {
    pub existing_skills: Vec<String>,
    pub min_support: usize,
}

impl Default for HeuristicDigester {
    fn default() -> Self {
        Self {
            existing_skills: Vec::new(),
            min_support: 3,
        }
    }
}

impl Digester for HeuristicDigester {
    fn digest(&self, traces: &[Trace]) -> Result<Vec<Proposal>> {
        use std::collections::HashMap;

        let mut clusters: HashMap<String, Vec<&Trace>> = HashMap::new();
        for t in traces {
            let Some(summary) = t.prompt_summary.as_deref() else {
                continue;
            };
            let key = normalize_ask(summary);
            if key.len() < 8 {
                continue;
            }
            clusters.entry(key).or_default().push(t);
        }

        let mut proposals = Vec::new();
        for (key, members) in clusters {
            if members.len() < self.min_support {
                continue;
            }
            let skill_name = slug_from_ask(&key);
            let kind = if self
                .existing_skills
                .iter()
                .any(|s| s == &skill_name || key.contains(&s.replace('-', " ")))
            {
                ProposalKind::Amend
            } else {
                ProposalKind::New
            };

            let evidence: Vec<String> = members.iter().map(|t| t.id.clone()).collect();
            let rationale = format!(
                "Seen {} similar asks (heuristic cluster). Key: {key}",
                members.len()
            );
            let draft_body = draft_skill_md(&skill_name, &key, kind);

            proposals.push(Proposal {
                id: Uuid::new_v4().to_string(),
                kind,
                skill_name,
                rationale,
                evidence_trace_ids: evidence,
                draft_body,
                created_at: Utc::now().to_rfc3339(),
            });
        }

        proposals.sort_by(|a, b| a.skill_name.cmp(&b.skill_name));
        Ok(proposals)
    }
}

fn normalize_ask(s: &str) -> String {
    s.to_ascii_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .take(12)
        .collect::<Vec<_>>()
        .join(" ")
}

fn slug_from_ask(key: &str) -> String {
    let stop = ["the", "a", "an", "to", "for", "and", "of", "in", "on", "with"];
    let parts: Vec<&str> = key
        .split_whitespace()
        .filter(|w| w.len() > 2 && !stop.contains(w))
        .take(3)
        .collect();
    if parts.is_empty() {
        return "untitled-routine".to_string();
    }
    parts.join("-")
}

fn draft_skill_md(name: &str, trigger: &str, kind: ProposalKind) -> String {
    format!(
        "---\nname: {name}\ndescription: >-\n  Proposed by reflect ({kind}). Use when {trigger}.\n---\n\n\
         # {name}\n\n\
         ## Procedure\n\n1. Clarify inputs.\n2. Execute the routine.\n3. Verify done condition.\n\n\
         ## Done when\n\nThe user-confirmed outcome for this routine is met.\n",
        kind = kind.as_str()
    )
}

/// Run digest against recent traces from a ledger.
pub fn run_digest<L: LedgerStore>(
    ledger: &L,
    digester: &impl Digester,
    limit: usize,
) -> Result<Vec<Proposal>> {
    let traces = ledger.recent_traces(limit)?;
    digester.digest(&traces)
}
