use reflect::digest::{Digester, HeuristicDigester};
use reflect::types::Trace;

#[test]
fn heuristic_requires_support() {
    let digester = HeuristicDigester {
        existing_skills: vec![],
        min_support: 3,
    };
    let traces: Vec<Trace> = (0..2)
        .map(|i| Trace {
            id: format!("t{i}"),
            session_id: "s".into(),
            repo: None,
            cwd: None,
            prompt_summary: Some("triage open issues in the caseboard repo".into()),
            status: None,
            created_at: "2026-01-01T00:00:00Z".into(),
        })
        .collect();
    let props = digester.digest(&traces).expect("digest");
    assert!(props.is_empty());
}

#[test]
fn heuristic_proposes_new_on_support() {
    let digester = HeuristicDigester {
        existing_skills: vec![],
        min_support: 3,
    };
    let traces: Vec<Trace> = (0..3)
        .map(|i| Trace {
            id: format!("t{i}"),
            session_id: "s".into(),
            repo: None,
            cwd: None,
            prompt_summary: Some("triage open issues in the caseboard repo".into()),
            status: None,
            created_at: "2026-01-01T00:00:00Z".into(),
        })
        .collect();
    let props = digester.digest(&traces).expect("digest");
    assert_eq!(props.len(), 1);
    assert_eq!(props[0].kind, reflect::types::ProposalKind::New);
}
