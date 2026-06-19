import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      // Match the tsconfig "@/*" path alias.
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // `server-only` throws outside RSC; swap it for a no-op in tests.
      'server-only': fileURLToPath(new URL('./test/empty.ts', import.meta.url)),
    },
  },
})
