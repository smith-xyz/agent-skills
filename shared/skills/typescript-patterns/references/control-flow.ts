/** Control flow — see typescript-patterns SKILL.md */

type Status = 'pending' | 'active' | 'archived';

// Guard clauses: flat, early return
export function activateUser(user: { active: boolean } | null): string {
  if (!user) return 'missing';
  if (user.active) return 'already-active';
  user.active = true;
  return 'activated';
}

// Separate if branches, each returns
export function routeStatus(status: Status): string {
  if (status === 'pending') return 'queue';
  if (status === 'active') return 'run';
  if (status === 'archived') return 'skip';
  const _exhaustive: never = status;
  return _exhaustive;
}

// Discriminated union: switch when mapping many variants
export function describe(event: { type: 'created'; id: string } | { type: 'deleted'; id: string }): string {
  switch (event.type) {
    case 'created':
      return `created ${event.id}`;
    case 'deleted':
      return `deleted ${event.id}`;
  }
}

// for...of with continue
export function sumActive(ids: string[], lookup: (id: string) => number | undefined): number {
  let total = 0;
  for (const id of ids) {
    const value = lookup(id);
    if (value === undefined) continue;
    total += value;
  }
  return total;
}

// Generator for lazy / paginated sequences
export function* range(start: number, end: number): Generator<number> {
  for (let n = start; n < end; n += 1) yield n;
}

export function* chunk<T>(items: Iterable<T>, size: number): Generator<T[]> {
  let batch: T[] = [];
  for (const item of items) {
    batch.push(item);
    if (batch.length >= size) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length > 0) yield batch;
}

// map / filter over iterables
export function activeUserEmails(users: Iterable<{ active: boolean; email: string }>): string[] {
  return [...users].filter((u) => u.active).map((u) => u.email);
}

// for...of + continue; async pagination → see async.ts paginate()
export async function collectIds(
  ids: string[],
  find: (id: string) => Promise<{ id: string } | null>,
): Promise<{ id: string }[]> {
  const results: { id: string }[] = [];
  for (const id of ids) {
    const row = await find(id);
    if (!row) continue;
    results.push(row);
  }
  return results;
}
