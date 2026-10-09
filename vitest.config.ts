import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
    // plugins/ holds the Expo config plugins; their tests are colocated there
    // like every other test in the repo, so the glob has to reach outside src/.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'plugins/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
