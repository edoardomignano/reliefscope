# ReliefScope

Denkmal-Check, Umgebungs-Historie und Fund-Logbuch für Sondengänger in Bayern — als installierbare Offline-PWA. **„Sondle legal — und finde bessere Plätze."**

- **Live:** https://edoardomignano.github.io/reliefscope/ (served vom Branch `gh-pages`)
- **Dieser Branch (`main`):** Quellcode (Vite + TypeScript + Leaflet)

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm test         # Vitest
npm run lint     # ESLint
npm run build    # tsc + vite build → dist/
./deploy.sh      # Build → gh-pages (Live-Deploy)
```

## Struktur

`src/config/datasources.ts` ist der EINE Ort für alle amtlichen Endpunkte (verifiziert — Layer-Namen nie raten). Module: `map/` (Leaflet), `geo/` (UTM32, Distanz, GPS), `denkmal/` (BLfD-API, Ampel), `features/` (Ort-Check, Funde, Spur, Zone, Suche, Backup), `store/` (IndexedDB/localStorage), `ui/` (Tabs, Sheet, FABs, Hilfe).

## Lizenzen der Datenquellen

Geobasisdaten © Bayerische Vermessungsverwaltung — CC BY 4.0 · Denkmaldaten © Bayerisches Landesamt für Denkmalpflege — CC BY-ND 4.0.

Hinweis: Auf eingetragenen Bodendenkmälern ist der Einsatz von Metallsonden verboten (Art. 7 Abs. 6 BayDSchG). Funde sind meldepflichtig (Art. 8 BayDSchG); seit 1.7.2023 gilt in Bayern das Schatzregal.
