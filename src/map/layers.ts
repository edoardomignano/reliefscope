/**
 * Die 10 Kartenebenen (FR-001). Endpunkte/Layer-Namen kommen ausschließlich aus
 * config/datasources.ts — NIE hier raten. Jede Ebene meldet ihren Ladestatus über
 * ein Callback (grün/rot Status-Punkt, TASK-012).
 *
 * Panes/Blend (TASK-013):
 *   - Basiskarten liegen im Standard-tilePane (z 200).
 *   - Relief liegt im 'reliefPane' (z 350) mit mix-blend-mode: multiply → es
 *     „druckt" über jede Basis, statt sie zu überdecken.
 *   - Denkmal-/ALKIS-Overlays liegen im 'overlayWmsPane' (z 400), also über Relief.
 */
import L from 'leaflet';
import { OSM_TILES, WMS } from '../config/datasources';

export type LayerKind = 'base' | 'relief' | 'overlay';
export type LayerStatus = 'idle' | 'loading' | 'ok' | 'error';

export interface LayerDef {
  id: string;
  name: string;
  kind: LayerKind;
  /** Standard-Sichtbarkeit. Alle 4 Denkmal-Kategorien sind default AN (FR-001). */
  on: boolean;
  opacity: number;
  /** Kurzinfo fürs Panel (kein editierbares Feld — nur Erklärung). */
  info: string;
  attribution: string;
  /** Baut den konkreten Leaflet-Layer (Pane/Transparenz je Art). */
  create: () => L.TileLayer;
}

const RELIEF_PANE = 'reliefPane';
const OVERLAY_PANE = 'overlayWmsPane';

function wms(url: string, layers: string, kind: LayerKind, attribution: string): L.TileLayer {
  const pane = kind === 'relief' ? RELIEF_PANE : kind === 'overlay' ? OVERLAY_PANE : undefined;
  const opts: L.WMSOptions = {
    layers,
    format: 'image/png',
    transparent: kind !== 'base', // Basiskarten sind deckend, Overlays/Relief durchlässig
    version: '1.3.0',
    maxZoom: 20,
    attribution,
  };
  // pane NUR setzen wenn definiert — `pane: undefined` lässt Leaflet eine Pane
  // „undefined" suchen und beim Hinzufügen crashen (appendChild auf undefined).
  if (pane) opts.pane = pane;
  return L.tileLayer.wms(url, opts);
}

export const LAYER_DEFS: LayerDef[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    kind: 'base',
    on: true,
    opacity: 1,
    info: 'Standard-Straßenkarte. Immer verfügbar, auch offline für besuchte Gebiete.',
    attribution: OSM_TILES.attribution,
    create: () =>
      L.tileLayer(OSM_TILES.url, {
        maxZoom: 20,
        maxNativeZoom: OSM_TILES.maxNativeZoom, // sonst schwarze Karte ab Zoom 20
        attribution: OSM_TILES.attribution,
      }),
  },
  {
    id: 'dop20',
    name: 'Luftbild DOP20',
    kind: 'base',
    on: false,
    opacity: 1,
    info: 'Aktuelles amtliches Luftbild (20 cm). Zeigt, was heute auf der Fläche liegt.',
    attribution: WMS.dop20.attribution,
    create: () => wms(WMS.dop20.url, WMS.dop20.layer, 'base', WMS.dop20.attribution),
  },
  {
    id: 'histdop',
    name: 'Luftbild historisch',
    kind: 'base',
    on: false,
    opacity: 1,
    info: 'Ältere Befliegungen. In Trockenjahren treten Bewuchsmerkmale (Cropmarks) hervor.',
    attribution: WMS.histdop.attribution,
    create: () => wms(WMS.histdop.url, WMS.histdop.layerGroup, 'base', WMS.histdop.attribution),
  },
  {
    id: 'uraufnahme',
    name: 'Uraufnahme (~1850)',
    kind: 'base',
    on: false,
    opacity: 1,
    info: 'Historische Karte ~1808–1864. Alte Wege/Fluren. Abdeckung fleckig — bei Bedarf reinzoomen.',
    attribution: WMS.uraufnahme.attribution,
    create: () =>
      wms(WMS.uraufnahme.url, WMS.uraufnahme.layer, 'base', WMS.uraufnahme.attribution),
  },
  {
    id: 'relief',
    name: 'Geländerelief (DGM1)',
    kind: 'relief',
    on: false,
    opacity: 0.85,
    info: 'Schummerung aus 1-m-LiDAR. Hohlwege/Terrassen. Liegt „druckend" über der Basis.',
    attribution: WMS.relief.attribution,
    create: () => wms(WMS.relief.url, WMS.relief.layer, 'relief', WMS.relief.attribution),
  },
  {
    id: 'boden',
    name: 'Bodendenkmäler',
    kind: 'overlay',
    // Nur die rechtlich entscheidende Ebene ist default AN. Bau/Ensemble/Landschaft
    // standardmäßig AUS — 4 gleichzeitige WMS-Overlays machten den Start langsam.
    // Alle bleiben im Ebenen-Panel einzeln zuschaltbar (der Ort-Check prüft ohnehin
    // alle Kategorien unabhängig von der Sichtbarkeit).
    on: true,
    opacity: 0.6,
    info: 'Nur hier gilt das Sondenverbot (Art. 7 Abs. 6 BayDSchG).',
    attribution: WMS.denkmal.attribution,
    create: () =>
      wms(WMS.denkmal.url, WMS.denkmal.layers.boden, 'overlay', WMS.denkmal.attribution),
  },
  {
    id: 'bau',
    name: 'Baudenkmäler',
    kind: 'overlay',
    on: false,
    opacity: 0.6,
    info: 'Einzelne Baudenkmäler (z. B. das Festspielhaus). Kein Sondenverbot.',
    attribution: WMS.denkmal.attribution,
    create: () => wms(WMS.denkmal.url, WMS.denkmal.layers.bau, 'overlay', WMS.denkmal.attribution),
  },
  {
    id: 'ensemble',
    name: 'Ensembles',
    kind: 'overlay',
    on: false,
    opacity: 0.6,
    info: 'Denkmalgeschützte Ensembles (Ortsbilder).',
    attribution: WMS.denkmal.attribution,
    create: () =>
      wms(WMS.denkmal.url, WMS.denkmal.layers.ensemble, 'overlay', WMS.denkmal.attribution),
  },
  {
    id: 'landschaft',
    name: 'Landschaftsprägende Denkmäler',
    kind: 'overlay',
    on: false,
    opacity: 0.6,
    info: 'Besonders landschaftsprägende Denkmäler.',
    attribution: WMS.denkmal.attribution,
    create: () =>
      wms(WMS.denkmal.url, WMS.denkmal.layers.landschaft, 'overlay', WMS.denkmal.attribution),
  },
  {
    id: 'alkis',
    name: 'Flurstücke (ALKIS)',
    kind: 'overlay',
    on: false,
    opacity: 0.9,
    info: 'Flurstücksgrenzen + Nummern (bei starkem Zoom). Für die Genehmigung.',
    attribution: WMS.alkis.attribution,
    create: () => wms(WMS.alkis.url, WMS.alkis.layer, 'overlay', WMS.alkis.attribution),
  },
];

