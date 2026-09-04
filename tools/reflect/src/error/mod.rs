use std::io;
use std::path::PathBuf;

use thiserror::Error;

/// Library errors for reflect. Application code wraps these with anyhow.
#[derive(Error, Debug)]
pub enum ReflectError {
    #[error("invalid configuration: {0}")]
    Config(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("ledger error: {0}")]
    Ledger(String),

    #[error("review error: {0}")]
    Review(String),

    #[error("install error: {0}")]
    Install(String),

    #[error("failed to parse JSON: {0}")]
    Json(#[from] serde_json::Error),

    #[error(transparent)]
    Io(#[from] io::Error),

    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
}

impl ReflectError {
    pub fn config(msg: impl Into<String>) -> Self {
        Self::Config(msg.into())
    }

    pub fn not_found(what: impl Into<String>) -> Self {
        Self::NotFound(what.into())
    }

    pub fn ledger(msg: impl Into<String>) -> Self {
        Self::Ledger(msg.into())
    }

    pub fn review(msg: impl Into<String>) -> Self {
        Self::Review(msg.into())
    }

    pub fn install(msg: impl Into<String>) -> Self {
        Self::Install(msg.into())
    }

    pub fn path_io(path: impl Into<PathBuf>, err: io::Error) -> Self {
        let _ = path;
        Self::Io(err)
    }
}

pub type Result<T> = std::result::Result<T, ReflectError>;
