/**
 * Breadcrumb-Spur (TASK-030, FR-005). Zeichnet bei laufendem GPS automatisch mit
 * (5-m-Rauschfilter), überlebt Reload (localStorage), löschbar.
 */
import L from 'leaflet';
import { getMap } from '../map/map';
import { onGpsUpdate } from '../geo/gps';
import { distanceM, formatLength, pathLengthM } from '../geo/distance';
import { local, type TrackPoint } from '../store/local';

const MIN_MOVE_M = 5; // GPS-Rauschen wegfiltern
const track: { pts: TrackPoint[]; line: L.Polyline | null } = { pts: [], line: null };

export function initTrack(): void {
  track.pts = local.getTrack();
  render();
  onGpsUpdate((fix) => addPoint(fix.lat, fix.lng));
  document.getElementById('track-clear')?.addEventListener('click', clearTrack);
}

function addPoint(lat: number, lng: number): void {
  const last = track.pts.at(-1);
  if (last && distanceM(last[0], last[1], lat, lng) < MIN_MOVE_M) return;
  track.pts.push([lat, lng, Date.now()]);
  local.setTrack(track.pts);
  render();
}

function render(): void {
  const latlngs = track.pts.map((p) => [p[0], p[1]] as [number, number]);
  if (track.line) track.line.setLatLngs(latlngs);
  else if (latlngs.length)
    track.line = L.polyline(latlngs, {
      color: '#3b82f6',
      weight: 3,
      dashArray: '2,6',
      opacity: 0.8,
    }).addTo(getMap());

  const info = document.getElementById('track-info');
  if (info)
    info.textContent = track.pts.length
      ? `Spur: ${track.pts.length} Punkte · ${formatLength(pathLengthM(latlngs))}`
      : 'Läuft GPS, wird deine Spur automatisch aufgezeichnet.';
}

function clearTrack(): void {
  if (!track.pts.length) return;
  if (!confirm('Aufgezeichnete Spur löschen?')) return;
  track.pts = [];
  local.setTrack([]);
  if (track.line) {
    getMap().removeLayer(track.line);
    track.line = null;
  }
  render();
}
