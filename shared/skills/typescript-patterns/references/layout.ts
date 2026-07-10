/**
 * Type layout examples — see typescript-patterns SKILL.md
 *
 * src/
 * ├── types/              # package-wide
 * ├── user/
 * │   ├── types.ts
 * │   ├── user-service.ts
 * │   └── user-repository.ts
 * └── index.ts
 */

// Same file: interface above class (1:1 contract)
export interface UserRepository {
  find(id: string): Promise<User | null>;
}

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async get(id: string): Promise<User | null> {
    return this.repo.find(id);
  }
}

// Feature folder: types.ts
export interface User {
  id: string;
  email: string;
}

export type UserId = string & { readonly __brand: 'UserId' };
