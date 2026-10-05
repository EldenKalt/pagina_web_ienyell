import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    env: {
      DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:1/invalid',
      DIRECT_URL: 'postgresql://invalid:invalid@127.0.0.1:1/invalid'
    }
  }
});
