/**
 * Fund-Logbuch (TASK-034–043, FR-007/008/009/014).
 * Fund erfassen (Formular mit Symbol/Leitwert/Tiefe/Foto), als Foto- oder Symbol-Pin
 * auf der Karte, automatischer Denkmal-Check bei jedem Fund, Sammlung mit Aktionen.
 */
import L from 'leaflet';
import { getMap } from '../map/map';
import { onFab } from '../ui/fabs';
import { toast } from '../ui/toast';
import { getPosition } from '../geo/gps';
import { wgs84ToUtm32 } from '../geo/coords';
import { fetchUmkreis } from '../denkmal/api';
import { computeAmpel, NAEHE_M } from '../denkmal/ampel';
import { allFinds, deleteFind, putFind, type Find } from '../store/db';

type SymbolId = Find['symbol'];
const SYMBOLS: { id: SymbolId; emoji: string; label: string }[] = [
  { id: 'muenze', emoji: '🪙', label: 'Münze' },
  { id: 'ring', emoji: '💍', label: 'Ring' },
  { id: 'schmuck', emoji: '📿', label: 'Schmuck' },
  { id: 'schnalle', emoji: '🧷', label: 'Schnalle' },
  { id: 'knopf', emoji: '🔘', label: 'Knopf' },
  { id: 'gefaess', emoji: '🏺', label: 'Gefäß' },
  { id: 'kreuz', emoji: '✝️', label: 'Kreuz' },
  { id: 'militaria', emoji: '🎖️', label: 'Militaria' },
  { id: 'werkzeug', emoji: '🔧', label: 'Werkzeug' },
  { id: 'unbekannt', emoji: '❓', label: 'Unbekannt' },
];
const symEmoji = (id: SymbolId): string => SYMBOLS.find((s) => s.id === id)?.emoji ?? '❓';

const KIND_META: Record<Find['kind'], { label: string; color: string; emoji: string }> = {
  fund: { label: 'Fund', color: '#f0a53a', emoji: '🪙' },
  beobachtung: { label: 'Beobachtung', color: '#2f7d4f', emoji: '👁️' },
  strukturverdacht: { label: 'Strukturverdacht', color: '#b4291d', emoji: '⛰️' },
};

interface RuntimeFind extends Find {
  _marker?: L.Marker | L.CircleMarker;
  _iconUrl?: string;
}
const finds = new Map<string, RuntimeFind>();

let formPos: L.LatLng | null = null;
let formSymbol: SymbolId | null = null;
let placeMode = false;
let pendingPhotoId: string | null = null;

const uid = (): string =>
  (crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2));

