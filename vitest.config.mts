import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Domain logic under src/domain is pure TypeScript with no React or DOM
// dependency, so tests run in a plain node environment and stay fast.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
