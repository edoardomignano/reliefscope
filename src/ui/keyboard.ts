/**
 * Tastatur-Kürzel als Desktop-Extra (TASK-052 / FR-015 „Blink-Analyse").
 * Schnelles Ein/Aus einer Ebene lässt Strukturen im Vergleich aufblitzen:
 *   Leertaste → Geländerelief   ·   H → Uraufnahme (~1850)
 * Wir schalten über die Panel-Checkboxen (click) — so bleiben Karte UND Panel synchron.
 *
 * Auf Mobilgeräten ohne Tastatur ist das schlicht inaktiv (kein Schaden).
 */
function toggleLayer(id: string): void {
  const cb = document.querySelector<HTMLInputElement>(`[data-on="${id}"]`);
  cb?.click(); // feuert das change-Handling in layerControls → Karte + Panel synchron
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

export function initKeyboard(): void {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      toggleLayer('relief');
    } else if (e.key === 'h' || e.key === 'H') {
      toggleLayer('uraufnahme');
    }
  });
}
