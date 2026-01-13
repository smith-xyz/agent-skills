"""FastAPI application factory."""

from fastapi import FastAPI

from PROJECTNAME.routes import router

app = FastAPI(title="PROJECTNAME")

app.include_router(router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}
