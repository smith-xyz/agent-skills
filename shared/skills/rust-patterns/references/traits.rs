use std::fmt;
use std::str::FromStr;

pub struct UserId(String);

impl From<String> for UserId {
    fn from(s: String) -> Self {
        Self(s)
    }
}

impl From<&str> for UserId {
    fn from(s: &str) -> Self {
        Self(s.to_string())
    }
}

impl AsRef<str> for UserId {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, PartialEq)]
pub struct ParseError(String);

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "parse error: {}", self.0)
    }
}

impl std::error::Error for ParseError {}

pub struct Config {
    pub host: String,
    pub port: u16,
}

impl FromStr for Config {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parts: Vec<&str> = s.split(':').collect();
        if parts.len() != 2 {
            return Err(ParseError("expected host:port".into()));
        }
        let port = parts[1]
            .parse()
            .map_err(|_| ParseError("invalid port".into()))?;
        Ok(Self {
            host: parts[0].to_string(),
            port,
        })
    }
}

impl fmt::Display for Config {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.host, self.port)
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "localhost".into(),
            port: 8080,
        }
    }
}

pub struct Wrapper<T>(T);

impl<T> std::ops::Deref for Wrapper<T> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> std::ops::DerefMut for Wrapper<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

pub enum Status {
    Active,
    Inactive,
    Pending,
}

impl TryFrom<&str> for Status {
    type Error = ParseError;

    fn try_from(s: &str) -> Result<Self, Self::Error> {
        match s.to_lowercase().as_str() {
            "active" => Ok(Self::Active),
            "inactive" => Ok(Self::Inactive),
            "pending" => Ok(Self::Pending),
            _ => Err(ParseError(format!("unknown status: {}", s))),
        }
    }
}

impl TryFrom<i32> for Status {
    type Error = ParseError;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::Inactive),
            1 => Ok(Self::Active),
            2 => Ok(Self::Pending),
            _ => Err(ParseError(format!("invalid status code: {}", value))),
        }
    }
}
