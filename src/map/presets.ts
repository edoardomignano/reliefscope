/**
 * Ansichts-Presets als Chips (FR-002). Ein Tipp stellt ein Ebenen-Set ein.
 * Manuelle Ebenen-Änderung löst das Preset auf „custom". Auswahl in localStorage.
 */
import { getMap } from '../map/map';
import { LAYER_DEFS, isLayerVisible, setLayerVisible } from './layers';
import { LAYER_CHANGE_EVENT, syncLayerCheckboxes } from '../ui/layerControls';
import { local, type PresetId } from '../store/local';

interface Preset {
  id: Exclude<PresetId, 'custom'>;
  label: string;
  /** Sichtbare Ebenen; alle übrigen werden ausgeblendet. */
  on: string[];
}

const PRESETS: Preset[] = [
  { id: 'feld', label: '🥾 Feld', on: ['osm', 'boden'] },
  {
    id: 'recherche',
    label: '🔍 Recherche',
    on: ['osm', 'relief', 'boden', 'bau', 'ensemble', 'landschaft'],
  },
  { id: '1850', label: '🗺 ~1850', on: ['uraufnahme', 'boden'] },
  { id: 'luftbild', label: '✈ Luftbild', on: ['dop20', 'boden'] },
];

let suppressCustom = false; // während wir selbst schalten, nicht auf „custom" springen

function highlight(id: PresetId | null): void {
  document
    .querySelectorAll<HTMLButtonElement>('#presets .chip')
    .forEach((c) => c.classList.toggle('on', c.dataset.preset === id));
}

export function applyPreset(id: Preset['id']): void {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) return;
  const map = getMap();
  suppressCustom = true;
  for (const d of LAYER_DEFS) setLayerVisible(map, d.id, preset.on.includes(d.id));
  suppressCustom = false;
  syncLayerCheckboxes();
  highlight(id);
  local.setPreset(id);
}

export function initPresets(): void {
  const host = document.getElementById('presets');
  if (!host) return;

  host.innerHTML = '';
  for (const p of PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.dataset.preset = p.id;
    btn.textContent = p.label;
    btn.addEventListener('click', () => {
      if (btn.classList.contains('on')) {
        // nochmal tippen = Preset lösen
        highlight(null);
        local.setPreset(null);
      } else {
        applyPreset(p.id);
      }
    });
    host.appendChild(btn);
  }

  // Manuelle Ebenen-Änderung → Preset auf „custom".
  document.addEventListener(LAYER_CHANGE_EVENT, () => {
    if (suppressCustom) return;
    highlight('custom'); // matcht keinen Chip → alle aus
    local.setPreset('custom');
  });

  // Gespeichertes Preset wiederherstellen (nur echte Presets, nicht „custom").
  const saved = local.getPreset();
  if (saved && saved !== 'custom' && PRESETS.some((p) => p.id === saved)) {
    applyPreset(saved as Preset['id']);
  } else {
    // Default-Zustand entspricht keinem Preset, wenn Ebenen abweichen → Chips aus.
    highlight(matchingPreset());
  }
}

/** Findet ein Preset, dessen Ebenen-Set exakt dem aktuellen Zustand entspricht. */
function matchingPreset(): PresetId | null {
  for (const p of PRESETS) {
    const match = LAYER_DEFS.every((d) => isLayerVisible(d.id) === p.on.includes(d.id));
    if (match) return p.id;
  }
  return null;
}
