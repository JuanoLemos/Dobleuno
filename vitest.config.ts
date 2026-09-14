import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    // Solo el pipeline: los workspaces tienen su propio vitest y correrlos
    // desde acá los ejecutaría dos veces, con la config equivocada.
    include: ['scripts/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
