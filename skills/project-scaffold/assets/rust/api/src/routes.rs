use axum::{routing::get, Json, Router};
use serde::Serialize;

pub fn router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/api/v1", get(root))
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".into(),
    })
}

#[derive(Serialize)]
struct RootResponse {
    message: String,
}

async fn root() -> Json<RootResponse> {
    Json(RootResponse {
        message: "PROJECTNAME API".into(),
    })
}
