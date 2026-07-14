/**
 * Genehmigte Suchgebiete (Phase 6). Felder, für die eine Erlaubnis vorliegt, als
 * Polygon markieren und Eigentümer/Pächter + Telefon für Rückfragen hinterlegen.
 * Grüne Fläche auf der Karte mit Kontakt-Popup; Liste mit Anruf-Link.
 */
import L from 'leaflet';
import { getMap } from '../map/map';
import { toast } from '../ui/toast';
import { allAreas, deleteArea, putArea, type Area } from '../store/db';

const STATUS: Record<Area['status'], { label: string; color: string }> = {
  erteilt: { label: 'Erlaubnis erteilt', color: '#2f7d4f' },
  angefragt: { label: 'angefragt', color: '#c7871b' },
  abgelehnt: { label: 'abgelehnt', color: '#b4291d' },
};

interface RuntimeArea extends Area {
  _layer?: L.Polygon;
}
const areas = new Map<string, RuntimeArea>();

let drawing = false;
let drawPts: L.LatLng[] = [];
let drawLayer: L.Polygon | null = null;
let pendingCoords: [number, number][] | null = null; // Polygon eines neuen Gebiets
let editingId: string | null = null; // bearbeitetes bestehendes Gebiet

const uid = (): string =>
  crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
const esc = (s: string): string =>
  String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c);
const telHref = (p: string): string => 'tel:' + p.replace(/[^+\d]/g, '');

export async function initAreas(): Promise<void> {
  wireForm();
  document
    .getElementById('area-draw')
    ?.addEventListener('click', () => (drawing ? finishDraw() : startDraw()));
  document.getElementById('area-done')?.addEventListener('click', finishDraw);
  document.getElementById('area-cancel')?.addEventListener('click', cancelDraw);
  getMap().on('click', (e) => {
    if (drawing) addPoint(e.latlng);
  });
  for (const a of await allAreas()) register(a);
  renderList();
}

// ---- Zeichnen ----
function startDraw(): void {
  cancelDraw();
  drawing = true;
  drawPts = [];
  drawLayer = L.polygon([], {
    color: '#2f7d4f',
    weight: 2,
    fillOpacity: 0.12,
    dashArray: '5,4',
  }).addTo(getMap());
  getMap().getContainer().style.cursor = 'crosshair';
  document.getElementById('areactl')?.style.setProperty('display', 'flex');
  document.getElementById('area-draw')?.classList.add('active');
  toast('Für jede Ecke des Felds auf die Karte tippen, dann „Fertig".', 'info');
}
function addPoint(latlng: L.LatLng): void {
  drawPts.push(latlng);
  drawLayer?.setLatLngs(drawPts);
}
function finishDraw(): void {
  if (drawPts.length < 3) {
    toast('Mindestens 3 Ecken für ein Feld.', 'info');
    return;
  }
  pendingCoords = drawPts.map((p) => [p.lat, p.lng] as [number, number]);
  cancelDraw();
  openForm(null);
}
function cancelDraw(): void {
  drawing = false;
  if (drawLayer) {
    getMap().removeLayer(drawLayer);
    drawLayer = null;
  }
  drawPts = [];
  getMap().getContainer().style.cursor = '';
  document.getElementById('areactl')?.style.setProperty('display', 'none');
  document.getElementById('area-draw')?.classList.remove('active');
}

