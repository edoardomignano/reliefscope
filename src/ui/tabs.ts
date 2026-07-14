/**
 * Tab-Leiste (mobil) — auf Desktop zeigt das Seitenpanel alle Sektionen,
 * die Leiste ist per CSS ausgeblendet. Sektionen werden über `data-tab`
 * den Tabs zugeordnet (Muster aus dem validierten Prototyp).
 */
import { refreshMapSize } from '../map/map';

export type TabId = 'karte' | 'check' | 'funde' | 'mehr';

export function initTabs(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('#tabs [data-tabbtn]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => showTab(btn.dataset.tabbtn as TabId));
  });
  showTab('karte');
}

export function showTab(tab: TabId): void {
  document
    .querySelectorAll<HTMLButtonElement>('#tabs [data-tabbtn]')
    .forEach((b) => b.classList.toggle('on', b.dataset.tabbtn === tab));
  document
    .querySelectorAll<HTMLElement>('#panel-content [data-tab]')
    .forEach((s) => s.classList.toggle('tab-on', s.dataset.tab === tab));
  document.getElementById('panel-content')?.scrollTo({ top: 0 });
  // Panel-Höhe kann sich ändern → Karte neu messen (Prototyp-Lektion).
  refreshMapSize();
}
