import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    // Server tests run in node (they use node:sqlite); UI tests in happy-dom.
    projects: [
      {
        extends: true,
        test: { name: 'server', environment: 'node', include: ['server/**/*.spec.ts', 'shared/**/*.spec.ts'] },
      },
      {
        extends: true,
        test: { name: 'ui', environment: 'happy-dom', include: ['src/**/*.spec.ts'] },
      },
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
})
