// Einstieg. WICHTIG (Prototyp-Lektion): Modul-Initialisierung passiert HIER am
// Ende des Imports-Graphen — nie verstreute Top-Level-Aufrufe vor Definitionen.
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/map.css';
import './styles/sheet.css';
import './styles/layers.css';
import './styles/search.css';
import './styles/ortcheck.css';
import './styles/field.css';
import './styles/toast.css';
import './styles/finds.css';

import { initMap } from './map/map';
import { mountDefaultLayers } from './map/layers';
import { initLayerControls } from './ui/layerControls';
import { initPresets } from './map/presets';
import { initSearch } from './features/search';
import { initOrtcheck } from './features/ortcheck';
import { initAttribution } from './ui/attribution';
import { initTabs } from './ui/tabs';
import { initSheet } from './ui/sheet';
import { initFabs } from './ui/fabs';
import { initGps } from './geo/gps';
import { initTrack } from './features/track';
import { initZone } from './features/zone';
import { initFinds } from './features/finds';

function start(): void {
  const map = initMap('map');
  mountDefaultLayers(map); // Basis + alle 4 Denkmal-Kategorien (Default)

  // Panel & Steuerung
  initLayerControls(); // Ebenen-Toggles/Deckkraft/Status (baut auf mountDefaultLayers)
  initPresets(); // Ansichts-Chips (nach LayerControls: braucht syncLayerCheckboxes)
  initSearch(); // schwebende Such-Pille
  initOrtcheck(); // Ort-Check (Ampel + Historie)
  initAttribution(); // Rechtliches/Lizenzen im Mehr-Tab

  // Shell
  initTabs();
  initSheet();
  initFabs();

  // Feld-Modus (nach initFabs — GPS dockt am ⌖-FAB an)
  initGps();
  initTrack();
  initZone();
  void initFinds();

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__map = map;
  }
}

start();
