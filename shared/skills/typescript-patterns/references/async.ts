export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = 'Timeout',
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms),
  );
  return Promise.race([promise, timeout]);
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delay?: number; backoff?: number } = {},
): Promise<T> {
  const { attempts = 3, delay = 1000, backoff = 2 } = options;
  let lastError: Error | undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(backoff, i)));
      }
    }
  }
  throw lastError;
}

export async function* paginate<T, C = string>(
  fetchPage: (cursor?: C) => Promise<{ data: T[]; next?: C }>,
): AsyncGenerator<T> {
  let cursor: C | undefined;
  do {
    const { data, next } = await fetchPage(cursor);
    for (const item of data) yield item;
    cursor = next;
  } while (cursor);
}

export async function collect<T>(gen: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of gen) results.push(item);
  return results;
}

export function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function debounceAsync<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  ms: number,
): (...args: T) => Promise<R> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pending: { resolve: (v: R) => void; reject: (e: unknown) => void }[] = [];

  return (...args: T) => {
    return new Promise<R>((resolve, reject) => {
      pending.push({ resolve, reject });

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const batch = pending;
        pending = [];
        try {
          const result = await fn(...args);
          batch.forEach((p) => p.resolve(result));
        } catch (err) {
          batch.forEach((p) => p.reject(err));
        }
      }, ms);
    });
  };
}
