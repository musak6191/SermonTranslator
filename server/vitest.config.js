import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,ts}'],
    maxWorkers: 1,
    minWorkers: 1,
    server: {
      deps: {
        inline: [/@prisma\/client/, /\.prisma\/client/, /web-push/, /resend/, /@react-email\/render/]
      }
    },
    coverage: {
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['modules/**/*.js'],
      exclude: ['**/node_modules/**', '**/tests/**']
    }
  }
});
