/**
 * Schwebende Aktions-Buttons über der Karte (design.md § Components):
 *   ？ Hilfe (sekundär) · ⌖ GPS (sekundär) · ＋ Fund (primär, Amber).
 * Phase 0: Gerüst ohne Funktion — die Features docken in späteren Phasen an.
 */

export type FabId = 'help' | 'gps' | 'find';

const FABS: { id: FabId; label: string; text: string; primary: boolean }[] = [
  { id: 'help', label: 'Hilfe', text: '?', primary: false },
  { id: 'gps', label: 'GPS folgen', text: '⌖', primary: false },
  { id: 'find', label: 'Fund an meiner Position', text: '＋', primary: true },
];

const handlers = new Map<FabId, () => void>();

export function initFabs(): void {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const wrap = document.createElement('div');
  wrap.id = 'fabs';
  for (const fab of FABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = fab.primary ? 'fab fab-primary' : 'fab fab-secondary';
    btn.dataset.fab = fab.id;
    btn.title = fab.label;
    btn.setAttribute('aria-label', fab.label);
    btn.textContent = fab.text;
    btn.addEventListener('click', () => handlers.get(fab.id)?.());
    wrap.appendChild(btn);
  }
  mapEl.appendChild(wrap);
}

/** Spätere Phasen registrieren hier ihre Aktion (z. B. GPS-Start). */
export function onFab(id: FabId, handler: () => void): void {
  handlers.set(id, handler);
}

export function fabElement(id: FabId): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`#fabs [data-fab="${id}"]`);
}
