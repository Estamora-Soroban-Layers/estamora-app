import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // The application is a static site. Nothing here runs on a server: it reads a report
    // published by the runner and reads a contract over public testnet RPC, both of which
    // are reachable from a browser directly. Confirmed against the endpoint rather than
    // assumed -- the RPC answers a browser origin with `access-control-allow-origin`.
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // No test reaches the network. Everything the suite checks is a pure function of its
    // input, so a red build means the code changed, never that a remote host was slow.
    // The one check that does reach the network is `scripts/verify-committed-report.ts`,
    // which runs as its own CI job where its failure is unambiguous.
    reporters: 'default',
  },
})
