/**
 * ==========================================================================
 * DEVELOPER OPTIONS (js/dev.js)
 * Only with ?dev in the address bar (as the engine's test keys): the three dots on the main menu open a panel;
 * "Level skip" there adds a small LEVELS button in the game that opens a menu to jump to any level.
 * A level reached this way is not saved to a save slot.
 * ==========================================================================
 */

const KEY = 'raktiDevLevelSkip';
const $ = (id) => document.getElementById(id);
const engine = () => window.__GAME__?.engine;

function load() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
function save(on) { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* private mode: lasts until reload */ } }

window.addEventListener('DOMContentLoaded', () => {
  const dots = $('devDots'), panel = $('devPanel'), toggle = $('devSkipToggle');
  const skipBtn = $('devSkipBtn'), skipMenu = $('devSkipMenu');
  if (!dots || !panel || !toggle || !skipBtn || !skipMenu) return;
  if (!new URLSearchParams(location.search).has('dev')) {   // players never see the developer options
    dots.remove(); panel.remove(); skipBtn.remove(); skipMenu.remove();
    return;
  }

  let enabled = load();
  toggle.checked = enabled;

  const open = (el) => { el.hidden = false; };
  const close = (el) => { el.hidden = true; };
  // swallow clicks so they never reach the game underneath
  const on = (el, fn) => el.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); fn(ev); });

  on(dots, () => open(panel));
  on($('devPanelClose'), () => close(panel));
  toggle.addEventListener('change', () => { enabled = toggle.checked; save(enabled); refresh(); });

  // in-game: the game is paused while the level menu is open
  let pausedByMenu = false;
  on(skipBtn, () => {
    const eng = engine();
    if (eng && eng.isGameStarted && !eng.paused) { eng.paused = true; pausedByMenu = true; }
    open(skipMenu);
  });
  const closeSkipMenu = () => {
    close(skipMenu);
    if (pausedByMenu) { pausedByMenu = false; engine()?.resume(); }
  };
  on($('devSkipClose'), closeSkipMenu);
  skipMenu.addEventListener('click', (ev) => { if (ev.target === skipMenu) closeSkipMenu(); });
  panel.addEventListener('click', (ev) => { if (ev.target === panel) close(panel); });
  skipMenu.querySelectorAll('[data-level]').forEach((b) => on(b, () => {
    pausedByMenu = false;
    close(skipMenu);
    engine()?.devJumpToLevel(Number(b.dataset.level));
  }));
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    if (!panel.hidden) close(panel);
    if (!skipMenu.hidden) { ev.stopPropagation(); closeSkipMenu(); }
  }, true);

  // the LEVELS button only shows while a level is being played
  function refresh() {
    const eng = engine();
    // (not over a dialogue box: it would sit on top of that box's own [E] button)
    skipBtn.hidden = !(enabled && eng && eng.isGameStarted && !eng.isLoading && !eng.dialogueActive);
  }
  setInterval(refresh, 250);
  refresh();
});
