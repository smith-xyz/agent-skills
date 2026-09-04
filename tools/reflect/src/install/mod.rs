use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde_json::{json, Value};

use crate::config::ReflectConfig;
use crate::error::{ReflectError, Result};

/// Wire Claude, Cursor, and/or VS Code hooks to the reflect binary.
pub fn install(cfg: &ReflectConfig, reflect_bin: &Path) -> Result<()> {
    cfg.ensure_dirs()?;
    let home = dirs::home_dir().ok_or_else(|| ReflectError::config("no home dir"))?;

    for vendor in &cfg.vendors {
        match vendor.as_str() {
            "claude" => wire_claude(&home, reflect_bin)?,
            "cursor" => wire_cursor(&home, reflect_bin)?,
            "vscode" => wire_vscode(&home, reflect_bin)?,
            "opencode" => wire_opencode(&home, &cfg.catalog_path)?,
            other => eprintln!("reflect: unknown vendor {other}, skipping"),
        }
    }

    // Persist config next to ledger
    cfg.save(&home)?;
    println!("reflect installed → {}", reflect_bin.display());
    println!("config → {}", ReflectConfig::config_path(&home).display());
    Ok(())
}

/// Remove reflect hooks from wired vendors.
pub fn remove(cfg: &ReflectConfig) -> Result<()> {
    let home = dirs::home_dir().ok_or_else(|| ReflectError::config("no home dir"))?;
    for vendor in &cfg.vendors {
        match vendor.as_str() {
            "claude" => unwire_claude(&home)?,
            "cursor" => unwire_cursor(&home)?,
            "vscode" => unwire_vscode(&home)?,
            "opencode" => unwire_opencode(&home)?,
            _ => {}
        }
    }
    println!("reflect hooks removed");
    Ok(())
}

fn reflect_cmd(bin: &Path, sub: &str) -> String {
    format!("{} hook {}", bin.display(), sub)
}

fn wire_claude(home: &Path, bin: &Path) -> Result<()> {
    let path = home.join(".claude/settings.json");
    let mut root = read_json_object(&path)?;
    let hooks = json!({
        "SessionStart": [{
            "hooks": [{
                "type": "command",
                "command": reflect_cmd(bin, "session-start"),
                "timeout": 10
            }]
        }],
        "Stop": [{
            "hooks": [{
                "type": "command",
                "command": reflect_cmd(bin, "stop"),
                "timeout": 10
            }]
        }]
    });
    // Merge: replace only SessionStart/Stop keys we own; leave PreToolUse alone
    let hooks_obj = root
        .as_object_mut()
        .ok_or_else(|| ReflectError::install("claude settings root must be object"))?
        .entry("hooks")
        .or_insert_with(|| json!({}));
    if let Some(obj) = hooks_obj.as_object_mut() {
        if let Some(ss) = hooks.get("SessionStart") {
            obj.insert("SessionStart".into(), ss.clone());
        }
        if let Some(st) = hooks.get("Stop") {
            obj.insert("Stop".into(), st.clone());
        }
        // Drop old agent-gate PreToolUse / UserPromptSubmit if present and only ours
        // Leave other hooks intact.
    }
    write_json(&path, &root)?;
    println!("  claude hooks → {}", path.display());
    Ok(())
}

fn unwire_claude(home: &Path) -> Result<()> {
    let path = home.join(".claude/settings.json");
    if !path.is_file() {
        return Ok(());
    }
    let mut root = read_json_object(&path)?;
    if let Some(hooks) = root.get_mut("hooks").and_then(|h| h.as_object_mut()) {
        strip_reflect_commands(hooks, &["SessionStart", "Stop"]);
        if hooks.is_empty() {
            root.as_object_mut().map(|o| o.remove("hooks"));
        }
    }
    write_json(&path, &root)?;
    println!("  claude hooks cleaned → {}", path.display());
    Ok(())
}

fn wire_cursor(home: &Path, bin: &Path) -> Result<()> {
    let path = home.join(".cursor/hooks.json");
    let mut root = read_json_object(&path)?;
    if root.get("version").is_none() {
        root.as_object_mut()
            .map(|o| o.insert("version".into(), json!(1)));
    }
    let hooks = root
        .as_object_mut()
        .ok_or_else(|| ReflectError::install("cursor hooks root must be object"))?
        .entry("hooks")
        .or_insert_with(|| json!({}));
    if let Some(obj) = hooks.as_object_mut() {
        obj.insert(
            "sessionStart".into(),
            json!([{ "command": reflect_cmd(bin, "session-start") }]),
        );
        obj.insert(
            "stop".into(),
            json!([{ "command": reflect_cmd(bin, "stop"), "loop_limit": 1 }]),
        );
    }
    write_json(&path, &root)?;
    println!("  cursor hooks → {}", path.display());
    Ok(())
}

