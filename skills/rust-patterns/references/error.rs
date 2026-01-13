use std::path::PathBuf;
use thiserror::Error;

/// Application error types.
/// Use constructor methods for ergonomic error creation.
#[derive(Error, Debug)]
pub enum AppError {
    #[error("failed to read file '{path}': {message}")]
    FileReadError { path: PathBuf, message: String },

    #[error("failed to parse '{path}': {message}")]
    ParseError { path: PathBuf, message: String },

    #[error("invalid configuration: {0}")]
    ConfigError(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error(transparent)]
    Io(#[from] std::io::Error),
}

impl AppError {
    pub fn file_read_error(path: impl Into<PathBuf>, message: impl Into<String>) -> Self {
        Self::FileReadError {
            path: path.into(),
            message: message.into(),
        }
    }

    pub fn parse_error(path: impl Into<PathBuf>, message: impl Into<String>) -> Self {
        Self::ParseError {
            path: path.into(),
            message: message.into(),
        }
    }

    pub fn config_error(message: impl Into<String>) -> Self {
        Self::ConfigError(message.into())
    }

    pub fn not_found(what: impl Into<String>) -> Self {
        Self::NotFound(what.into())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
