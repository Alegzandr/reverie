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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error Vitest config field
  test: testConfig,
});
