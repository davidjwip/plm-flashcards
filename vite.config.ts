import { defineConfig } from 'vite';

// Relative base so the same `dist/` works on GitHub Pages today and Cloudflare
// Pages later, from any sub-path. No host-specific config in the app.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
});
