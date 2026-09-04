use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{ReflectError, Result};

const DEFAULT_HOME: &str = ".agent-skills";

/// Runtime configuration for reflect.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflectConfig {
    pub catalog_path: PathBuf,
    pub ledger_path: PathBuf,
    pub review_dir: PathBuf,
    pub coherence_exempt_skills: Vec<String>,
    /// Vendors to wire on install: claude, cursor, vscode.
    #[serde(default = "default_vendors")]
    pub vendors: Vec<String>,
}

fn default_vendors() -> Vec<String> {
    vec![
        "claude".to_string(),
        "cursor".to_string(),
        "vscode".to_string(),
        "opencode".to_string(),
    ]
}

impl ReflectConfig {
    /// Default paths under `~/.agent-skills`, catalog = agent-skills repo if
    /// discoverable via env or sibling heuristic, else empty (must be set).
    pub fn default_for_home(home: &Path) -> Self {
        let root = home.join(DEFAULT_HOME);
        let catalog = std::env::var_os("REFLECT_CATALOG_PATH")
            .map(PathBuf::from)
            .or_else(|| {
                // When running from a checkout: tools/reflect → repo root
                let exe_related = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
                let repo = exe_related
                    .parent()
                    .and_then(|p| p.parent())
                    .map(Path::to_path_buf);
                repo.filter(|p| p.join("shared/skills").is_dir())
            })
            .unwrap_or_else(|| root.join("catalog-link"));

        Self {
            catalog_path: catalog,
            ledger_path: root.join("ledger/reflect.db"),
            review_dir: root.join("review"),
            coherence_exempt_skills: vec!["deep-research".to_string()],
            vendors: default_vendors(),
        }
    }

    pub fn config_path(home: &Path) -> PathBuf {
        home.join(DEFAULT_HOME).join("reflect.json")
    }

    pub fn load_or_default(home: &Path) -> Result<Self> {
        let path = Self::config_path(home);
        if !path.exists() {
            return Ok(Self::default_for_home(home));
        }
        let raw = fs::read_to_string(&path)?;
        let mut cfg: ReflectConfig = serde_json::from_str(&raw)?;
        cfg.expand_home();
        Ok(cfg)
    }

    pub fn save(&self, home: &Path) -> Result<()> {
        let path = Self::config_path(home);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let raw = serde_json::to_string_pretty(self)?;
        fs::write(&path, format!("{raw}\n"))?;
        Ok(())
    }

    pub fn ensure_dirs(&self) -> Result<()> {
        if let Some(parent) = self.ledger_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::create_dir_all(&self.review_dir)?;
        Ok(())
    }

    fn expand_home(&mut self) {
        self.catalog_path = expand_tilde(&self.catalog_path);
        self.ledger_path = expand_tilde(&self.ledger_path);
        self.review_dir = expand_tilde(&self.review_dir);
    }
}

fn expand_tilde(path: &Path) -> PathBuf {
    let s = path.to_string_lossy();
    if let Some(rest) = s.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    }
    if s == "~" {
        if let Some(home) = dirs::home_dir() {
            return home;
        }
    }
    path.to_path_buf()
}

/// Resolve user home or error.
pub fn user_home() -> Result<PathBuf> {
    dirs::home_dir().ok_or_else(|| ReflectError::config("could not resolve home directory"))
}
