import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 650,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules\/(react|react-dom|scheduler)\// },
            { name: 'vendor-firebase', test: /node_modules\/firebase\// },
            { name: 'vendor-ui', test: /node_modules\/(lucide-react|@iconify\/react|motion)\// },
          ],
        },
      },
      checks: {
        pluginTimings: false,
      },
    },
  },
})

