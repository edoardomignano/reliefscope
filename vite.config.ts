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
        // Phase 0: nur App-Shell-Precache (Offline-Start).
        // Runtime-Caching für Kacheln/Denkmal-API kommt in TASK-044.
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
      },
    }),
  ],
}));
