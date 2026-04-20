import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Aligné sur vite.config.ts (server.port)
    baseUrl: 'http://localhost:5174',
    setupNodeEvents(on, config) {
      // implémenter les event listeners ici
    },
    viewportWidth: 1920,
    viewportHeight: 1080,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
