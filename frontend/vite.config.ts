import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

const reactPlugins = (react() as PluginOption[]).map((plugin) => {
  if (plugin && typeof plugin === 'object' && 'name' in plugin && plugin.name === 'vite:react-babel') {
    return {
      ...plugin,
      config() {
        return {
          oxc: {
            jsx: {
              runtime: 'automatic' as const,
            },
          },
        };
      },
    };
  }
  return plugin;
});

export default defineConfig({
  plugins: [reactPlugins],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@reduxjs/toolkit') ||
            id.includes('node_modules/react-redux')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
});
