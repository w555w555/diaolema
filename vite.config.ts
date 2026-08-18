import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { ingestPlugin } from './src/vite-plugin-ingest';

export default defineConfig({
  plugins: [react(), ingestPlugin()],
  server: {
    host: true,
    headers: {
      'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=()',
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
    headers: {
      'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=()',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
