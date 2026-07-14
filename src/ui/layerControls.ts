/**
 * Ebenen-Steuerung im Karte-Panel (TASK-012, FR-001):
 * je Ebene ein Toggle, ein Deckkraft-Regler, ein Status-Punkt (grün/rot) und
 * eine Kurzinfo. Bewusst KEINE editierbaren Adressen (design.md Don't).
 */
import { getMap } from '../map/map';
import {
  LAYER_DEFS,
  isLayerVisible,
  layerStatus,
  onLayerStatus,
  setLayerOpacity,
  setLayerVisible,
  type LayerStatus,
} from '../map/layers';

/** Manuelles Ebenen-Umschalten meldet sich, damit Presets auf „custom" springen. */
export const LAYER_CHANGE_EVENT = 'rs:layerchange';

function statusClass(s: LayerStatus): string {
  return s === 'error' ? 'err' : s === 'ok' ? 'ok' : s === 'loading' ? 'load' : '';
}

export function initLayerControls(): void {
  const host = document.querySelector<HTMLElement>('[data-tab="karte"] #layers');
  if (!host) return;
  const map = getMap();

  host.innerHTML = '';
  for (const d of LAYER_DEFS) {
    const row = document.createElement('div');
    row.className = 'layer';
    row.dataset.layer = d.id;
    row.innerHTML = `
      <div class="layer-top">
        <span class="dot ${statusClass(layerStatus(d.id))}" data-dot="${d.id}"
              title="grün = lädt, rot = Ladefehler"></span>
        <span class="layer-name">${d.name}</span>
        <label class="switch" title="Ebene ein-/ausblenden">
          <input type="checkbox" data-on="${d.id}" ${isLayerVisible(d.id) ? 'checked' : ''} />
          <span class="slider-ui"></span>
        </label>
      </div>
      <p class="layer-info">${d.info}</p>
      <label class="opacity" title="Deckkraft">
        <span>Deckkraft</span>
        <input type="range" min="0" max="100" value="${Math.round(d.opacity * 100)}"
               data-op="${d.id}" />
      </label>`;

    const toggle = row.querySelector<HTMLInputElement>(`[data-on="${d.id}"]`)!;
    toggle.addEventListener('change', () => {
      setLayerVisible(map, d.id, toggle.checked);
      document.dispatchEvent(new CustomEvent(LAYER_CHANGE_EVENT));
    });

    const op = row.querySelector<HTMLInputElement>(`[data-op="${d.id}"]`)!;
    op.addEventListener('input', () => setLayerOpacity(d.id, Number(op.value) / 100));

    host.appendChild(row);
  }

  // Status-Punkte live nachführen.
  onLayerStatus((id, status) => {
    const dot = document.querySelector<HTMLElement>(`[data-dot="${id}"]`);
    if (dot) dot.className = `dot ${statusClass(status)}`;
  });
}

/** Setzt Checkboxen nach programmatischer Ebenen-Änderung (z. B. Preset) neu. */
export function syncLayerCheckboxes(): void {
  for (const d of LAYER_DEFS) {
    const cb = document.querySelector<HTMLInputElement>(`[data-on="${d.id}"]`);
    if (cb) cb.checked = isLayerVisible(d.id);
  }
}
