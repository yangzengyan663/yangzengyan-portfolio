import { defineConfig } from 'vite'
import { inlinePortfolioShell } from './scripts/inline-shell.mjs'

export default defineConfig({
  base: process.env.PORTFOLIO_BASE_PATH || '/',
  plugins: [inlinePortfolioShell()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