// ---- Laufzeit-Zustand ----
const instances = new Map<string, L.TileLayer>();
const statuses = new Map<string, LayerStatus>();
type StatusListener = (id: string, status: LayerStatus) => void;
let statusListener: StatusListener | null = null;

export function onLayerStatus(listener: StatusListener): void {
  statusListener = listener;
}

function setStatus(id: string, status: LayerStatus): void {
  statuses.set(id, status);
  statusListener?.(id, status);
}

export function layerStatus(id: string): LayerStatus {
  return statuses.get(id) ?? 'idle';
}

/** Panes für Relief-Blend + Overlay-Reihenfolge anlegen (einmalig, TASK-013). */
export function initLayerPanes(map: L.Map): void {
  if (!map.getPane(RELIEF_PANE)) {
    const relief = map.createPane(RELIEF_PANE);
    relief.style.zIndex = '350';
    relief.style.mixBlendMode = 'multiply';
    map.createPane(OVERLAY_PANE).style.zIndex = '400';
  }
}

function def(id: string): LayerDef {
  const d = LAYER_DEFS.find((l) => l.id === id);
  if (!d) throw new Error(`Unbekannte Ebene: ${id}`);
  return d;
}

/** Ebene ein-/ausblenden (baut den Layer bei Bedarf + hängt Status-Events an). */
export function setLayerVisible(map: L.Map, id: string, visible: boolean): void {
  const existing = instances.get(id);
  if (visible) {
    if (existing) return;
    const d = def(id);
    const layer = d.create();
    layer.setOpacity(d.opacity);
    layer.on('loading', () => setStatus(id, 'loading'));
    layer.on('load', () => setStatus(id, 'ok'));
    layer.on('tileerror', () => setStatus(id, 'error'));
    layer.addTo(map);
    instances.set(id, layer);
  } else if (existing) {
    map.removeLayer(existing);
    instances.delete(id);
    setStatus(id, 'idle');
  }
}

export function setLayerOpacity(id: string, opacity: number): void {
  def(id).opacity = opacity;
  instances.get(id)?.setOpacity(opacity);
}

export function isLayerVisible(id: string): boolean {
  return instances.has(id);
}

/** Alle Ebenen gemäß ihrem `on`-Default mounten (Startzustand). */
export function mountDefaultLayers(map: L.Map): void {
  initLayerPanes(map);
  for (const d of LAYER_DEFS) {
    if (d.on) setLayerVisible(map, d.id, true);
  }
}
