/**
 * Onboarding beim Erststart (TASK-050). Drei Screens entlang des Kern-Versprechens
 * „Sondle legal — und finde bessere Plätze", danach ein Install-Hinweis. Wird nur
 * einmal gezeigt (localStorage-Flag) und baut sein Overlay selbst im DOM auf.
 */
const FLAG = 'rs_onboarded';

interface Screen {
  emoji: string;
  title: string;
  body: string;
}

const SCREENS: Screen[] = [
  {
    emoji: '⚖️',
    title: 'Prüfe, ob du legal darfst',
    body: 'Tippe auf die Karte — ReliefScope prüft eingetragene Bodendenkmäler in der Umgebung. Auf ihnen ist Sondeln in Bayern verboten.',
  },
  {
    emoji: '🛰️',
    title: 'Finde bessere Plätze',
    body: 'Relief, altes Luftbild und die Uraufnahme von ~1850 zeigen frühere Wege, Höfe und Strukturen — Hinweise auf lohnende, legale Flächen.',
  },
  {
    emoji: '📷',
    title: 'Halte Funde fest',
    body: 'GPS folgt dir, deine Spur wird aufgezeichnet, und jeder Fund kommt mit Foto, Notiz und Leitwert ins Logbuch — alles bleibt auf deinem Gerät.',
  },
];

function alreadySeen(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}
function markSeen(): void {
  try {
    localStorage.setItem(FLAG, '1');
  } catch {
    /* Private Mode: dann eben jedes Mal — kein Datenverlust */
  }
}

export function initOnboarding(): void {
  if (alreadySeen()) return;

  let idx = 0;
  const overlay = document.createElement('div');
  overlay.id = 'onboarding';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="ob-card">
      <button type="button" class="ob-skip" aria-label="Überspringen">Überspringen</button>
      <div class="ob-emoji"></div>
      <h2 class="ob-title"></h2>
      <p class="ob-body"></p>
      <div class="ob-dots"></div>
      <button type="button" class="ob-next btn-primary"></button>
    </div>`;
  document.body.appendChild(overlay);

  const emojiEl = overlay.querySelector<HTMLElement>('.ob-emoji')!;
  const titleEl = overlay.querySelector<HTMLElement>('.ob-title')!;
  const bodyEl = overlay.querySelector<HTMLElement>('.ob-body')!;
  const dotsEl = overlay.querySelector<HTMLElement>('.ob-dots')!;
  const nextBtn = overlay.querySelector<HTMLButtonElement>('.ob-next')!;

  function render(): void {
    const s = SCREENS[idx];
    emojiEl.textContent = s.emoji;
    titleEl.textContent = s.title;
    bodyEl.textContent = s.body;
    nextBtn.textContent = idx === SCREENS.length - 1 ? 'Los geht’s' : 'Weiter';
    dotsEl.innerHTML = SCREENS.map((_, i) => `<span class="${i === idx ? 'on' : ''}"></span>`).join('');
  }

  function close(): void {
    markSeen();
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 250);
  }

  nextBtn.addEventListener('click', () => {
    if (idx < SCREENS.length - 1) {
      idx++;
      render();
    } else {
      close();
    }
  });
  overlay.querySelector('.ob-skip')?.addEventListener('click', close);

  render();
}
