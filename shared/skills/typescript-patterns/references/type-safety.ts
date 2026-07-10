/** Type safety patterns — see typescript-patterns SKILL.md */

export type UserId = string & { readonly __brand: 'UserId' };

export function userId(raw: string): UserId {
  return raw as UserId;
}

export interface User {
  id: UserId;
  name: string;
}

export function isUser(v: unknown): v is User {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.name === 'string';
}

export function first<T>(items: T[]): T | undefined {
  return items[0];
}
