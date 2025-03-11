import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'static/client',
  server: {
    hmr: false,
    allowedHosts: ['torch-zigzag-zinnia.glitch.me'],
    hmr: {
      clientPort: 443
    },
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
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
      '@shared': path.resolve(__dirname, 'static/shared'),
    }
  },  
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // Smaller chunks
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'static/client/index.html')
      }
    },
    // Reduce sourcemap size
    sourcemap: false,
    
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/],
    }
  }
});