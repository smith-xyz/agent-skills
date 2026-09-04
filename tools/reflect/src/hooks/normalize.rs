use serde_json::Value;

use crate::types::HookEvent;

/// Normalize Claude / Cursor / VS Code hook JSON into a HookEvent.
///
/// Fail-open: unrecognized shapes become `HookEvent::Unknown`.
pub fn normalize_payload(raw: &str) -> HookEvent {
    let v: Value = match serde_json::from_str(raw) {
        Ok(v) => v,
        Err(_) => return HookEvent::Unknown,
    };
    normalize_value(&v)
}

fn normalize_value(v: &Value) -> HookEvent {
    let event = first_str(
        v,
        &[
            "hook_event_name",
            "hookEventName",
            "event",
            "event_name",
        ],
    )
    .unwrap_or("")
    .to_ascii_lowercase();

    let session_id = first_str(v, &["session_id", "sessionId", "conversation_id"])
        .unwrap_or("unknown")
        .to_string();
    let cwd = first_str(v, &["cwd", "working_directory", "workspace_roots"])
        .map(str::to_string)
        .or_else(|| {
            v.get("workspace_roots")
                .and_then(|w| w.as_array())
                .and_then(|a| a.first())
                .and_then(|x| x.as_str())
                .map(str::to_string)
        });

    match event.as_str() {
        "sessionstart" | "session_start" => HookEvent::SessionStart {
            session_id,
            cwd,
        },
        "stop" | "sessionend" | "session_end" | "subagentstop" => {
            let prompt = first_str(v, &["prompt", "last_user_message", "user_prompt", "message"])
                .map(str::to_string);
            let status = first_str(v, &["status", "stop_reason", "reason"]).map(str::to_string);
            HookEvent::Stop {
                session_id,
                cwd,
                prompt,
                status,
            }
        }
        // Cursor sometimes omits event name; presence of status/loop_count ⇒ stop
        "" if v.get("status").is_some() || v.get("loop_count").is_some() => HookEvent::Stop {
            session_id,
            cwd,
            prompt: None,
            status: first_str(v, &["status"]).map(str::to_string),
        },
        _ => HookEvent::Unknown,
    }
}

fn first_str<'a>(v: &'a Value, keys: &[&str]) -> Option<&'a str> {
    for k in keys {
        if let Some(s) = v.get(*k).and_then(|x| x.as_str()) {
            if !s.is_empty() {
                return Some(s);
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claude_session_start() {
        let raw = r#"{"hook_event_name":"SessionStart","session_id":"s1","cwd":"/tmp"}"#;
        match normalize_payload(raw) {
            HookEvent::SessionStart { session_id, cwd } => {
                assert_eq!(session_id, "s1");
                assert_eq!(cwd.as_deref(), Some("/tmp"));
            }
            other => panic!("unexpected {other:?}"),
        }
    }

    #[test]
    fn cursor_stop() {
        let raw = r#"{"hookEventName":"stop","sessionId":"c1","status":"completed"}"#;
        match normalize_payload(raw) {
            HookEvent::Stop {
                session_id, status, ..
            } => {
                assert_eq!(session_id, "c1");
                assert_eq!(status.as_deref(), Some("completed"));
            }
            other => panic!("unexpected {other:?}"),
        }
    }

    #[test]
    fn malformed_is_unknown() {
        assert_eq!(normalize_payload("not-json"), HookEvent::Unknown);
    }
}
