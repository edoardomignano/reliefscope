import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Bayern-Mitte als Start (ganz Bayern im Blick). */
const BAYERN_CENTER: L.LatLngTuple = [48.95, 11.5];
const START_ZOOM = 7;
/** Karte auf Bayern begrenzen (+ etwas Rand) — kein Weltkarten-Laden, klarer Fokus. */
const BAYERN_BOUNDS = L.latLngBounds([47.1, 8.7], [50.7, 14.1]);

let map: L.Map | null = null;

/**
 * Initialisiert die Karte genau einmal und gibt sie zurück.
 * Die Basisebenen (inkl. OSM) werden separat über layers.ts gemountet, damit sie
 * im Panel steuerbar sind.
 */
export function initMap(containerId = 'map'): L.Map {
  if (map) return map;

  map = L.map(containerId, {
    center: BAYERN_CENTER,
    zoom: START_ZOOM,
    minZoom: 6, // nicht weiter rauszoomen als „ganz Bayern" → keine Welt-Kacheln
    maxZoom: 20,
    maxBounds: BAYERN_BOUNDS,
    maxBoundsViscosity: 1, // hart an der Bayern-Grenze halten
    zoomControl: true,
  });

  return map;
}

/** Die initialisierte Karte (wirft, wenn initMap noch nicht lief). */
export function getMap(): L.Map {
  if (!map) throw new Error('Karte nicht initialisiert — initMap() zuerst aufrufen.');
  return map;
}

/**
 * Nach Panel-/Sheet-Resize aufrufen: Leaflet misst den Container neu und lädt
 * fehlende Kacheln nach (schwarze Flächen sind sonst kein Bug, sondern Stale-Size).
 */
export function refreshMapSize(delayMs = 80): void {
  window.setTimeout(() => map?.invalidateSize(), delayMs);
}
