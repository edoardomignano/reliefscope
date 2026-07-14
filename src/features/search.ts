/**
 * Ortssuche (FR-010): schwebende Such-Pille über der Karte. Nominatim (nur DE),
 * Debounce 500 ms oder Enter. Treffer-Klick → fitBounds + entfernbarer Marker.
 */
import L from 'leaflet';
import { getMap } from '../map/map';
import { NOMINATIM } from '../config/datasources';

interface NominatimHit {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
}

let marker: L.Marker | null = null;
let debounce: number | undefined;

export function initSearch(): void {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const bar = document.createElement('div');
  bar.id = 'searchbar';
  bar.innerHTML = `
    <div class="search-pill">
      <span aria-hidden="true">🔍</span>
      <input type="search" id="q" placeholder="Ort suchen" autocomplete="off"
             aria-label="Ort suchen" enterkeyhint="search" />
    </div>
    <div id="q-results" role="listbox"></div>`;
  mapEl.appendChild(bar);

  const input = bar.querySelector<HTMLInputElement>('#q')!;
  input.addEventListener('input', () => {
    window.clearTimeout(debounce);
    const q = input.value.trim();
    if (q.length < 3) {
      renderResults([]);
      return;
    }
    debounce = window.setTimeout(() => void search(q), 500);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.clearTimeout(debounce);
      void search(input.value.trim());
    }
  });
}

async function search(q: string): Promise<void> {
  const box = document.getElementById('q-results');
  if (!box || !q) return;
  box.innerHTML = '<div class="empty">suche …</div>';
  try {
    const res = await fetch(NOMINATIM.search(q), { headers: { 'Accept-Language': 'de' } });
    const hits = (await res.json()) as NominatimHit[];
    renderResults(Array.isArray(hits) ? hits : []);
  } catch {
    box.innerHTML = '<div class="empty">Suche nicht erreichbar.</div>';
  }
}

function renderResults(hits: NominatimHit[]): void {
  const box = document.getElementById('q-results');
  if (!box) return;
  if (!hits.length) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = '';
  for (const h of hits) {
    const parts = h.display_name.split(',');
    const name = parts[0].trim();
    const rest = parts.slice(1, 4).join(',').trim();
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'qhit';
    el.setAttribute('role', 'option');
    el.innerHTML = `<strong>${escapeHtml(name)}</strong><small>${escapeHtml(rest)}</small>`;
    el.addEventListener('click', () => selectHit(h, name));
    box.appendChild(el);
  }
}

function selectHit(h: NominatimHit, name: string): void {
  const map = getMap();
  const [s, n, w, e] = h.boundingbox.map(Number);
  map.fitBounds(
    [
      [s, w],
      [n, e],
    ],
    { maxZoom: 16 },
  );
  if (marker) map.removeLayer(marker);
  marker = L.marker([Number(h.lat), Number(h.lon)]).addTo(map);
  marker.bindPopup(`<b>${escapeHtml(name)}</b><br><a href="#" data-rm>Marker entfernen</a>`);
  marker.on('popupopen', (ev) => {
    ev.popup
      .getElement()
      ?.querySelector<HTMLAnchorElement>('[data-rm]')
      ?.addEventListener('click', (evt) => {
        evt.preventDefault();
        if (marker) map.removeLayer(marker);
        marker = null;
      });
  });
  marker.openPopup();
  renderResults([]);
  const input = document.getElementById('q') as HTMLInputElement | null;
  if (input) input.value = name;
}

/** Escaping — Nutzereingabe/Fremddaten nie roh ins DOM (Prototyp-Lektion). */
function escapeHtml(s: string): string {
  return s.replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c,
  );
}
