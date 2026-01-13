"""Configuration module for PROJECTNAME."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    env: str = "development"
    port: int = 8000

    class Config:
        """Pydantic settings configuration."""

        env_file = ".env"


settings = Settings()
