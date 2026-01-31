import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

const passportPkg = resolve(__dirname, "../passport/package.json");
const hasPassport = existsSync(passportPkg);

export default defineConfig({
  resolve: {
    alias: {
      "@pact/provider-adapter": resolve(__dirname, "../provider-adapter/src/index.ts"),
      "@pact/sdk": resolve(__dirname, "src/index.ts"),
      "@pact/passport": hasPassport
        ? resolve(__dirname, "../passport/src/index.ts")
        : resolve(__dirname, "src/__mocks__/passport-export-stub.ts"),
      "@pact/passport/src/v1/types": hasPassport
        ? resolve(__dirname, "../passport/src/v1/types.ts")
        : resolve(__dirname, "src/__mocks__/passport-v1-types.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".git"],
    // prevents weird worker fetch behavior in some setups
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    hookTimeout: 60_000,
    testTimeout: 60_000,
    teardownTimeout: 10_000,
  },
});
