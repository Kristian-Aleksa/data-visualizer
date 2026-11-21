/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { runtimePlugin } from './scripts/vite-runtime-plugin.ts';

export default defineConfig({
  plugins: [react(), runtimePlugin()],
  server: { port: 5173 },
  build: {
    // The largest file (~710 kB) is the video encoder (Mediabunny). It only loads when someone
    // exports a video, so it doesn't slow down the site.
    chunkSizeWarningLimit: 800,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    // the app registers every font's letter widths at start-up; the tests do the same
    setupFiles: ['tests/unit/setup.ts'],
    environment: 'node',
  },
});
