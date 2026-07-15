/**
 * Hilfe-System (TASK-049) + Installation (TASK-046), FR-012/FR-013.
 *
 * Drei Bausteine im „Mehr"-Tab:
 *  1. Kurzanleitung (5 Punkte) als Aufklapper.
 *  2. Hilfe-Modus: title-Tooltips für die Maus + „?"-Touch-Modus — antippen zeigt
 *     die Erklärung STATT die Aktion auszulösen (Capture-Phase fängt den Klick ab).
 *  3. Installation: „Als App installieren" (Android/beforeinstallprompt),
 *     iOS-Anleitung, Erkennung „läuft bereits installiert".
 *
 * Die title-Texte sind statisch (kein Nutzer-Input) und werden per setAttribute
 * gesetzt — also kein HTML-Escaping nötig; die innerHTML-Blöcke sind Festtext.
 */
import { toast } from './toast';

/** Erklärung je Kern-Bedienelement — dient Maus-Tooltip UND Touch-Hilfemodus. */
const HELP: Array<[selector: string, text: string]> = [
  ['#ortcheck-tool', 'Tippe auf die Karte — die App prüft Denkmäler im Umkreis und zeigt die Ampel.'],
  ['#hist-radius', 'Umkreis, in dem nach Denkmälern und Historie gesucht wird.'],
  ['#finds-place', 'Setzt einen Fund-Marker auf die Karte, danach kannst du Foto und Notiz erfassen.'],
  ['#area-draw', 'Zeichne ein Feld, für das du eine Erlaubnis hast, und hinterlege den Eigentümer.'],
  ['#zone-draw', 'Zeichne deine Suchzone. Mit Alarm wirst du gewarnt, wenn du sie verlässt.'],
  ['#zone-alarm', 'Vibration und Ton, sobald deine GPS-Position die Zone verlässt.'],
  ['#track-clear', 'Löscht die aufgezeichnete Laufspur.'],
  ['[data-tabbtn="karte"]', 'Karte & Ebenen: Relief, Luftbild, historische Karten, Denkmäler.'],
  ['[data-tabbtn="check"]', 'Ort prüfen: darf ich hier legal sondeln? Historie der Umgebung.'],
  ['[data-tabbtn="funde"]', 'Feld & Funde: Spur, Zone, Fund-Logbuch, genehmigte Gebiete.'],
  ['[data-tabbtn="mehr"]', 'Mehr: Hilfe, Installation, Datensicherung, Rechtliches.'],
];

let helpMode = false;

function applyTooltips(): void {
  for (const [sel, text] of HELP) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.setAttribute('title', text);
      el.dataset.help = text;
    });
  }
}

function explanationFor(el: EventTarget | null): string | null {
  let node = el as HTMLElement | null;
  while (node && node !== document.body) {
    if (node.dataset?.help) return node.dataset.help;
    node = node.parentElement;
  }
  return null;
}

function setHelpMode(on: boolean): void {
  helpMode = on;
  document.body.classList.toggle('help-mode', on);
  const btn = document.getElementById('help-mode-btn');
  if (btn) {
    btn.classList.toggle('active', on);
    btn.textContent = on ? 'Hilfe-Modus beenden' : 'Hilfe-Modus (antippen erklärt)';
  }
  if (on) toast('Hilfe-Modus: Tippe ein Element an — du bekommst die Erklärung statt der Aktion.', 'info', 5000);
}

// Capture-Phase: fängt den Klick VOR dem eigentlichen Handler ab.
function onCaptureClick(e: MouseEvent): void {
  if (!helpMode) return;
  const btn = (e.target as HTMLElement).closest('#help-mode-btn');
  if (btn) return; // den Beenden-Button normal durchlassen
  const text = explanationFor(e.target);
  e.preventDefault();
  e.stopPropagation();
  toast(text ?? 'Für dieses Element gibt es keine Kurzerklärung.', 'info', 5000);
}

// ---- Installation ----
let deferredPrompt: (Event & { prompt: () => void }) | null = null;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
/** Einfacher Handy-Leitfaden — beide Geräte immer sichtbar, damit niemand an einer
 *  fehlerhaften Geräte-Erkennung (In-App-Browser, iPad) scheitert. */
