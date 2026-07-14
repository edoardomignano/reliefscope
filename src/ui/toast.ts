/**
 * Kurze Meldungen (TASK-031). Alltagssprache statt Fehlercodes (Vision § Voice & Tone).
 */
export type ToastKind = 'info' | 'error' | 'success';

let host: HTMLElement | null = null;

function ensureHost(): HTMLElement {
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

export function toast(message: string, kind: ToastKind = 'info', ms = 4000): void {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  ensureHost().appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  window.setTimeout(() => {
    el.classList.remove('show');
    window.setTimeout(() => el.remove(), 250);
  }, ms);
}