fn unwire_cursor(home: &Path) -> Result<()> {
    let path = home.join(".cursor/hooks.json");
    if !path.is_file() {
        return Ok(());
    }
    let mut root = read_json_object(&path)?;
    if let Some(hooks) = root.get_mut("hooks").and_then(|h| h.as_object_mut()) {
        strip_reflect_commands(hooks, &["sessionStart", "stop"]);
    }
    write_json(&path, &root)?;
    println!("  cursor hooks cleaned → {}", path.display());
    Ok(())
}

fn wire_vscode(home: &Path, bin: &Path) -> Result<()> {
    let dir = home.join(".copilot/hooks");
    fs::create_dir_all(&dir)?;
    let path = dir.join("reflect.json");
    let body = json!({
        "hooks": {
            "sessionStart": [{
                "type": "command",
                "command": reflect_cmd(bin, "session-start")
            }],
            "stop": [{
                "type": "command",
                "command": reflect_cmd(bin, "stop")
            }]
        }
    });
    write_json(&path, &body)?;
    println!("  vscode hooks → {}", path.display());
    Ok(())
}

fn unwire_vscode(home: &Path) -> Result<()> {
    let path = home.join(".copilot/hooks/reflect.json");
    if path.is_file() {
        fs::remove_file(&path)?;
        println!("  removed {}", path.display());
    }
    // Also remove legacy agent-gate hook file if present
    let legacy = home.join(".copilot/hooks/agent-gate.json");
    if legacy.is_file() {
        fs::remove_file(&legacy)?;
        println!("  removed legacy {}", legacy.display());
    }
    Ok(())
}

/// Install the thin OpenCode plugin that shells out to reflect on session events.
fn wire_opencode(home: &Path, catalog: &Path) -> Result<()> {
    let src = catalog.join("vendors/opencode/plugins/reflect.ts");
    if !src.is_file() {
        return Err(ReflectError::install(format!(
            "OpenCode plugin source missing: {}",
            src.display()
        )));
    }
    let dest_dir = home.join(".config/opencode/plugins");
    fs::create_dir_all(&dest_dir)?;
    let dest = dest_dir.join("reflect.ts");
    fs::copy(&src, &dest)?;
    // Drop legacy gate plugin if present
    for name in ["agent-gate.ts", "agent-gate.js"] {
        let legacy = dest_dir.join(name);
        if legacy.is_file() {
            fs::remove_file(&legacy)?;
            println!("  removed legacy {}", legacy.display());
        }
    }
    println!("  opencode plugin → {}", dest.display());
    Ok(())
}

fn unwire_opencode(home: &Path) -> Result<()> {
    let path = home.join(".config/opencode/plugins/reflect.ts");
    if path.is_file() {
        fs::remove_file(&path)?;
        println!("  removed {}", path.display());
    }
    Ok(())
}

fn strip_reflect_commands(hooks: &mut serde_json::Map<String, Value>, keys: &[&str]) {
    for key in keys {
        let remove = hooks.get(*key).is_some_and(value_mentions_reflect);
        if remove {
            hooks.remove(*key);
        }
    }
}

fn value_mentions_reflect(v: &Value) -> bool {
    match v {
        Value::String(s) => s.contains("reflect"),
        Value::Array(arr) => arr.iter().any(value_mentions_reflect),
        Value::Object(map) => map.values().any(value_mentions_reflect),
        _ => false,
    }
}

fn read_json_object(path: &Path) -> Result<Value> {
    if !path.is_file() {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        return Ok(json!({}));
    }
    let raw = fs::read_to_string(path)?;
    // settings.json may be JSONC — strip // comments naively for our keys
    let stripped = strip_line_comments(&raw);
    let v: Value = serde_json::from_str(&stripped).unwrap_or_else(|_| json!({}));
    if v.is_object() {
        Ok(v)
    } else {
        Ok(json!({}))
    }
}

fn strip_line_comments(s: &str) -> String {
    s.lines()
        .map(|line| {
            let trimmed = line.trim_start();
            if trimmed.starts_with("//") {
                ""
            } else {
                line
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn write_json(path: &Path, v: &Value) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let raw = serde_json::to_string_pretty(v)?;
    fs::write(path, format!("{raw}\n"))?;
    Ok(())
}

/// Resolve path to the reflect binary to install (copy source → dest).
pub fn install_binary(src: &Path, dest: &Path) -> Result<()> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::copy(src, dest)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(dest)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(dest, perms)?;
    }
    Ok(())
}

/// Build release binary via cargo in the crate directory.
pub fn build_release(crate_dir: &Path) -> Result<PathBuf> {
    let status = Command::new("cargo")
        .args(["build", "--release"])
        .current_dir(crate_dir)
        .status()?;
    if !status.success() {
        return Err(ReflectError::install("cargo build --release failed"));
    }
    Ok(crate_dir.join("target/release/reflect"))
}
