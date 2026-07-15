use std::time::Duration;
use tokio::sync::{mpsc, oneshot};
use tokio::time::timeout;

pub async fn with_timeout<T, F>(duration: Duration, f: F) -> Result<T, tokio::time::error::Elapsed>
where
    F: std::future::Future<Output = T>,
{
    timeout(duration, f).await
}

pub async fn spawn_with_handle<T, F>(f: F) -> T
where
    T: Send + 'static,
    F: std::future::Future<Output = T> + Send + 'static,
{
    tokio::spawn(f).await.expect("task panicked")
}

pub struct Worker<T> {
    tx: mpsc::Sender<T>,
    shutdown: Option<oneshot::Sender<()>>,
}

impl<T: Send + 'static> Worker<T> {
    pub fn new<F, Fut>(buffer: usize, handler: F) -> Self
    where
        F: Fn(T) -> Fut + Send + 'static,
        Fut: std::future::Future<Output = ()> + Send,
    {
        let (tx, mut rx) = mpsc::channel::<T>(buffer);
        let (shutdown_tx, mut shutdown_rx) = oneshot::channel();

        tokio::spawn(async move {
            loop {
                tokio::select! {
                    Some(item) = rx.recv() => {
                        handler(item).await;
                    }
                    _ = &mut shutdown_rx => {
                        while let Some(item) = rx.recv().await {
                            handler(item).await;
                        }
                        break;
                    }
                }
            }
        });

        Self { tx, shutdown: Some(shutdown_tx) }
    }

    pub async fn send(&self, item: T) -> Result<(), mpsc::error::SendError<T>> {
        self.tx.send(item).await
    }

    pub async fn shutdown(mut self) {
        if let Some(tx) = self.shutdown.take() {
            let _ = tx.send(());
        }
    }
}

pub async fn select_first<T>(
    futures: Vec<impl std::future::Future<Output = T>>,
) -> T {
    use futures::future::select_all;
    let (result, _, _) = select_all(futures).await;
    result
}

pub async fn retry<T, E, F, Fut>(
    attempts: u32,
    delay: Duration,
    mut f: F,
) -> Result<T, E>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T, E>>,
{
    let mut last_err = None;
    for i in 0..attempts {
        match f().await {
            Ok(v) => return Ok(v),
            Err(e) => {
                last_err = Some(e);
                if i < attempts - 1 {
                    tokio::time::sleep(delay * 2u32.pow(i)).await;
                }
            }
        }
    }
    Err(last_err.unwrap())
}

pub struct GracefulShutdown {
    notify: tokio::sync::broadcast::Sender<()>,
}

impl GracefulShutdown {
    pub fn new() -> Self {
        let (notify, _) = tokio::sync::broadcast::channel(1);
        Self { notify }
    }

    pub fn subscribe(&self) -> tokio::sync::broadcast::Receiver<()> {
        self.notify.subscribe()
    }

    pub fn trigger(&self) {
        let _ = self.notify.send(());
    }
}

impl Default for GracefulShutdown {
    fn default() -> Self {
        Self::new()
    }
}