function esc(s: string): string {
  return String(s).replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c,
  );
}
const gmapsUrl = (f: { lat: number; lng: number }): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`;

export async function initFinds(): Promise<void> {
  buildSymbolGrid();
  wireForm();
  wirePhoto();

  onFab('find', () => void startFindAtGps());
  document.getElementById('finds-place')?.addEventListener('click', togglePlaceMode);
  getMap().on('click', (e) => {
    if (placeMode) {
      togglePlaceMode();
      openForm(e.latlng);
    }
  });

  for (const f of await allFinds()) register(f);
  renderList();
}

// ---- Erfassen ----
async function startFindAtGps(): Promise<void> {
  try {
    const fix = await getPosition();
    openForm(L.latLng(fix.lat, fix.lng));
  } catch {
    /* Toast kam schon aus gps.ts */
  }
}

function togglePlaceMode(): void {
  placeMode = !placeMode;
  document.getElementById('finds-place')?.classList.toggle('active', placeMode);
  getMap().getContainer().style.cursor = placeMode ? 'crosshair' : '';
  if (placeMode) toast('Tippe auf die Karte, um dort einen Fund zu setzen.', 'info');
}

function openForm(latlng: L.LatLng): void {
  formPos = latlng;
  formSymbol = null;
  document.querySelectorAll('#ff-symbols button').forEach((b) => b.classList.remove('on'));
  const { e, n } = wgs84ToUtm32(latlng.lat, latlng.lng);
  const coords = document.getElementById('ff-coords');
  if (coords)
    coords.textContent = `${latlng.lat.toFixed(6)}° N, ${latlng.lng.toFixed(6)}° O · UTM 32U ${Math.round(e)} ${Math.round(n)}`;
  (document.getElementById('ff-note') as HTMLInputElement).value = '';
  (document.getElementById('ff-leit') as HTMLInputElement).value = '';
  (document.getElementById('ff-tiefe') as HTMLInputElement).value = '';
  (document.getElementById('ff-kind') as HTMLSelectElement).value = 'fund';
  (document.getElementById('ff-photo-after') as HTMLInputElement).checked = true;
  toggleForm(true);
}

function toggleForm(show: boolean): void {
  const el = document.getElementById('find-form');
  if (el) el.hidden = !show;
}

async function saveForm(): Promise<void> {
  if (!formPos) return;
  const tiefeStr = (document.getElementById('ff-tiefe') as HTMLInputElement).value;
  const find: Find = {
    id: uid(),
    lat: formPos.lat,
    lng: formPos.lng,
    note: (document.getElementById('ff-note') as HTMLInputElement).value.trim(),
    kind: (document.getElementById('ff-kind') as HTMLSelectElement).value as Find['kind'],
    symbol: formSymbol ?? 'unbekannt',
    leitwert: (document.getElementById('ff-leit') as HTMLInputElement).value.trim() || null,
    tiefe_cm: tiefeStr !== '' ? Number(tiefeStr) : null,
    photo: null,
    dstate: null,
    ddist: null,
    dname: null,
    ts: Date.now(),
  };
  await putFind(find);
  register(find);
  renderList();
  toggleForm(false);
  toast('Fund gespeichert — mit Koordinaten.', 'success');

  void checkFindSafety(find.id);
  if ((document.getElementById('ff-photo-after') as HTMLInputElement).checked) pickPhoto(find.id);
}

// ---- Auto-Denkmal-Check (FR-008) ----
async function checkFindSafety(id: string): Promise<void> {
  const f = finds.get(id);
  if (!f) return;
  let monuments;
  try {
    monuments = await fetchUmkreis(f.lat, f.lng, NAEHE_M);
  } catch {
    return; // offline/außerhalb → später erneut; kein falsches Ergebnis
  }
  if (!finds.has(id)) return; // Guard: Fund inzwischen gelöscht → nicht wiederbeleben
  const ampel = computeAmpel(monuments);
  f.dstate = ampel.level;
  f.ddist = ampel.nearestBoden ? Math.round(ampel.nearestBoden.distance) : null;
  f.dname = ampel.nearestBoden?.bezeichnung ?? null;
  await putFind(stripRuntime(f));
  if (!finds.has(id)) return;
  renderList();
  refreshMarker(f);
  if (ampel.level === 'rot') {
    toast(`⚠ AN/AUF einem Bodendenkmal (${f.ddist} m) — Sondeln verboten.`, 'error', 7000);
  } else if (ampel.level === 'gelb') {
    toast(`Bodendenkmal in ${f.ddist} m — Nähebereich beachten.`, 'info', 6000);
  }
}

// ---- Karten-Pins (TASK-038/039) ----
function register(find: Find): void {
  const f = find as RuntimeFind;
  finds.set(f.id, f);
  f._marker = markerFor(f);
}

function markerFor(f: RuntimeFind): L.Marker | L.CircleMarker {
  const map = getMap();
  const col = KIND_META[f.kind].color;
  let marker: L.Marker | L.CircleMarker;
  if (f.photo) {
    if (f._iconUrl) URL.revokeObjectURL(f._iconUrl);
    f._iconUrl = URL.createObjectURL(f.photo);
    marker = L.marker([f.lat, f.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="pmark" style="border-color:${col}"><img src="${f._iconUrl}" alt=""></div>`,
        iconSize: [46, 46],
        iconAnchor: [23, 54],
        popupAnchor: [0, -52],
      }),
    }).addTo(map);
  } else {
    marker = L.marker([f.lat, f.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="spin" style="background:${col}">${symEmoji(f.symbol)}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 47],
        popupAnchor: [0, -44],
      }),
    }).addTo(map);
  }
  marker.bindPopup(() => popupHtml(f));
  return marker;
}

