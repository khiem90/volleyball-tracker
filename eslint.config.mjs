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
    // Service-worker files next-pwa writes on each build.
    "public/sw.js",
    "public/workbox-*.js",
    "public/swe-worker-*.js",
    // Claude Code's local settings and worktrees, each with its own node_modules and build.
    // A directory pattern, so ESLint skips the folder instead of walking every file in it.
    ".claude/",
  ]),
]);

export default eslintConfig;
