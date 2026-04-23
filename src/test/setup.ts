import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Stub env variables that the app expects so importing modules don't crash
const env = import.meta.env as Record<string, string>
env.VITE_SUPABASE_URL ??= 'https://test.supabase.co'
env.VITE_SUPABASE_ANON_KEY ??= 'test-anon-key'

// Silence noisy logs in tests unless explicitly opted-in
const originalError = console.error
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return
  originalError(...args)
}

// Mock localStorage if not available in jsdom env (it usually is)
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    },
  })
}

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    identify: vi.fn(),
    capture: vi.fn(),
    reset: vi.fn(),
  },
}))
