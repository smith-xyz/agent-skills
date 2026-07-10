import { EventEmitter } from 'events';

/**
 * Type-safe EventEmitter wrapper.
 * Usage:
 *   interface MyEvents {
 *     'user:created': [user: User];
 *     'error': [error: Error];
 *   }
 *   const emitter = new TypedEventEmitter<MyEvents>();
 */
export class TypedEventEmitter<TEvents extends Record<string, unknown[]>> {
  private emitter = new EventEmitter();

  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): boolean {
    return this.emitter.emit(event as string, ...args);
  }

  on<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this {
    this.emitter.on(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  once<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this {
    this.emitter.once(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  off<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this {
    this.emitter.off(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  removeAllListeners<K extends keyof TEvents>(event?: K): this {
    this.emitter.removeAllListeners(event as string);
    return this;
  }

  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.emitter.listenerCount(event as string);
  }
}
