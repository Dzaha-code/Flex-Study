import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Rust build output. `build/**` above only covers the root, so the Tauri
    // codegen assets under src-tauri/target/release/build were being linted as
    // if they were our source.
    "src-tauri/**",
    // Node's module compile cache (gitignored, but ESLint 9 does not read
    // .gitignore). ~2.9k generated files; linting them took the run from
    // seconds to six minutes.
    "node-compile-cache/**",
  ]),
]);

export default eslintConfig;
