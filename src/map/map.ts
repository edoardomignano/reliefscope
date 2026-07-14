import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OSM_TILES } from '../config/datasources';

/** Bayern-Mitte als Start (ganz Bayern im Blick). */
const BAYERN_CENTER: L.LatLngTuple = [48.95, 11.5];
const START_ZOOM = 7;

let map: L.Map | null = null;

/** Initialisiert die Karte genau einmal und gibt sie zurück. */
export function initMap(containerId = 'map'): L.Map {
  if (map) return map;

  map = L.map(containerId, {
    center: BAYERN_CENTER,
    zoom: START_ZOOM,
    maxZoom: 20,
    zoomControl: true,
  });

  // OSM-Basiskarte. maxNativeZoom 19 ist Pflicht — darüber wird hochskaliert
  // statt fehlende Kacheln (= schwarze Karte) zu laden. (PRD § 2 Gotcha)
  L.tileLayer(OSM_TILES.url, {
    maxZoom: 20,
    maxNativeZoom: OSM_TILES.maxNativeZoom,
    attribution: OSM_TILES.attribution,
  }).addTo(map);

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
