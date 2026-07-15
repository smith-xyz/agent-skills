/// Example: documenting ownership and borrowing at function boundaries so
/// callers understand the contract. Use this style in public APIs and
/// non-obvious functions.

pub struct Buffer(Vec<u8>);

impl Buffer {
    /// Takes ownership of `data`. Caller must not use `data` after the call.
    /// Use when the function needs to store or mutate the buffer long-term.
    pub fn from_owned(data: Vec<u8>) -> Self {
        Self(data)
    }

    /// Borrows `data`; does not take ownership. Caller retains ownership and
    /// can reuse `data` after the call. Use when the function only needs a
    /// temporary view.
    pub fn process_borrowed(data: &[u8]) -> usize {
        data.len()
    }

    /// Returns a reference tied to `self`'s lifetime. Caller must not outlive
    /// this buffer. Do not call if you need to store the slice longer than
    /// the buffer.
    pub fn as_slice(&self) -> &[u8] {
        &self.0
    }

    /// Consumes `self` and returns the inner buffer. Caller owns the returned
    /// `Vec` and can reuse or extend it. Use when transferring ownership out.
    pub fn into_inner(self) -> Vec<u8> {
        self.0
    }
}
