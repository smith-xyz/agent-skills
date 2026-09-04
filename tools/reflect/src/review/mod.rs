use std::fs;
use std::path::Path;

use crate::config::ReflectConfig;
use crate::error::{ReflectError, Result};
use crate::types::{Proposal, ProposalKind, ReviewStatus};

/// List pending proposals and counts.
pub fn status(cfg: &ReflectConfig) -> Result<ReviewStatus> {
    let mut st = ReviewStatus::default();
    for p in list_proposals(cfg)? {
        match p.kind {
            ProposalKind::New => st.new += 1,
            ProposalKind::Amend => st.amended += 1,
            ProposalKind::Delete => st.deleted += 1,
        }
    }
    Ok(st)
}

/// Persist proposals into the review directory as JSON files.
pub fn write_proposals(cfg: &ReflectConfig, proposals: &[Proposal]) -> Result<usize> {
    cfg.ensure_dirs()?;
    let mut n = 0;
    for p in proposals {
        let path = cfg.review_dir.join(format!("{}.json", p.id));
        let raw = serde_json::to_string_pretty(p)?;
        fs::write(&path, raw)?;
        n += 1;
    }
    Ok(n)
}

pub fn list_proposals(cfg: &ReflectConfig) -> Result<Vec<Proposal>> {
    if !cfg.review_dir.is_dir() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for entry in fs::read_dir(&cfg.review_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let raw = fs::read_to_string(&path)?;
        match serde_json::from_str::<Proposal>(&raw) {
            Ok(p) => out.push(p),
            Err(err) => eprintln!("reflect: skip {}: {err}", path.display()),
        }
    }
    out.sort_by(|a, b| a.created_at.cmp(&b.created_at));
    Ok(out)
}

fn find_proposal(cfg: &ReflectConfig, id: &str) -> Result<(Proposal, std::path::PathBuf)> {
    let path = cfg.review_dir.join(format!("{id}.json"));
    if path.is_file() {
        let raw = fs::read_to_string(&path)?;
        let p: Proposal = serde_json::from_str(&raw)?;
        return Ok((p, path));
    }
    // Allow prefix match
    for entry in fs::read_dir(&cfg.review_dir)? {
        let entry = entry?;
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with(id) && name.ends_with(".json") {
            let path = entry.path();
            let raw = fs::read_to_string(&path)?;
            let p: Proposal = serde_json::from_str(&raw)?;
            return Ok((p, path));
        }
    }
    Err(ReflectError::not_found(format!("proposal {id}")))
}

/// Accept a proposal: write into catalog shared/skills (or remove on delete).
pub fn accept(cfg: &ReflectConfig, id: &str) -> Result<String> {
    let (proposal, review_path) = find_proposal(cfg, id)?;
    let skills_root = cfg.catalog_path.join("shared/skills");
    fs::create_dir_all(&skills_root)?;

    let msg = match proposal.kind {
        ProposalKind::New | ProposalKind::Amend => {
            let dir = skills_root.join(&proposal.skill_name);
            fs::create_dir_all(&dir)?;
            let skill_md = dir.join("SKILL.md");
            fs::write(&skill_md, &proposal.draft_body)?;
            format!(
                "accepted {} → {}",
                proposal.kind.as_str(),
                skill_md.display()
            )
        }
        ProposalKind::Delete => {
            let dir = skills_root.join(&proposal.skill_name);
            if dir.is_dir() {
                fs::remove_dir_all(&dir)?;
                format!("deleted skill directory {}", dir.display())
            } else {
                format!(
                    "delete noted but {} was not present",
                    dir.display()
                )
            }
        }
    };

    fs::remove_file(&review_path)?;
    // Move to accepted archive
    let archive = cfg.review_dir.join("accepted");
    fs::create_dir_all(&archive)?;
    let archived = archive.join(format!("{}.json", proposal.id));
    let _ = fs::write(&archived, serde_json::to_string_pretty(&proposal)?);

    Ok(msg)
}

/// Reject a proposal (archive under rejected/).
pub fn reject(cfg: &ReflectConfig, id: &str) -> Result<String> {
    let (proposal, review_path) = find_proposal(cfg, id)?;
    let archive = cfg.review_dir.join("rejected");
    fs::create_dir_all(&archive)?;
    let archived = archive.join(format!("{}.json", proposal.id));
    fs::write(&archived, serde_json::to_string_pretty(&proposal)?)?;
    fs::remove_file(&review_path)?;
    Ok(format!("rejected {}", proposal.id))
}

/// Print human listing of pending proposals.
pub fn print_list(cfg: &ReflectConfig) -> Result<()> {
    let proposals = list_proposals(cfg)?;
    if proposals.is_empty() {
        println!("no pending proposals");
        return Ok(());
    }
    for p in proposals {
        println!(
            "{}  [{:>6}]  {:<24}  {}",
            short_id(&p.id),
            p.kind.as_str(),
            p.skill_name,
            truncate(&p.rationale, 60)
        );
    }
    Ok(())
}

fn short_id(id: &str) -> &str {
    id.get(..8).unwrap_or(id)
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let t: String = s.chars().take(max.saturating_sub(1)).collect();
        format!("{t}…")
    }
}

/// List skill directory names under catalog.
pub fn existing_skill_names(catalog: &Path) -> Vec<String> {
    let skills = catalog.join("shared/skills");
    let Ok(entries) = fs::read_dir(skills) else {
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
