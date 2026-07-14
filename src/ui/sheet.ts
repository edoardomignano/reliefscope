/**
 * Bottom-Sheet-Verhalten (mobil): Griff über dem Panel; Tipp klappt das Panel
 * auf Griffhöhe zusammen (Vollbild-Karte) bzw. wieder auf.
 * Desktop: der Griff ist per CSS ausgeblendet, das Panel ist ein Seitenpanel.
 */
import { refreshMapSize } from '../map/map';

export function initSheet(): void {
  const panel = document.getElementById('panel');
  if (!panel) return;

  const handle = document.createElement('button');
  handle.id = 'sheet-handle';
  handle.type = 'button';
  handle.setAttribute('aria-label', 'Panel ein-/ausklappen');
  handle.innerHTML = '<span class="bar"></span>';
  panel.prepend(handle);

  handle.addEventListener('click', () => {
    panel.classList.toggle('mini');
    // Kartenfläche ändert sich → neu messen, sonst bleiben Kachel-Lücken.
    refreshMapSize();
  });
}

export function isSheetCollapsed(): boolean {
  return document.getElementById('panel')?.classList.contains('mini') ?? false;
}
