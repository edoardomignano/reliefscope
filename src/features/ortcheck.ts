/**
 * Ort-Check — der Magic Moment (TASK-021–025, FR-003).
 * Werkzeug aktivieren → auf die Karte tippen → EIN Ergebnis: Ampel (rot/gelb/grün)
 * plus Umgebungs-Historie mit amtlichen Beschreibungen. Umkreis per Slider.
 */
import L from 'leaflet';
import { getMap } from '../map/map';
import { showTab } from '../ui/tabs';
import { utm32ToWgs84 } from '../geo/coords';
import { DenkmalError, fetchDetail, fetchUmkreis, type DenkmalNear } from '../denkmal/api';
import { computeAmpel, KEIN_FREIBRIEF, type AmpelLevel } from '../denkmal/ampel';

let active = false;
let lastPoint: L.LatLng | null = null;
let radiusM = 500;
const overlay = L.layerGroup();

const OBJ_META: Record<string, { label: string; badge: string }> = {
  boden: { label: 'Bodendenkmal', badge: 'badge-boden' },
  bau: { label: 'Baudenkmal', badge: 'badge-bau' },
  ensemble: { label: 'Ensemble', badge: 'badge-ensemble' },
};
const DOT: Record<AmpelLevel, string> = { rot: 'red', gelb: 'amber', gruen: 'green' };

function esc(s: string): string {
  return String(s).replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c,
  );
}

export function initOrtcheck(): void {
  const map = getMap();
  overlay.addTo(map);

  const tool = document.getElementById('ortcheck-tool');
  tool?.addEventListener('click', () => setActive(!active));

  const slider = document.getElementById('hist-radius') as HTMLInputElement | null;
  const label = document.getElementById('hist-val');
  slider?.addEventListener('input', () => {
    radiusM = Number(slider.value);
    if (label) label.textContent = String(radiusM);
  });
  slider?.addEventListener('change', () => {
    if (lastPoint) void runCheck(lastPoint);
  });

  map.on('click', (e) => {
    if (!active) return;
    void runCheck(e.latlng);
  });
}

function setActive(on: boolean): void {
  active = on;
  document.getElementById('ortcheck-tool')?.classList.toggle('active', on);
  getMap().getContainer().style.cursor = on ? 'crosshair' : '';
}

async function runCheck(latlng: L.LatLng): Promise<void> {
  lastPoint = latlng;
  showTab('check'); // mobil: Ergebnis-Bereich nach vorne
  const box = document.getElementById('check-result');
  if (!box) return;
  box.innerHTML = '<div class="loading">Prüfe amtliche Daten…</div>';

  drawOverlay(latlng);

  let monuments: DenkmalNear[];
  try {
    monuments = await fetchUmkreis(latlng.lat, latlng.lng, radiusM);
  } catch (err) {
    // NIE „grün" bei Fehler (PRD § 11). 404 = außerhalb Bayern, sonst offline.
    const coverage = err instanceof DenkmalError && err.kind === 'coverage';
    box.innerHTML = coverage
      ? `<div class="ampel-card offline">
          <b>Außerhalb Bayerns</b>
          <p>Hier gibt es keine amtlichen Denkmaldaten — ReliefScope deckt Bayern ab.</p></div>`
      : `<div class="ampel-card offline">
          <b>Amtlicher Dienst nicht erreichbar</b>
          <p>Offline sind nur bereits besuchte Gebiete verfügbar. Sobald du wieder Netz
          hast, hier erneut tippen.</p></div>`;
    return;
  }

  renderResult(computeAmpel(monuments), monuments);
}

function renderResult(
  ampel: ReturnType<typeof computeAmpel>,
  monuments: DenkmalNear[],
): void {
  const box = document.getElementById('check-result');
  if (!box) return;

  const reasons = ampel.reasons.map((r) => `<li>${esc(r)}</li>`).join('');
  const freibrief =
    ampel.level === 'rot' ? '' : `<p class="freibrief">${esc(KEIN_FREIBRIEF)}</p>`;

  const sorted = [...monuments].sort((a, b) => a.distance - b.distance);
  const listHead = sorted.length
    ? `<p class="hist-head">${sorted.length} Denkmäler im ${radiusM}-m-Umkreis (nach Entfernung):</p>`
    : '';
  const list = sorted
    .map((d, i) => {
      const meta = OBJ_META[d.objtyp] ?? { label: d.objtyp, badge: 'badge-bau' };
      return `<div class="hist" data-i="${i}">
        <div class="hist-top">
          <span class="badge ${meta.badge}">${esc(meta.label)}</span>
          <span class="hist-name">${esc(d.bezeichnung || d.funktion || '—')}</span>
          <span class="hist-dist">${Math.round(d.distance)} m</span>
        </div>
        <div class="hist-sub">${esc(d.funktion || '')}${d.aktennummer ? ' · Akte ' + esc(d.aktennummer) : ''}</div>
        <div class="hist-acts">
          <button type="button" data-desc="${i}">Beschreibung</button>
          <button type="button" data-show="${i}">Auf Karte</button>
        </div>
        <div class="hist-desc" data-descbox="${i}" hidden></div>
      </div>`;
    })
    .join('');

  box.innerHTML = `
    <div class="ampel-card level-${ampel.level}">
      <div class="ampel-head">
        <span class="ampel-dot ${DOT[ampel.level]}"></span>
        <b>${esc(ampel.title)}</b>
      </div>
      <ul class="ampel-reasons">${reasons}</ul>
      ${freibrief}
    </div>
    ${listHead}
    <div id="hist-list">${list}</div>`;

  // Aktionen je Listeneintrag
  box.querySelectorAll<HTMLButtonElement>('[data-show]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = sorted[Number(btn.dataset.show)];
      const { lat, lng } = utm32ToWgs84(d.east_utm, d.north_utm);
      getMap().setView([lat, lng], 17);
    });
  });
  box.querySelectorAll<HTMLButtonElement>('[data-desc]').forEach((btn) => {
    btn.addEventListener('click', () => void loadDescription(sorted[Number(btn.dataset.desc)], Number(btn.dataset.desc)));
  });
}

async function loadDescription(d: DenkmalNear, i: number): Promise<void> {
  const target = document.querySelector<HTMLElement>(`[data-descbox="${i}"]`);
  if (!target) return;
  if (target.dataset.loaded) {
    target.hidden = !target.hidden;
    return;
  }
  target.hidden = false;
  target.textContent = 'lädt …';
  const detail = await fetchDetail(d.koid, d.objtyp);
  target.dataset.loaded = '1';
  if (!detail) {
    target.textContent = 'Beschreibung nicht verfügbar.';
    return;
  }
  const pdf = detail.gdelistlink
    ? `<br><a href="${esc(detail.gdelistlink)}" target="_blank" rel="noopener">Denkmalliste (PDF)</a>`
    : '';
  target.innerHTML = `${esc(detail.beschreibung || '(keine Beschreibung hinterlegt)')}${pdf}`;
}

function drawOverlay(latlng: L.LatLng): void {
  overlay.clearLayers();
  L.circle(latlng, {
    radius: radiusM,
    color: '#6b6b63',
    weight: 1,
    fillOpacity: 0.04,
    dashArray: '4,4',
  }).addTo(overlay);
  L.circleMarker(latlng, {
    radius: 6,
    color: 'var(--accent)',
    weight: 2,
    fillColor: 'var(--accent)',
    fillOpacity: 0.9,
  }).addTo(overlay);
}
