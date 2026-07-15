/**
 * Test setup file for Vitest.
 * Copy to: src/test/setup.ts
 * Reference in vite.config.ts: test.setupFiles: ['./src/test/setup.ts']
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Optional: MSW setup
// import { server } from './mocks/server';
// import { beforeAll, afterAll } from 'vitest';
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());
