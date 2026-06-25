import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: process.env.NODE_ENV === 'production' ? '/reverie/' : '/',
  build: {
    sourcemap: false,
    rollupOptions: {
      // Split vendor code into stable chunks for long-term caching. i18n is matched
      // before react so react-i18next lands in the i18n chunk, not the react one.
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('i18next')) return 'i18n-vendor';
          if (id.includes('react')) return 'react-vendor';
          if (id.includes('lamejs')) return 'audio-vendor';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
    },
  },
});
