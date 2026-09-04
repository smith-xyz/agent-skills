mod sqlite;

pub use sqlite::SqliteLedgerStore;

use crate::error::Result;
use crate::types::Trace;

/// Port for appending and querying session traces.
pub trait LedgerStore {
    fn append_trace(&self, trace: &Trace) -> Result<()>;
    fn recent_traces(&self, limit: usize) -> Result<Vec<Trace>>;
    fn traces_since(&self, iso_prefix: &str) -> Result<Vec<Trace>>;
}
