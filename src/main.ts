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
import './styles/areas.css';
import './styles/mehr.css';
import './styles/onboarding.css';

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
import { initAreas } from './features/areas';
import { initHelp } from './ui/help';
import { initBackup } from './features/backup';
import { initOnboarding } from './ui/onboarding';
import { initKeyboard } from './ui/keyboard';
import { toast } from './ui/toast';

// Globaler Auffang: unerwartete Fehler nicht still verschlucken, sondern dem Nutzer
// in Alltagssprache melden (TASK-051, Vision § Voice & Tone). Konsole behält Details.
function installErrorNet(): void {
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
    toast('Etwas hat nicht geklappt. Versuch es bitte noch einmal.', 'error');
  });
  window.addEventListener('error', (e) => {
    if (e.message) console.error('Fehler:', e.message);
  });
}

function start(): void {
  installErrorNet();

  const map = initMap('map');
  mountDefaultLayers(map); // Basis + alle 4 Denkmal-Kategorien (Default)

  // Panel & Steuerung
  initLayerControls(); // Ebenen-Toggles/Deckkraft/Status (baut auf mountDefaultLayers)
  initPresets(); // Ansichts-Chips (nach LayerControls: braucht syncLayerCheckboxes)
  initSearch(); // schwebende Such-Pille
  initOrtcheck(); // Ort-Check (Ampel + Historie)

  // „Mehr"-Tab in fester Reihenfolge: Hilfe/Installation → Backup → Rechtliches.
  // initHelp leert #mehr-content einmal, die anderen beiden hängen an.
  initHelp(); // Hilfe-Modus, Kurzanleitung, Installation (TASK-046/049)
  initBackup(); // Daten sichern/übertragen (TASK-047/048)
  initAttribution(); // Rechtliches/Lizenzen

  // Shell
  initTabs();
  initSheet();
  initFabs();

  // Feld-Modus (nach initFabs — GPS dockt am ⌖-FAB an)
  initGps();
  initTrack();
  initZone();
  void initFinds();
  void initAreas();

  initKeyboard(); // Desktop-Blink-Analyse (Leertaste/H)
  initOnboarding(); // Erststart-Screens (nur einmal)

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__map = map;
  }
}

start();
