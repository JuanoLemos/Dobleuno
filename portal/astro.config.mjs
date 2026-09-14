import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://portal.dobleuno.app',
  output: 'static',
  build: {
    format: 'directory',
  },
  server: {
    port: 4321,
    host: '0.0.0.0',
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        // No vigilar el directorio data/ del padre — se regenera vía orchestrator
        ignored: ['**/data/raw/**', '**/data/processed/**', '**/data/translated/**'],
      },
    },
  },
});
