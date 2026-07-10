export class Mutex {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<() => void> {
    if (this.locked) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.locked = true;
    return () => {
      this.locked = false;
      this.queue.shift()?.();
    };
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export class Semaphore {
  private count: number;
  private queue: (() => void)[] = [];

  constructor(private limit: number) {
    this.count = limit;
  }

  async acquire(): Promise<() => void> {
    if (this.count <= 0) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.count--;
    return () => {
      this.count++;
      this.queue.shift()?.();
    };
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const semaphore = new Semaphore(limit);
  return Promise.all(
    items.map((item, i) => semaphore.run(() => fn(item, i))),
  );
}
