"""Common Python patterns - service, repository, factory."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Entity(BaseModel):
    """Base entity with ID."""

    id: str


class Repository(ABC, Generic[T]):
    """Abstract repository pattern."""

    @abstractmethod
    def get(self, id: str) -> Optional[T]: ...

    @abstractmethod
    def save(self, entity: T) -> T: ...

    @abstractmethod
    def delete(self, id: str) -> bool: ...


class InMemoryRepository(Repository[T]):
    """In-memory repository implementation."""

    def __init__(self):
        self._store: dict[str, T] = {}

    def get(self, id: str) -> Optional[T]:
        return self._store.get(id)

    def save(self, entity: T) -> T:
        self._store[entity.id] = entity
        return entity

    def delete(self, id: str) -> bool:
        return self._store.pop(id, None) is not None

    def all(self) -> list[T]:
        return list(self._store.values())


@dataclass
class ServiceResult(Generic[T]):
    """Result wrapper for service operations."""

    success: bool
    data: Optional[T] = None
    error: Optional[str] = None

    @classmethod
    def ok(cls, data: T) -> "ServiceResult[T]":
        return cls(success=True, data=data)

    @classmethod
    def fail(cls, error: str) -> "ServiceResult[T]":
        return cls(success=False, error=error)


class Service(Generic[T]):
    """Base service with repository."""

    def __init__(self, repo: Repository[T]):
        self.repo = repo

    def get(self, id: str) -> ServiceResult[T]:
        if entity := self.repo.get(id):
            return ServiceResult.ok(entity)
        return ServiceResult.fail(f"not found: {id}")

    def create(self, entity: T) -> ServiceResult[T]:
        saved = self.repo.save(entity)
        return ServiceResult.ok(saved)


class Factory(ABC, Generic[T]):
    """Abstract factory pattern."""

    @abstractmethod
    def create(self, **kwargs) -> T: ...


def singleton(cls):
    """Singleton decorator."""
    instances = {}

    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    return get_instance
