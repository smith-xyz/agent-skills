"""Concise Python idioms and patterns."""

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel


# --- Data Models ---


class ApiResponse(BaseModel):
    """Use pydantic for external/API data."""

    id: str
    data: dict[str, Any]


@dataclass
class Config:
    """Use dataclass for internal data."""

    env: str
    port: int = 8080


# --- Class Structure ---


class Service:
    """Service with dependency injection."""

    def __init__(self, client: Any, config: Config):
        self.client = client
        self.config = config

    def process(self, items: list[Any]) -> list[Any]:
        return [self._transform(item) for item in items if item.valid]

    def _transform(self, item: Any) -> Any: ...


# --- Concise Idioms ---


def idioms_examples():
    items = []
    condition = True
    x, y = 1, 2

    # Conditional assignment
    value = x if condition else y

    # Dict/list comprehensions
    filtered_dict = {k: v for k, v in {}.items() if v}
    names = [x.name for x in items if x.active]

    # Unpacking
    first, *rest = items
    a, b = (1, 2)

    # Walrus operator
    import re

    pattern = re.compile(r"\d+")
    text = "123"
    if match := pattern.search(text):
        print(match.group())

    # One-liner methods
    class Example:
        status = "active"

        def is_valid(self) -> bool:
            return self.status == "active"


# --- Error Handling ---


class ServiceError(Exception):
    """Custom exception with context."""

    pass


class RequestError(Exception):
    pass


class DataFetcher:
    def __init__(self, client: Any):
        self.client = client

    def fetch(self, id: str) -> dict:
        try:
            return self.client.get(id)
        except RequestError as e:
            raise ServiceError(f"failed to fetch {id}") from e


# --- Minimal Logging ---

import logging

logger = logging.getLogger(__name__)


def process_items(items: list) -> None:
    # Only log meaningful events
    logger.info(f"Processing {len(items)} items")
    try:
        for item in items:
            pass  # process
    except Exception as e:
        logger.error(f"Failed to process: {e}")
