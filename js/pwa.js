// PWA glue: touch/compact classes for the mobile CSS, orientation event, landscape lock,
// wake lock while playing, and service-worker registration (https or localhost only).
// Hybrid build: everything device-shaped keys off the chosen Mode (js/core/mode.js), not
// off raw pointer detection — PC Mode never gets the touch classes or the screen locks.
// The service worker is shared: offline caching helps both modes.

import { Mode } from './js/core/mode.js';

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

// ---- service worker ----
const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '[::1]';
if ('serviceWorker' in navigator && secure) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('[pwa] service worker registration failed', err));
  });
}
