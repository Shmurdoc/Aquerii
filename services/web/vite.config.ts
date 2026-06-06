import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: ['node_modules', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.*', 'src/**/*.spec.*'],
    },
  },
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
    // Production builds ship without source maps to avoid leaking TS source.
    // 'hidden' is allowed in dev where you need a built artifact for debugging.
    sourcemap:     process.env.NODE_ENV === 'production' ? false : 'hidden',
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