function guideHtml(): string {
  return `
    <div class="install-guide">
      <div class="ig-device">
        <span class="ig-head">📱 iPhone (in Safari)</span>
        <ol>
          <li>Unten auf das <b>Teilen-Symbol</b> tippen — das Quadrat mit dem Pfeil nach oben ⬆️.</li>
          <li>Etwas nach unten wischen, <b>„Zum Home-Bildschirm"</b> antippen.</li>
          <li>Oben rechts <b>„Hinzufügen"</b>.</li>
        </ol>
      </div>
      <div class="ig-device">
        <span class="ig-head">🤖 Android (in Chrome)</span>
        <ol>
          <li>Oben rechts auf die <b>drei Punkte ⋮</b> tippen.</li>
          <li><b>„App installieren"</b> antippen.</li>
        </ol>
      </div>
    </div>`;
}

function renderInstall(): void {
  const box = document.getElementById('install-box');
  if (!box) return;
  if (isStandalone()) {
    box.innerHTML = `<p class="ok-text">✓ Erledigt — ReliefScope liegt schon auf deinem Startbildschirm.</p>`;
    return;
  }
  // Wenn der Browser den Ein-Tipp-Weg anbietet (meist Android): großer Knopf zuerst.
  let top = '';
  if (deferredPrompt) {
    top = `<button type="button" id="install-btn" class="btn-primary">📲 Jetzt aufs Handy legen</button>
      <p class="muted small">Ein Tipp genügt — oder folge der Anleitung unten.</p>`;
  }
  box.innerHTML = top + guideHtml();
  box.querySelector('#install-btn')?.addEventListener('click', () => {
    deferredPrompt?.prompt();
    deferredPrompt = null;
  });
}

export function initHelp(): void {
  const host = document.querySelector<HTMLElement>('[data-tab="mehr"] #mehr-content');
  if (!host) return;
  host.innerHTML = ''; // „Mehr" wird von help → backup → attribution der Reihe nach befüllt

  const card = document.createElement('section');
  card.className = 'mehr-card';
  card.innerHTML = `
    <h3>Hilfe</h3>
    <details class="info">
      <summary>Kurzanleitung in 5 Schritten</summary>
      <ol class="guide">
        <li><b>Ort prüfen:</b> Tab „Prüfen" → auf die Karte tippen. Die Ampel sagt, ob du legal darfst.</li>
        <li><b>Umgebung lesen:</b> Relief, altes Luftbild und die Uraufnahme (~1850) zeigen frühere Wege und Strukturen.</li>
        <li><b>Erlaubnis sichern:</b> Feld unter „Funde" als Gebiet markieren, Eigentümer + Telefon hinterlegen.</li>
        <li><b>Im Feld:</b> GPS folgt dir, deine Spur wird aufgezeichnet, die Zone warnt beim Verlassen.</li>
        <li><b>Funde festhalten:</b> ＋ setzt einen Marker, dann Foto, Notiz und Leitwert erfassen.</li>
      </ol>
      <p class="warn-text">Grün heißt „kein bekanntes Bodendenkmal in der Nähe" — kein
        Freibrief. Ohne Erlaubnis des Eigentümers ist Graben verboten.</p>
    </details>
    <button type="button" id="help-mode-btn" class="btn-secondary">Hilfe-Modus (antippen erklärt)</button>

    <h3>ReliefScope aufs Handy legen</h3>
    <p class="muted">Dann hast du es wie eine ganz normale App: ein Tipp auf das Symbol
      auf deinem Startbildschirm — kein Browser-Suchen. Und die Karten funktionieren
      auch draußen ohne Internet.</p>
    <div id="install-box"></div>`;
  host.appendChild(card);

  applyTooltips();
  document.getElementById('help-mode-btn')?.addEventListener('click', () => setHelpMode(!helpMode));
  document.addEventListener('click', onCaptureClick, true); // capture
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpMode) setHelpMode(false);
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as Event & { prompt: () => void };
    renderInstall();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    renderInstall();
    toast('ReliefScope wurde installiert. 🎉', 'success');
  });
  renderInstall();
}
