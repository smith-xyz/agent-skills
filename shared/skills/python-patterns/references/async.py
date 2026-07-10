"""Async patterns with asyncio."""

import asyncio
from typing import Awaitable, Callable, TypeVar

T = TypeVar("T")


async def gather_with_limit(coros: list[Awaitable[T]], limit: int) -> list[T]:
    """Run coroutines with concurrency limit."""
    semaphore = asyncio.Semaphore(limit)

    async def limited(coro: Awaitable[T]) -> T:
        async with semaphore:
            return await coro

    return await asyncio.gather(*[limited(c) for c in coros])


async def retry(
    fn: Callable[[], Awaitable[T]],
    attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
) -> T:
    """Retry async function with exponential backoff."""
    last_error: Exception | None = None

    for i in range(attempts):
        try:
            return await fn()
        except Exception as e:
            last_error = e
            if i < attempts - 1:
                await asyncio.sleep(delay * (backoff**i))

    raise last_error  # type: ignore


async def timeout(coro: Awaitable[T], seconds: float) -> T:
    """Run coroutine with timeout."""
    return await asyncio.wait_for(coro, timeout=seconds)


class AsyncWorker:
    """Async worker processing items from queue."""

    def __init__(self, handler: Callable[[T], Awaitable[None]], workers: int = 4):
        self.handler = handler
        self.workers = workers
        self.queue: asyncio.Queue[T] = asyncio.Queue()
        self._tasks: list[asyncio.Task] = []

    async def start(self):
        """Start worker tasks."""
        self._tasks = [asyncio.create_task(self._worker()) for _ in range(self.workers)]

    async def _worker(self):
        """Process items from queue."""
        while True:
            item = await self.queue.get()
            try:
                await self.handler(item)
            finally:
                self.queue.task_done()

    async def submit(self, item: T):
        """Add item to queue."""
        await self.queue.put(item)

    async def wait(self):
        """Wait for all items to be processed."""
        await self.queue.join()

    async def stop(self):
        """Stop all workers."""
        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
