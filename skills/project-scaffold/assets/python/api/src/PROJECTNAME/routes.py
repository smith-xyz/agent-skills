"""API routes for PROJECTNAME."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")


@router.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "PROJECTNAME API"}
