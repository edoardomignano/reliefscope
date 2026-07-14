// Einstieg. WICHTIG (Prototyp-Lektion): Modul-Initialisierung passiert HIER am
// Ende des Imports-Graphen — nie verstreute Top-Level-Aufrufe vor Definitionen.
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/map.css';
import './styles/sheet.css';
import { initMap } from './map/map';
import { initTabs } from './ui/tabs';
import { initSheet } from './ui/sheet';
import { initFabs } from './ui/fabs';

function start(): void {
  const map = initMap('map');
  initTabs();
  initSheet();
  initFabs();

  // Nur im Dev-Build: Karte für Browser-Verifikation zugreifbar machen.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__map = map;
  }
}

start();
