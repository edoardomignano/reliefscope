/**
 * Live-GPS wie Google Maps (TASK-026–029, 031, FR-004).
 * Blauer Punkt + Genauigkeitskreis, Karte folgt; Karte ziehen pausiert das Folgen.
 * Feld-HUD (Zeit/Strecke/Genauigkeit) + Wake-Lock, solange GPS läuft.
 *
 * Lektionen aus dem Prototyp:
 *   - `follow = true` VOR watchPosition setzen (erstes Update kann synchron kommen).
 *   - `setView` mit { animate: false } beim Folgen (robust, ruckelfrei).
 */
import L from 'leaflet';
import { getMap } from '../map/map';
import { fabElement, onFab } from '../ui/fabs';
import { toast } from '../ui/toast';
import { distanceM, formatLength } from './distance';

export interface GpsFix {
  lat: number;
  lng: number;
  accuracy: number;
}
type GpsListener = (fix: GpsFix) => void;
const listeners: GpsListener[] = [];
/** Andere Module (Spur, Zone) hängen sich an jede neue Position. */
export function onGpsUpdate(cb: GpsListener): void {
  listeners.push(cb);
}

interface GpsState {
  watch: number | null;
  follow: boolean;
  marker: L.CircleMarker | null;
  circle: L.Circle | null;
  startTs: number | null;
  last: GpsFix | null;
  sessionDist: number;
  hudTimer: number | null;
  wake: WakeLockSentinel | null;
}
const gps: GpsState = {
  watch: null,
  follow: false,
  marker: null,
  circle: null,
  startTs: null,
  last: null,
  sessionDist: 0,
  hudTimer: null,
  wake: null,
};

export function isTracking(): boolean {
  return gps.watch !== null;
}

export function initGps(): void {
  onFab('gps', toggleFromFab);
  fabElement('gps')?.classList.add('gps-fab');
  getMap().on('dragstart', () => {
    if (gps.follow) {
      gps.follow = false;
      updateFab();
    }
  });
  // Wake-Lock geht verloren, wenn der Tab in den Hintergrund wandert → neu holen.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isTracking()) void wakeOn();
  });
}

/** ⌖-FAB: aus → an+folgen · pausiert → wieder folgen+zentrieren · folgend → aus. */
function toggleFromFab(): void {
  if (!isTracking()) start();
  else if (!gps.follow) {
    gps.follow = true;
    if (gps.last) getMap().setView([gps.last.lat, gps.last.lng], Math.max(getMap().getZoom(), 16));
    updateFab();
  } else stop();
}

function httpsHint(): string {
  const local = /^(localhost|127\.)/.test(location.hostname);
  return location.protocol !== 'https:' && !local
    ? ' GPS gibt der Browser nur über HTTPS frei.'
    : '';
}

function start(): void {
  if (!navigator.geolocation) {
    toast('Kein GPS in diesem Browser.' + httpsHint(), 'error');
    return;
  }
  gps.follow = true; // VOR watchPosition
  gps.startTs = Date.now();
  gps.sessionDist = 0;
  gps.last = null;
  showHud(true);
  hudTick();
  gps.hudTimer = window.setInterval(hudTick, 1000);
  void wakeOn();
  gps.watch = navigator.geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 15000,
  });
  updateFab();
}

export function stop(): void {
  if (gps.watch !== null) navigator.geolocation.clearWatch(gps.watch);
  gps.watch = null;
  gps.follow = false;
  const map = getMap();
  if (gps.marker) map.removeLayer(gps.marker);
  if (gps.circle) map.removeLayer(gps.circle);
  gps.marker = gps.circle = null;
  gps.last = null;
  gps.startTs = null;
  if (gps.hudTimer) window.clearInterval(gps.hudTimer);
  gps.hudTimer = null;
  showHud(false);
  void wakeOff();
  updateFab();
}

function onPosition(pos: GeolocationPosition): void {
  const fix: GpsFix = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
  if (gps.last) gps.sessionDist += distanceM(gps.last.lat, gps.last.lng, fix.lat, fix.lng);
  gps.last = fix;

  const map = getMap();
  if (!gps.marker) {
    gps.circle = L.circle([fix.lat, fix.lng], {
      radius: fix.accuracy,
      color: '#3b82f6',
      weight: 1,
      fillColor: '#3b82f6',
      fillOpacity: 0.12,
    }).addTo(map);
    gps.marker = L.circleMarker([fix.lat, fix.lng], {
      radius: 7,
      color: '#fff',
      weight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 1,
    }).addTo(map);
  } else {
    gps.marker.setLatLng([fix.lat, fix.lng]);
    gps.circle?.setLatLng([fix.lat, fix.lng]).setRadius(fix.accuracy);
  }
  if (gps.follow) map.setView([fix.lat, fix.lng], Math.max(map.getZoom(), 16), { animate: false });

  updateHudLive(fix.accuracy);
  for (const cb of listeners) cb(fix);
}

function onError(err: GeolocationPositionError): void {
  const msg =
    err.code === err.PERMISSION_DENIED
      ? 'Standort ist gesperrt. In den Browser-Einstellungen für diese Seite erlauben.' +
        httpsHint()
      : "Kein GPS-Signal. Draußen und mit aktiviertem Standort klappt's besser.";
  toast(msg, 'error', 6000);
  stop();
}

// ---- Feld-HUD ----
function showHud(on: boolean): void {
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = on ? 'flex' : 'none';
}
function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor(sec / 60) % 60;
  const s = sec % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + ':' + String(s).padStart(2, '0');
}
function hudTick(): void {
  if (!gps.startTs) return;
  const t = document.getElementById('hud-time');
  if (t) t.textContent = fmtDuration(Math.round((Date.now() - gps.startTs) / 1000));
}
function updateHudLive(accuracy: number): void {
  const d = document.getElementById('hud-dist');
  const a = document.getElementById('hud-acc');
  if (d) d.textContent = formatLength(gps.sessionDist);
  if (a) a.textContent = `${Math.round(accuracy)} m`;
}

// ---- FAB-Zustand ----
function updateFab(): void {
  const btn = fabElement('gps');
  if (!btn) return;
  btn.classList.toggle('following', isTracking() && gps.follow);
  btn.classList.toggle('paused', isTracking() && !gps.follow);
  btn.title = !isTracking()
    ? 'GPS folgen'
    : gps.follow
      ? 'GPS folgt — tippen zum Beenden'
      : 'Wieder auf Position zentrieren';
}

// ---- Wake-Lock (still degradieren, wenn nicht unterstützt) ----
async function wakeOn(): Promise<void> {
  try {
    if ('wakeLock' in navigator) gps.wake = await navigator.wakeLock.request('screen');
  } catch {
    /* Feature optional (PRD § 11) */
  }
}
async function wakeOff(): Promise<void> {
  try {
    await gps.wake?.release();
  } catch {
    /* egal */
  }
  gps.wake = null;
}
