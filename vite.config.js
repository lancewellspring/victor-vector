import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'static/client',
  server: {
    hmr: {
      // This is critical for Glitch to work with Vite
      clientPort: 443,
      port: 3000
    },
    // More permissive host setting for Glitch's environment
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // Allow all Glitch domains
    cors: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'static/shared'),
    }
  },  
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'static/client/index.html')
      }
    }
  }
});