import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL
  const apiProxyTarget =
    env.API_PROXY_TARGET ||
    (apiBaseUrl?.startsWith('http') ? new URL(apiBaseUrl).origin : 'http://127.0.0.1:8000')

  return {
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      // Keep API requests on the frontend origin so browsers can send/read auth and CSRF cookies.
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: apiProxyTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    plugins: [
      vue(),
      vueDevTools(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          cleanupOutdatedCaches: true,
          sourcemap: false,
          maximumFileSizeToCacheInBytes: 5000000,
        },
        strategies: 'injectManifest',
        srcDir: 'service-worker',
        filename: 'sw.ts',
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          // the map (~1.9 MB) and the meeting room (~0.5 MB) need the network anyway; they load on
          // demand instead of being downloaded by every install
          globIgnores: ['**/mapboxComp-*.js', '**/MeetingRoomView-*.js'],
          maximumFileSizeToCacheInBytes: 5000000,
        },
        manifest: {
          id: 'urban-organization',
          name: 'Urban Organization',
          short_name: 'Urban',
          description: 'Organização, planejamento e resultados para equipes.',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icons/urban-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/urban-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/urban-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