function refreshMarker(f: RuntimeFind): void {
  if (f._marker) getMap().removeLayer(f._marker);
  f._marker = markerFor(f);
}

function popupHtml(f: RuntimeFind): string {
  const k = KIND_META[f.kind];
  const warn =
    f.dstate === 'rot'
      ? '<br><b style="color:#b4291d">Im Bodendenkmal — Sondeln verboten</b>'
      : f.dstate === 'gelb'
        ? `<br><b style="color:#c7871b">Nähebereich (${f.ddist} m)</b>`
        : '';
  return `<b>${esc(f.note || k.label)}</b><br>
    <span style="color:#6b6b63">${k.label} · ${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}</span>
    <br><a href="${gmapsUrl(f)}" target="_blank" rel="noopener">🧭 Route (Google Maps)</a>${warn}`;
}

// ---- Foto (TASK-037) ----
function pickPhoto(id: string): void {
  pendingPhotoId = id;
  const input = document.getElementById('ff-file') as HTMLInputElement | null;
  if (input) {
    input.value = '';
    input.click();
  }
}

function wirePhoto(): void {
  const input = document.getElementById('ff-file') as HTMLInputElement | null;
  input?.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file || !pendingPhotoId) return;
    const f = finds.get(pendingPhotoId);
    pendingPhotoId = null;
    if (!f) return;
    f.photo = await downscale(file);
    await putFind(stripRuntime(f));
    refreshMarker(f);
    renderList();
  });

  const modal = document.getElementById('photo-modal');
  modal?.addEventListener('click', () => {
    modal.hidden = true;
    const img = modal.querySelector('img');
    if (img) img.src = '';
  });
}

/** Große Fotos vor dem Speichern verkleinern (PRD § 11). */
async function downscale(file: Blob, max = 1600): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    if (bmp.width <= max && bmp.height <= max) return file;
    const scale = max / Math.max(bmp.width, bmp.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.85),
    );
  } catch {
    return file;
  }
}

// ---- Sammlung (TASK-042) ----
function renderList(): void {
  const box = document.getElementById('finds-list');
  if (!box) return;
  const items = [...finds.values()].sort((a, b) => b.ts - a.ts);
  if (!items.length) {
    box.innerHTML = '<p class="placeholder">Noch keine Funde. Tipp auf ＋.</p>';
    return;
  }
  box.innerHTML = '';
  for (const f of items) {
    if (f._iconUrl) {
      URL.revokeObjectURL(f._iconUrl);
      f._iconUrl = undefined;
    }
    const k = KIND_META[f.kind];
    const thumb = f.photo
      ? `<img class="thumb" src="${(f._iconUrl = URL.createObjectURL(f.photo))}" alt="Foto">`
      : `<div class="thumb sym">${symEmoji(f.symbol)}</div>`;
    const warn = f.dstate
      ? `<div class="warn-row">${
          f.dstate === 'rot'
            ? 'Im Bodendenkmal — Sondeln verboten'
            : f.dstate === 'gelb'
              ? `Nähebereich: Bodendenkmal in ${f.ddist} m`
              : ''
        }</div>`
      : '';
    const el = document.createElement('div');
    el.className = 'list-item find';
    el.innerHTML = `${thumb}
      <div class="find-info">
        <span class="badge badge-kind" style="background:${k.color}22;color:${k.color}">${k.label}</span>
        <div class="find-note">${symEmoji(f.symbol)} ${f.note ? esc(f.note) : '<i>ohne Notiz</i>'}</div>
        <small class="mono-coord">${f.lat.toFixed(5)}, ${f.lng.toFixed(5)} · ${new Date(f.ts).toLocaleDateString('de-DE')}</small>
        ${f.leitwert ? `<small>Leitwert ${esc(f.leitwert)}${f.tiefe_cm != null ? ` · ${f.tiefe_cm} cm` : ''}</small>` : f.tiefe_cm != null ? `<small>${f.tiefe_cm} cm tief</small>` : ''}
        ${warn}
        <div class="find-acts">
          <button data-go="${f.id}">Karte</button>
          <a href="${gmapsUrl(f)}" target="_blank" rel="noopener">🧭 Route</a>
          <button data-photo="${f.id}">📷 Foto</button>
          <button data-del="${f.id}">Löschen</button>
        </div>
      </div>`;
    box.appendChild(el);
  }
  wireListActions(box);
}

