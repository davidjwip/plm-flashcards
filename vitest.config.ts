import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // types.ts is type-only: v8 lists it at 0% because it has no runtime
      // statements, which says nothing about the code being tested.
      exclude: ['src/**/*.test.ts', 'src/types.ts'],
      reporter: ['text', 'json-summary'],
      // Dave's floor. Statements, lines and functions at 80; branches a little
      // lower because the defensive catch blocks are hard to reach honestly.
      thresholds: { statements: 80, lines: 80, functions: 80, branches: 70 },
    },
  },
});
