/**
 * Suchzone + Verlassen-Alarm (TASK-032/033, FR-006).
 * Genehmigtes Gebiet als Polygon zeichnen; bei aktivem Alarm Vibration + Piepton,
 * sobald die GPS-Position die Zone verlässt. Zone + Alarm-Status überleben Reload.
 */
import L from 'leaflet';
import { getMap } from '../map/map';
import { onGpsUpdate, type GpsFix } from '../geo/gps';
import { local } from '../store/local';
import { toast } from '../ui/toast';

type LatLngPair = [number, number];

const zone: {
  poly: LatLngPair[] | null;
  layer: L.Polygon | null;
  drawing: boolean;
  drawPts: L.LatLng[];
  drawLayer: L.Polygon | null;
  wasInside: boolean;
} = { poly: null, layer: null, drawing: false, drawPts: [], drawLayer: null, wasInside: true };

export function initZone(): void {
  zone.poly = local.getZone();
  renderZone();
  updateInfo();

  const alarm = document.getElementById('zone-alarm') as HTMLInputElement | null;
  if (alarm) {
    alarm.checked = local.getZoneAlarmOn();
    alarm.addEventListener('change', () => local.setZoneAlarmOn(alarm.checked));
  }
  document
    .getElementById('zone-draw')
    ?.addEventListener('click', () => (zone.drawing ? finishDraw() : startDraw()));
  document.getElementById('zone-clear')?.addEventListener('click', clearZone);
  document.getElementById('zone-done')?.addEventListener('click', finishDraw);
  document.getElementById('zone-cancel')?.addEventListener('click', cancelDraw);

  getMap().on('click', (e) => {
    if (zone.drawing) addDrawPoint(e.latlng);
  });
  onGpsUpdate(checkPosition);
}

// ---- Zeichnen ----
function startDraw(): void {
  cancelDraw();
  zone.drawing = true;
  zone.drawPts = [];
  zone.drawLayer = L.polygon([], {
    color: 'var(--accent)',
    weight: 2,
    fillOpacity: 0.1,
    dashArray: '5,4',
  }).addTo(getMap());
  getMap().getContainer().style.cursor = 'crosshair';
  document.getElementById('zonectl')?.style.setProperty('display', 'flex');
  document.getElementById('zone-draw')?.classList.add('active');
}

function addDrawPoint(latlng: L.LatLng): void {
  zone.drawPts.push(latlng);
  zone.drawLayer?.setLatLngs(zone.drawPts);
}

function finishDraw(): void {
  if (zone.drawPts.length < 3) {
    toast('Mindestens 3 Punkte für eine Zone.', 'info');
    return;
  }
  zone.poly = zone.drawPts.map((p) => [p.lat, p.lng] as LatLngPair);
  local.setZone(zone.poly);
  cancelDraw();
  renderZone();
  updateInfo();
}

function cancelDraw(): void {
  zone.drawing = false;
  if (zone.drawLayer) {
    getMap().removeLayer(zone.drawLayer);
    zone.drawLayer = null;
  }
  zone.drawPts = [];
  getMap().getContainer().style.cursor = '';
  document.getElementById('zonectl')?.style.setProperty('display', 'none');
  document.getElementById('zone-draw')?.classList.remove('active');
}

function clearZone(): void {
  if (!zone.poly) return;
  if (!confirm('Suchzone löschen?')) return;
  zone.poly = null;
  local.setZone(null);
  renderZone();
  updateInfo();
}

function renderZone(): void {
  if (zone.layer) {
    getMap().removeLayer(zone.layer);
    zone.layer = null;
  }
  if (zone.poly && zone.poly.length >= 3) {
    zone.layer = L.polygon(zone.poly, {
      color: '#2f7d4f',
      weight: 2,
      fillColor: '#2f7d4f',
      fillOpacity: 0.08,
    }).addTo(getMap());
  }
}

function updateInfo(): void {
  const info = document.getElementById('zone-info');
  if (info) info.textContent = zone.poly ? `Zone mit ${zone.poly.length} Punkten` : 'keine Zone';
}

// ---- Verlassen-Alarm ----
function checkPosition(fix: GpsFix): void {
  if (!local.getZoneAlarmOn() || !zone.poly || zone.poly.length < 3) {
    zone.wasInside = true;
    return;
  }
  const nowInside = pointInPolygon(fix.lat, fix.lng, zone.poly);
  if (zone.wasInside && !nowInside) triggerAlarm();
  zone.wasInside = nowInside;
}

function triggerAlarm(): void {
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
  beep();
  toast('Du hast deine Suchzone verlassen!', 'error', 6000);
}

/** Ray-Casting; poly als [lat, lng]-Paare. */
function pointInPolygon(lat: number, lng: number, poly: LatLngPair[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function beep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    /* Ton optional */
  }
}
