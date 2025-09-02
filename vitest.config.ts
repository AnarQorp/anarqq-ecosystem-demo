import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    timeout: 300000, // 5 minutes for integration tests
    testTimeout: 300000, // 5 minutes per test
    hookTimeout: 60000, // 1 minute for setup/teardown
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/**/*.test.ts', 'dist/']
    },
    // Integration test specific configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Run integration tests sequentially
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});