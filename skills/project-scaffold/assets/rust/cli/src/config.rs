use std::env;

pub struct Config {
    pub env: String,
}

impl Config {
    pub fn load() -> Self {
        Self {
            env: env::var("ENV").unwrap_or_else(|_| "development".into()),
        }
    }
}
