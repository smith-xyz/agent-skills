"""Configuration module for PROJECTNAME."""

import os
from dataclasses import dataclass


@dataclass
class Config:
    """Application configuration loaded from environment."""

    env: str

    @classmethod
    def load(cls) -> "Config":
        """Load configuration from environment variables."""
        return cls(
            env=os.getenv("ENV", "development"),
        )
