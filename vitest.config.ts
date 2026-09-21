import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/test/**/*.test.ts", "apps/**/test/**/*.test.ts"],
    globalSetup: ["./packages/db/test/global-setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
