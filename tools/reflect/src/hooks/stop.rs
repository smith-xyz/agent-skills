use chrono::Utc;
use uuid::Uuid;

use crate::config::ReflectConfig;
use crate::ledger::LedgerStore;
use crate::review;
use crate::types::{HookEvent, Trace};

/// Handle Stop: append a trace (fail-open) and optionally nudge about reviews.
pub fn handle_stop<L: LedgerStore>(
    cfg: &ReflectConfig,
    ledger: &L,
    event: &HookEvent,
) -> String {
    let (session_id, cwd, prompt, status) = match event {
        HookEvent::Stop {
            session_id,
            cwd,
            prompt,
            status,
        } => (
            session_id.clone(),
            cwd.clone(),
            prompt.clone(),
            status.clone(),
        ),
        _ => {
            return empty_ok();
        }
    };

    let summary = prompt.as_ref().map(|p| truncate(p, 240));
    let repo = cwd.as_ref().and_then(|c| infer_repo_name(c));

    let trace = Trace {
        id: Uuid::new_v4().to_string(),
        session_id,
        repo,
        cwd,
        prompt_summary: summary,
        status,
        created_at: Utc::now().to_rfc3339(),
    };

    if let Err(err) = ledger.append_trace(&trace) {
        eprintln!("reflect: failed to append trace: {err}");
        return empty_ok();
    }

    let status = match review::status(cfg) {
        Ok(s) => s,
        Err(err) => {
            eprintln!("reflect: review status: {err}");
            return empty_ok();
        }
    };

    if status.total() == 0 {
        return empty_ok();
    }

    let msg = format!(
        "reflect: {} ready to review. Run `reflect status` then `reflect accept|reject <id>`.",
        status.format_line()
    );

    serde_json::json!({
        "followup_message": msg,
        "hookSpecificOutput": {
            "hookEventName": "Stop",
            "additionalContext": msg
        }
    })
    .to_string()
}

fn empty_ok() -> String {
    "{}".to_string()
}

fn truncate(s: &str, max: usize) -> String {
    let s = s.trim();
    if s.chars().count() <= max {
        return s.to_string();
    }
    let truncated: String = s.chars().take(max.saturating_sub(1)).collect();
    format!("{truncated}…")
}

fn infer_repo_name(cwd: &str) -> Option<String> {
    let path = std::path::Path::new(cwd);
    path.file_name()
        .and_then(|n| n.to_str())
        .map(str::to_string)
}
