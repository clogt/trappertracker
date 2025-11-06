import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: '@cloudflare/vitest-pool-workers',
    include: ['test/**/*.test.js'],
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.toml',
          environment: 'default',
        },
      },
    },
  },
});