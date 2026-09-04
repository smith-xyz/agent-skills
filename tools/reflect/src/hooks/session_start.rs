use std::fs;
use std::path::Path;

use crate::config::ReflectConfig;
use crate::types::HookEvent;

/// Build SessionStart hook stdout JSON (additional context for the model).
pub fn handle_session_start(cfg: &ReflectConfig, event: &HookEvent) -> String {
    let _ = event;
    let catalog = list_skill_names(&cfg.catalog_path);
    let skills_block = if catalog.is_empty() {
        "(no skills found under catalog_path/shared/skills)".to_string()
    } else {
        catalog
            .iter()
            .map(|n| format!("- {n}"))
            .collect::<Vec<_>>()
            .join("\n")
    };

    let ctx = format!(
        "## Reflect / coherence\n\n\
         Soft rules only — no deny gates. Skills are opt-in recipes.\n\n\
         - Map mutating work to active user work / artifacts (deep-research exempt).\n\
         - One primary deliverable; you still write small sharpen edits.\n\
         - Offline: `reflect digest` / `reflect status` for skill proposals.\n\n\
         ### Catalog\n\n{skills_block}\n"
    );

    // Claude / Cursor understand nested hookSpecificOutput; keep flat too.
    serde_json::json!({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": ctx
        },
        "additional_context": ctx
    })
    .to_string()
}

fn list_skill_names(catalog: &Path) -> Vec<String> {
    let skills = catalog.join("shared/skills");
    let Ok(entries) = fs::read_dir(&skills) else {
        return Vec::new();
    };
    let mut names: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().join("SKILL.md").is_file())
        .filter_map(|e| e.file_name().into_string().ok())
        .collect();
    names.sort();
    names
}
