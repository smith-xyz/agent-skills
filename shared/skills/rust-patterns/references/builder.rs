use thiserror::Error;

#[derive(Error, Debug)]
pub enum BuilderError {
    #[error("missing required field: {0}")]
    MissingField(&'static str),
    #[error("invalid value for {field}: {reason}")]
    InvalidValue { field: &'static str, reason: String },
}

pub struct Client {
    url: String,
    timeout: u64,
    retries: u32,
}

#[derive(Default)]
pub struct ClientBuilder {
    url: Option<String>,
    timeout: Option<u64>,
    retries: Option<u32>,
}

impl Client {
    pub fn builder() -> ClientBuilder {
        ClientBuilder::default()
    }
}

impl ClientBuilder {
    pub fn url(mut self, url: impl Into<String>) -> Self {
        self.url = Some(url.into());
        self
    }

    pub fn timeout(mut self, timeout: u64) -> Self {
        self.timeout = Some(timeout);
        self
    }

    pub fn retries(mut self, retries: u32) -> Self {
        self.retries = Some(retries);
        self
    }

    pub fn build(self) -> Result<Client, BuilderError> {
        let url = self.url.ok_or(BuilderError::MissingField("url"))?;

        if url.is_empty() {
            return Err(BuilderError::InvalidValue {
                field: "url",
                reason: "cannot be empty".into(),
            });
        }

        Ok(Client {
            url,
            timeout: self.timeout.unwrap_or(30),
            retries: self.retries.unwrap_or(3),
        })
    }
}

#[derive(Default)]
pub struct TypesafeBuilder<U> {
    url: U,
    timeout: u64,
}

pub struct NoUrl;
pub struct HasUrl(String);

impl TypesafeBuilder<NoUrl> {
    pub fn new() -> Self {
        Self { url: NoUrl, timeout: 30 }
    }

    pub fn url(self, url: impl Into<String>) -> TypesafeBuilder<HasUrl> {
        TypesafeBuilder {
            url: HasUrl(url.into()),
            timeout: self.timeout,
        }
    }
}

impl TypesafeBuilder<HasUrl> {
    pub fn timeout(mut self, timeout: u64) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn build(self) -> Client {
        Client {
            url: self.url.0,
            timeout: self.timeout,
            retries: 3,
        }
    }
}
