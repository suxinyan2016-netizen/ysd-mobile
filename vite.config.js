// vite.config.js
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import path from 'path';

export default defineConfig({
  plugins: [
    uni(),
    // Middleware plugin to strip accidental .js suffix on API requests
    {
      name: 'remove-js-api-suffix',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          try {
            if (req.url && req.url.includes('/api/') && req.url.endsWith('.js')) {
              const cleanUrl = req.url.replace(/\.js$/, '');
              server.config.logger.warn('自动重定向 .js 请求:', req.url, '->', cleanUrl);
              req.url = cleanUrl;
            }
          } catch (e) {
            // swallow errors to avoid breaking the dev server
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.vue', '.json']
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => {
          // 强制移除 .js 后缀
          const cleanPath = path.replace(/\.js$/, '');
          if (cleanPath !== path) {
            console.log(`代理重写移除 .js: ${path} -> ${cleanPath}`);
          }
          return cleanPath;
        }
      }
    }
  }
})