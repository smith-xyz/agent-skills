/**
 * Result type for explicit error values (ok / err) at call sites.
 */
export interface Result<T, E = Error> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: E;
}

export interface Ok<T> extends Result<T, never> {
  readonly success: true;
  readonly data: T;
  readonly error?: never;
}

export interface Err<E = Error> extends Result<never, E> {
  readonly success: false;
  readonly data?: never;
  readonly error: E;
}

export function ok<T>(data: T): Ok<T> {
  return { success: true, data };
}

export function err<E = Error>(error: E): Err<E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.success;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.success;
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) return result.data;
  throw result.error;
}

export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.data : defaultValue;
}

export async function tryCatch<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export function tryCatchSync<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
