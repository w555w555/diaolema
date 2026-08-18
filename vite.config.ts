import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { ingestPlugin } from './src/vite-plugin-ingest';

const assetHeaders = {
  'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=()',
  'Access-Control-Allow-Origin': '*',
};

export default defineConfig({
  plugins: [
    react(),
    ingestPlugin(),
    {
      name: 'strip-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin(="anonymous")?/g, '');
      },
    },
  ],
  server: {
    host: true,
    headers: assetHeaders,
  },
  preview: {
    host: true,
    allowedHosts: true,
    headers: assetHeaders,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
