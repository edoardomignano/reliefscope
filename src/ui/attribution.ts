/**
 * Pflicht-Attribution & Rechtliches (TASK-017, PRD § 12 — rechtlich bindend).
 * Beide Lizenzhinweise stehen dauerhaft im „Mehr"-Aufklapper; zusätzlich führt
 * Leaflet die aktiven Ebenen-Attributionen in der Karten-Ecke.
 */
import { ATTRIBUTION } from '../config/datasources';

export function initAttribution(): void {
  const host = document.querySelector<HTMLElement>('[data-tab="mehr"] #mehr-content');
  if (!host) return;
  host.innerHTML = `
    <details class="legal" open>
      <summary>Rechtliches &amp; Lizenzen</summary>
      <p class="lic">${ATTRIBUTION.bvv}</p>
      <p class="lic">${ATTRIBUTION.blfd}</p>
      <p class="warn-text">Auf eingetragenen Bodendenkmälern ist der Einsatz von
        Metallsonden verboten (Art.&nbsp;7 Abs.&nbsp;6 BayDSchG). Im Nähebereich sind
        Bodeneingriffe erlaubnispflichtig. Ohne Einverständnis des Eigentümers ist Graben
        Sachbeschädigung. Funde sind meldepflichtig (Art.&nbsp;8 BayDSchG); seit 1.7.2023
        gilt in Bayern das Schatzregal.</p>
    </details>`;
}