function wireListActions(box: HTMLElement): void {
  box.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) =>
    b.addEventListener('click', () => {
      const f = finds.get(b.dataset.go!);
      if (f?._marker) {
        getMap().setView([f.lat, f.lng], 17);
        f._marker.openPopup();
      }
    }),
  );
  box.querySelectorAll<HTMLElement>('.thumb, [data-photo]').forEach((el) =>
    el.addEventListener('click', () => {
      const id =
        (el as HTMLElement).dataset.photo ??
        (el.closest('.find')?.querySelector('[data-photo]') as HTMLElement | null)?.dataset.photo;
      const f = id ? finds.get(id) : null;
      if (!f) return;
      if (f.photo && el.classList.contains('thumb')) openPhoto(f);
      else pickPhoto(f.id);
    }),
  );
  box.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) =>
    b.addEventListener('click', () => void removeFind(b.dataset.del!)),
  );
}

function openPhoto(f: RuntimeFind): void {
  if (!f.photo) return;
  const modal = document.getElementById('photo-modal');
  const img = modal?.querySelector('img');
  if (modal && img) {
    img.src = f._iconUrl ?? URL.createObjectURL(f.photo);
    modal.hidden = false;
  }
}

async function removeFind(id: string): Promise<void> {
  if (!confirm('Diesen Fund löschen?')) return;
  const f = finds.get(id);
  if (f?._marker) getMap().removeLayer(f._marker);
  if (f?._iconUrl) URL.revokeObjectURL(f._iconUrl);
  finds.delete(id);
  await deleteFind(id);
  renderList();
}

// ---- Formular-Verdrahtung ----
function buildSymbolGrid(): void {
  const grid = document.getElementById('ff-symbols');
  if (!grid) return;
  grid.innerHTML = '';
  for (const s of SYMBOLS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.emoji;
    b.title = s.label;
    b.dataset.sym = s.id;
    b.addEventListener('click', () => {
      formSymbol = formSymbol === s.id ? null : s.id;
      grid.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.sym === formSymbol));
    });
    grid.appendChild(b);
  }
}

function wireForm(): void {
  document.getElementById('ff-save')?.addEventListener('click', () => void saveForm());
  document.getElementById('ff-cancel')?.addEventListener('click', () => toggleForm(false));
}

/** Reine Daten für IndexedDB (ohne Leaflet-Referenzen → kein DataCloneError). */
function stripRuntime(f: RuntimeFind): Find {
  return {
    id: f.id,
    lat: f.lat,
    lng: f.lng,
    note: f.note,
    kind: f.kind,
    symbol: f.symbol,
    leitwert: f.leitwert,
    tiefe_cm: f.tiefe_cm,
    photo: f.photo,
    dstate: f.dstate,
    ddist: f.ddist,
    dname: f.dname,
    ts: f.ts,
  };
}
