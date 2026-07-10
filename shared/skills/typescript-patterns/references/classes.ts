/** Class patterns — see typescript-patterns SKILL.md */

export interface Clock {
  now(): Date;
}

// # private field for internal state
export class Cache {
  #entries = new Map<string, string>();

  get(key: string): string | undefined {
    return this.#entries.get(key);
  }

  set(key: string, value: string): void {
    this.#entries.set(key, value);
  }
}

// Parameter properties: declare + assign in constructor
export class OrderService {
  constructor(
    private readonly repo: { find(id: string): Promise<unknown> },
    private readonly clock: Clock,
  ) {}

  async getCreatedAt(id: string): Promise<Date> {
    await this.repo.find(id);
    return this.clock.now();
  }
}

// # private fields: runtime-private
export class TokenBucket {
  #tokens: number;
  #lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerMs: number,
  ) {
    this.#tokens = capacity;
    this.#lastRefill = Date.now();
  }

  tryTake(): boolean {
    this.#refill();
    if (this.#tokens < 1) return false;
    this.#tokens -= 1;
    return true;
  }

  #refill(): void {
    const now = Date.now();
    const elapsed = now - this.#lastRefill;
    this.#tokens = Math.min(
      this.capacity,
      this.#tokens + elapsed * this.refillPerMs,
    );
    this.#lastRefill = now;
  }
}

// Getters for derived fields; setters validate on assign
export class Email {
  constructor(private readonly raw: string) {}

  get value(): string {
    return this.raw.trim().toLowerCase();
  }

  get domain(): string {
    return this.value.split('@')[1] ?? '';
  }
}

export class Percentage {
  #value: number;

  constructor(initial: number) {
    this.value = initial;
  }

  get value(): number {
    return this.#value;
  }

  set value(next: number) {
    if (!Number.isFinite(next) || next < 0 || next > 100) {
      throw new RangeError('percentage must be 0–100');
    }
    this.#value = next;
  }
}

// protected hooks for subclasses
export abstract class BaseRepository<T> {
  constructor(protected readonly tableName: string) {}

  protected abstract rowToModel(row: unknown): T;

  findAll(): T[] {
    return [];
  }
}

// static factory when construction is non-trivial
export class ApiClient {
  private constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  static create(baseUrl: string, token: string): ApiClient {
    return new ApiClient(baseUrl, token);
  }
}
