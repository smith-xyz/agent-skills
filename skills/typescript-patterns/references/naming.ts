/**
 * Interface + class naming — see typescript-patterns SKILL.md
 */

import type { User } from './layout';

/** Port: role the type plays in the system */
export interface UserRepository {
  find(id: string): Promise<User | null>;
}

/** Adapter: implementation named by technology or storage */
export class PostgresUserRepository implements UserRepository {
  async find(id: string): Promise<User | null> {
    return null;
  }
}

export class InMemoryUserRepository implements UserRepository {
  #users = new Map<string, User>();

  async find(id: string): Promise<User | null> {
    return this.#users.get(id) ?? null;
  }
}

/** Service: orchestration class; depends on the port interface */
export class UserService {
  constructor(private readonly users: UserRepository) {}

  async get(id: string): Promise<User | null> {
    return this.users.find(id);
  }
}

/** Test double: name describes test role */
export class FakeUserRepository implements UserRepository {
  async find(_id: string): Promise<User | null> {
    return { id: '1', email: 'test@example.com' };
  }
}
