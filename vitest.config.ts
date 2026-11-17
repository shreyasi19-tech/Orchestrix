import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'server/services/SchedulerService.ts',
        'server/services/WorkerRegistry.ts',
        'server/services/DLQService.ts',
        'server/services/MetricsCollector.ts',
        'server/repositories/JobRepository.ts',
      ],
    },
  },
});
