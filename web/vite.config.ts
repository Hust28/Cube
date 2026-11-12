import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    viteSingleFile()
  ],
  base: './',
  build: {
    outDir: '../app/src/main/assets/web',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000,
    sourcemap: false
  }
});