// ---- Formular ----
function openForm(area: Area | null): void {
  editingId = area?.id ?? null;
  (document.getElementById('ar-name') as HTMLInputElement).value = area?.name ?? '';
  (document.getElementById('ar-owner') as HTMLInputElement).value = area?.owner ?? '';
  (document.getElementById('ar-phone') as HTMLInputElement).value = area?.phone ?? '';
  (document.getElementById('ar-note') as HTMLInputElement).value = area?.note ?? '';
  (document.getElementById('ar-status') as HTMLSelectElement).value = area?.status ?? 'erteilt';
  toggleForm(true);
}
function toggleForm(show: boolean): void {
  const el = document.getElementById('area-form');
  if (el) el.hidden = !show;
}
async function saveForm(): Promise<void> {
  const existing = editingId ? areas.get(editingId) : null;
  const coords = existing?.coords ?? pendingCoords;
  if (!coords) return;
  const area: Area = {
    id: existing?.id ?? uid(),
    name: (document.getElementById('ar-name') as HTMLInputElement).value.trim() || 'Gebiet',
    owner: (document.getElementById('ar-owner') as HTMLInputElement).value.trim(),
    phone: (document.getElementById('ar-phone') as HTMLInputElement).value.trim(),
    note: (document.getElementById('ar-note') as HTMLInputElement).value.trim(),
    status: (document.getElementById('ar-status') as HTMLSelectElement).value as Area['status'],
    coords,
    ts: existing?.ts ?? Date.now(),
  };
  await putArea(area);
  if (existing?._layer) getMap().removeLayer(existing._layer);
  register(area);
  pendingCoords = null;
  editingId = null;
  toggleForm(false);
  renderList();
  toast('Gebiet gespeichert.', 'success');
}

// ---- Karte ----
function register(area: Area): void {
  const a = area as RuntimeArea;
  areas.set(a.id, a);
  const col = STATUS[a.status].color;
  a._layer = L.polygon(a.coords, {
    color: col,
    weight: 2,
    fillColor: col,
    fillOpacity: 0.1,
  }).addTo(getMap());
  a._layer.bindPopup(popupHtml(a));
}
function popupHtml(a: Area): string {
  const s = STATUS[a.status];
  const phone = a.phone
    ? `<br>📞 <a href="${telHref(a.phone)}">${esc(a.phone)}</a>`
    : '';
  const owner = a.owner ? `<br>👤 ${esc(a.owner)}` : '';
  return `<b>${esc(a.name)}</b><br><span style="color:${s.color}">${s.label}</span>${owner}${phone}`;
}

// ---- Liste ----
function renderList(): void {
  const box = document.getElementById('areas-list');
  if (!box) return;
  const items = [...areas.values()].sort((x, y) => y.ts - x.ts);
  if (!items.length) {
    box.innerHTML = '<p class="muted">Noch keine Gebiete. Zeichne dein genehmigtes Feld ein.</p>';
    return;
  }
  box.innerHTML = '';
  for (const a of items) {
    const s = STATUS[a.status];
    const el = document.createElement('div');
    el.className = 'list-item area';
    el.innerHTML = `
      <div class="area-info">
        <span class="badge" style="background:${s.color}22;color:${s.color}">${s.label}</span>
        <div class="area-name">${esc(a.name)}</div>
        ${a.owner ? `<small>👤 ${esc(a.owner)}</small>` : ''}
        ${a.phone ? `<small>📞 <a href="${telHref(a.phone)}">${esc(a.phone)}</a></small>` : ''}
        ${a.note ? `<small>${esc(a.note)}</small>` : ''}
        <div class="area-acts">
          <button data-go="${a.id}">Karte</button>
          <button data-edit="${a.id}">Bearbeiten</button>
          <button data-del="${a.id}">Löschen</button>
        </div>
      </div>`;
    box.appendChild(el);
  }
  box.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) =>
    b.addEventListener('click', () => {
      const a = areas.get(b.dataset.go!);
      if (a?._layer) {
        getMap().fitBounds(a._layer.getBounds(), { maxZoom: 16 });
        a._layer.openPopup();
      }
    }),
  );
  box.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => {
      const a = areas.get(b.dataset.edit!);
      if (a) openForm(a);
    }),
  );
  box.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) =>
    b.addEventListener('click', () => void removeArea(b.dataset.del!)),
  );
}

async function removeArea(id: string): Promise<void> {
  if (!confirm('Dieses Gebiet löschen?')) return;
  const a = areas.get(id);
  if (a?._layer) getMap().removeLayer(a._layer);
  areas.delete(id);
  await deleteArea(id);
  renderList();
}

function wireForm(): void {
  document.getElementById('ar-save')?.addEventListener('click', () => void saveForm());
  document.getElementById('ar-cancel')?.addEventListener('click', () => {
    pendingCoords = null;
    editingId = null;
    toggleForm(false);
  });
}
