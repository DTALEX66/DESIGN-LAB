// SPDX-License-Identifier: MIT
// DESIGN-LAB Workbench Vite build (taskpack 24/25/26 / UCR-E).
// Emits a single deterministic, un-minified ES file `build/main.js` that is
// loaded two ways and must therefore carry NO top-level import/export:
//   1. the browser, via index.html <script type="module" src="/workbench/main.js">
//   2. the native-UI contract tests, via node vm.runInContext (classic script).
// main.ts keeps zero RUNTIME imports (only `import type`, erased at build), so
// the output is plain statements: valid both as an ES module and a classic script.
// minify is OFF: the tests read top-level function names and UI text, and a
// mangled bundle would silently break the contract. The workbench-gate CI job
// rebuilds and asserts `git diff --exit-code` over build/ (no drift), so the
// committed artifact stays the source of truth (MiniGame committed-bundle pattern).
import { defineConfig } from 'vite';

export default defineConfig({
  base: '',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    minify: false,
    target: 'es2022',
    rollupOptions: {
      input: 'main.ts',
      output: {
        format: 'es',
        entryFileNames: 'main.js',
        chunkFileNames: 'chunks/[name].js',
        inlineDynamicImports: true,
      },
    },
  },
});
