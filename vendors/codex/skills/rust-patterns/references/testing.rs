use std::sync::Arc;
use tokio::sync::Mutex;

pub trait Repository: Send + Sync {
    fn find(&self, id: &str) -> Option<String>;
    fn save(&self, id: &str, value: &str);
}

#[derive(Default)]
pub struct MockRepository {
    pub calls: Arc<Mutex<Vec<String>>>,
    pub responses: Arc<Mutex<std::collections::HashMap<String, String>>>,
}

impl MockRepository {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_response(self, id: &str, value: &str) -> Self {
        let responses = self.responses.clone();
        tokio::runtime::Handle::current().block_on(async {
            responses.lock().await.insert(id.to_string(), value.to_string());
        });
        self
    }
}

impl Repository for MockRepository {
    fn find(&self, id: &str) -> Option<String> {
        let responses = self.responses.clone();
        let calls = self.calls.clone();
        let id = id.to_string();
        tokio::runtime::Handle::current().block_on(async {
            calls.lock().await.push(format!("find:{}", id));
            responses.lock().await.get(&id).cloned()
        })
    }

    fn save(&self, id: &str, value: &str) {
        let calls = self.calls.clone();
        let responses = self.responses.clone();
        let id = id.to_string();
        let value = value.to_string();
        tokio::runtime::Handle::current().block_on(async {
            calls.lock().await.push(format!("save:{}:{}", id, value));
            responses.lock().await.insert(id, value);
        });
    }
}

pub struct TestFixture {
    pub repo: Arc<MockRepository>,
}

impl TestFixture {
    pub fn new() -> Self {
        Self {
            repo: Arc::new(MockRepository::new()),
        }
    }

    pub async fn assert_called(&self, expected: &str) {
        let calls = self.repo.calls.lock().await;
        assert!(
            calls.iter().any(|c| c.contains(expected)),
            "expected call containing '{}', got {:?}",
            expected,
            *calls
        );
    }
}

impl Default for TestFixture {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_repository() {
        let mock = MockRepository::new();
        mock.save("1", "value1");
        assert_eq!(mock.find("1"), Some("value1".to_string()));
        assert_eq!(mock.find("2"), None);
    }

    #[test]
    fn test_table_driven() {
        let cases = [
            ("input1", "expected1"),
            ("input2", "expected2"),
        ];

        for (input, expected) in cases {
            let result = process(input);
            assert_eq!(result, expected, "failed for input: {}", input);
        }
    }

    fn process(input: &str) -> &str {
        match input {
            "input1" => "expected1",
            "input2" => "expected2",
            _ => "unknown",
        }
    }
}
