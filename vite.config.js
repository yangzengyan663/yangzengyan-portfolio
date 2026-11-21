import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [{
    name: 'non-blocking-portfolio-styles',
    transformIndexHtml: {
      order: 'post',
      handler: html => html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, tag =>
        tag.replace('rel="stylesheet"', 'rel="stylesheet" data-app-styles media="print" onload="this.media=\'all\'"')),
    },
  }],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
