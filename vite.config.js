import { defineConfig } from 'vite'

export default defineConfig({
  base: '/QM.THREE/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/controls/OrbitControls.js']
  }
}) 