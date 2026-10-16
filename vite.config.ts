import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    // react-use's CommonJS build hides its named exports from Node, so bundle
    // its ESM build into the server instead of importing it at runtime
    noExternal: ['react-use'],
  },
  plugins: [
    tanstackStart({
      srcDirectory: 'src',
      start: { entry: './start.tsx' },
      server: { entry: './server.ts' },
    }),
    viteReact(),
    netlify(),
  ],
})
