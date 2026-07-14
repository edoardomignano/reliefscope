import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages served die App unter /reliefscope/ → Build braucht diese base.
// Im Dev (`serve`) dagegen base '/' — sonst leitet die Vorschau http://localhost:5199/
// auf /reliefscope/ um und wirkt „kaputt".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/reliefscope/' : '/',
  build: { target: 'es2022' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // neue Version wird automatisch aktiv
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'ReliefScope — Sondeln legal in Bayern',
        short_name: 'ReliefScope',
        description:
          'Denkmal-Check, Umgebungs-Historie und Fund-Logbuch für Sondengänger in Bayern.',
        lang: 'de',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F5F5F2',
        theme_color: '#F5F5F2',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App-Shell precache → Offline-Erststart (TASK-044).
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        navigateFallback: 'index.html', // Offline-Reload der Wurzel
        // Neuer Build ⇒ neuer SW-Hash ⇒ Clients aktualisieren ohne Handarbeit.
        // deploy.sh stempelt zusätzlich version.txt (TASK-045).
        skipWaiting: true,
        clientsClaim: true,
        // Runtime-Cache fürs Feld: besuchte Kacheln/Denkmal-Antworten offline (FR-012).
        // Nur GET an amtliche Bayern-Hosts + OSM-Kacheln; Nominatim bleibt Netz-only.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('bayern.de'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'rs-bayern',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }, // 0 = opake WMS-Kachel
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'rs-osm',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));
