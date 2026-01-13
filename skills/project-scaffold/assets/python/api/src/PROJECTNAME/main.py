#!/usr/bin/env python3
"""PROJECTNAME API entry point."""

import logging

import uvicorn

from PROJECTNAME.config import settings

logger = logging.getLogger(__name__)


def main() -> None:
    """Start the API server."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    logger.info(f"Starting PROJECTNAME API on port {settings.port}")

    uvicorn.run(
        "PROJECTNAME.app:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.env == "development",
    )


if __name__ == "__main__":
    main()
