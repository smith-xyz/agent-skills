use std::env;

pub struct Config {
    pub port: u16,
    pub env: String,
}

impl Config {
    pub fn load() -> Self {
        Self {
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8080),
            env: env::var("ENV").unwrap_or_else(|_| "development".into()),
        }
    }
}
