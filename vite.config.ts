import { defineConfig } from 'vite';
import type { UserConfig as VitestUserConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

const testConfig: VitestUserConfig['test'] = {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/setupTests.ts',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    include: ['src/**/*.{ts,tsx}'],
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/pitch-songs/' : '/',
  build: {
    // Generate sourcemaps for production debugging
    sourcemap: false,
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          'react-vendor': ['react', 'react-dom'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'audio-vendor': ['@breezystack/lamejs'],
        },
      },
    },
    // Increase chunk size warning limit (audio processing requires larger chunks)
    chunkSizeWarningLimit: 1000,
  },
  // @ts-expect-error - Vitest config field not in Vite types
  test: testConfig,
});
