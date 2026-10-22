import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Chạy test với múi giờ UTC (giống server Vercel) để chứng minh logic không phụ thuộc múi giờ máy.
process.env.TZ = 'UTC'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
