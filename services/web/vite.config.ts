import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target:      process.env.VITE_API_URL ?? 'http://localhost:8000',
        changeOrigin: true,
      },
      '/socket.io': {
        target:    process.env.VITE_SOCKET_URL ?? 'http://localhost:3001',
        ws:        true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir:        'dist',
    sourcemap:     true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:    ['react', 'react-dom', 'react-router-dom'],
          query:     ['@tanstack/react-query'],
          editor:    ['@blocknote/core', '@blocknote/react', 'yjs'],
          dnd:       ['@hello-pangea/dnd'],
        },
      },
    },
  },
})
