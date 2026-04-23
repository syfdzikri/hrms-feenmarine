import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/hrms-feenmarine/',
  plugins: [react()],
})