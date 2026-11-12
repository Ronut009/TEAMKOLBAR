// PWA glue: touch/compact classes for the mobile CSS, orientation event, landscape lock,
// wake lock while playing, and service-worker registration (https or localhost only).
// Hybrid build: everything device-shaped keys off the chosen Mode (js/core/mode.js), not
// off raw pointer detection — PC Mode never gets the touch classes or the screen locks.
// The service worker is shared: offline caching helps both modes.

import { Mode } from './core/mode.js';

const root = document.documentElement;
const isMobileMode = Mode.isMobile;
const COMPACT_MAX_HEIGHT = 520;

let lastOrientation = null;

function updateLayoutClasses() {
  const portrait = window.innerHeight > window.innerWidth;
  root.classList.toggle('touch', isMobileMode);
  root.classList.toggle('compact', isMobileMode && !portrait && window.innerHeight <= COMPACT_MAX_HEIGHT);

  const orientation = portrait ? 'portrait' : 'landscape';
  if (orientation !== lastOrientation) {
    lastOrientation = orientation;
    // Listeners (e.g. the engine) can pause while the rotate prompt covers the game.
    window.dispatchEvent(new CustomEvent('rakti:orientation', {
      detail: { orientation, touch: isMobileMode, blocked: isMobileMode && portrait },
    }));
  }
}

updateLayoutClasses();
window.addEventListener('resize', updateLayoutClasses);
window.addEventListener('orientationchange', updateLayoutClasses);

// ---- landscape lock (needs fullscreen on most browsers, so try on the first gesture too) ----
async function lockLandscape() {
  try {
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
  } catch (_) { /* unsupported or not allowed outside fullscreen: the rotate prompt covers it */ }
}
if (isMobileMode) {
  lockLandscape();
  const onFirstGesture = () => { lockLandscape(); requestWakeLock(); };
  window.addEventListener('pointerdown', onFirstGesture, { once: true });
}

// ---- wake lock: keep the screen on while the game is visible (Mobile Mode only) ----
let wakeLock = null;
async function requestWakeLock() {
  if (!isMobileMode) return;
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (_) { wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});
requestWakeLock();

// ---- INSTALL RAKTI (title screen) ----
// Browsers show their own install prompt only now and then (once, and not again for a while after it is closed),
// so the title screen keeps an INSTALL RAKTI button wherever the game can be installed and is not installed yet.
// Chrome / Edge / Samsung Internet: the button opens the browser's install prompt. iPhone / iPad Safari has no prompt:
// the button explains Share > Add to Home Screen. Running as the installed app, the button never shows.
const installed = () => window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS reports itself as a Mac
let installEvent = null;

function setInstallButton(show) {
  const btn = document.getElementById('installButton');
  if (btn) btn.hidden = !show || installed();
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();          // the button asks instead, every visit, rather than the browser's banner once
  installEvent = e;
  setInstallButton(true);
});
window.addEventListener('appinstalled', () => { installEvent = null; setInstallButton(false); });

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('installButton');
  const help = document.getElementById('installHelp');
  if (!btn) return;
  if (isIOS && !installed()) setInstallButton(true);
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (installEvent) {
      const ev = installEvent;
      installEvent = null;     // a prompt can be shown once; the browser sends a new one if it is declined
      try {
        await ev.prompt();
        const choice = await ev.userChoice;
        if (choice && choice.outcome === 'accepted') setInstallButton(false);
      } catch (_) { /* the browser refused: nothing changes */ }
      if (!installEvent && !isIOS) setInstallButton(false);
    } else if (help) {
      help.hidden = false;
      document.getElementById('installHelpClose')?.focus({ focusVisible: false });
    }
  });
  const close = (e) => { e.preventDefault(); e.stopPropagation(); help.hidden = true; btn.focus({ focusVisible: false }); };
  document.getElementById('installHelpClose')?.addEventListener('click', close);
  help?.addEventListener('click', (e) => { if (e.target === help) close(e); });
});

// ---- service worker ----
const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '[::1]';
if ('serviceWorker' in navigator && secure) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('[pwa] service worker registration failed', err));
  });
}
