/**
 * Test utilities for React Testing Library.
 * Copy to: src/test/test-utils.tsx
 */
import type { ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

interface WrapperProps {
  children: ReactNode;
}

/**
 * Add your providers here (Theme, Auth, etc.)
 */
function AllProviders({ children }: WrapperProps) {
  return <>{children}</>;
}

/**
 * Custom render that wraps with providers and sets up userEvent.
 */
function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
