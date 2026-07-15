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

// Interaktive Elemente nutzen Space/Enter selbst (Button auslösen, Checkbox, Link,
// Formularfeld). Die Blink-Analyse darf diese Tasten NICHT kapern — sonst kann ein
// Tastatur-Nutzer fokussierte Bedienelemente nicht mehr auslösen (A11y-Regression).
function isInteractive(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'OPTION'].includes(el.tagName)) return true;
  if (el.tagName === 'A' && el.hasAttribute('href')) return true;
  if (el.isContentEditable) return true;
  if (el.hasAttribute('tabindex')) return true;
  const role = el.getAttribute('role');
  return role === 'button' || role === 'checkbox' || role === 'link' || role === 'menuitem';
}

/** Kürzel nur auslösen, wenn KEIN interaktives Element im Fokus/Ziel ist. */
function shouldHandle(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return !isInteractive(e.target as Element) && !isInteractive(document.activeElement);
}

export function initKeyboard(): void {
  document.addEventListener('keydown', (e) => {
    if (!shouldHandle(e)) return;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault(); // sonst scrollt die Seite
      toggleLayer('relief');
    } else if (e.key === 'h' || e.key === 'H') {
      toggleLayer('uraufnahme');
    }
  });
}
