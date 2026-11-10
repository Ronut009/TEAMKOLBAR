/**
 * ==========================================================================
 * MODE (js/core/mode.js) — hybrid experimental build only
 * One shared game, two experiences. Everything lives in the middle of the
 * Venn diagram except what truly differs by device:
 *   Mobile Mode: the touch overlay (touch.js), the PWA screen locks (pwa.js)
 *                and the touch-tuned jump physics (player.js).
 *   PC Mode:     keyboard / mouse / controller, the PC jump physics.
 * The choice is made once on the title screen (or auto-detected on first
 * visit) and remembered. Switching reloads the page so every module starts
 * in the right mode.
 * ==========================================================================
 */

const KEY = 'raktiMode';

// A device whose primary pointer is coarse (finger) counts as mobile.
const coarse = Boolean(
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
  (navigator.maxTouchPoints > 0 && window.matchMedia && !window.matchMedia('(hover: hover)').matches)
);

let stored = null;
try { stored = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
if (stored !== 'mobile' && stored !== 'pc') stored = null;

const current = stored || (coarse ? 'mobile' : 'pc');

export const Mode = {
  current,
  isMobile: current === 'mobile',
  isTouchDevice: coarse,
  wasChosen: stored !== null,

  /** Save the choice and restart in it. */
  set(next) {
    if (next !== 'mobile' && next !== 'pc') return;
    try { localStorage.setItem(KEY, next); } catch (e) { /* lasts this session only */ }
    location.reload();
  }
};

document.documentElement.classList.add(current === 'mobile' ? 'mode-mobile' : 'mode-pc');

// ---- title screen: the MODE switch and the portrait-window prompt ----
window.addEventListener('DOMContentLoaded', () => {
  // 1. The segmented MODE control under the title buttons
  const seg = document.getElementById('modeSwitch');
  if (seg) {
    seg.querySelectorAll('[data-mode]').forEach((b) => {
      b.classList.toggle('chosen', b.dataset.mode === current);
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (b.dataset.mode !== current) Mode.set(b.dataset.mode);
      });
    });
  }

  // 2. Narrow-and-tall viewport: recommend the right experience.
  //    - Touch device in PC Mode: one button switches to Mobile Mode.
  //    - Touch device in Mobile Mode: ask for landscape (the classic rotate prompt).
  //    - Desktop window: the game plays best in landscape; suggest resizing. Dismissable.
  const prompt = document.getElementById('orientationPrompt');
  if (!prompt) return;
  const title = prompt.querySelector('.op-title');
  const text = prompt.querySelector('.op-text');
  const switchBtn = document.getElementById('opSwitchMode');
  const dismissBtn = document.getElementById('opDismiss');
  let dismissed = false;

  const refresh = () => {
    const portrait = window.innerHeight > window.innerWidth;
    if (!portrait || dismissed) { prompt.classList.remove('show'); return; }
    if (coarse && !Mode.isMobile) {
      title.textContent = 'ON A PHONE?';
      text.textContent = 'This looks like a touch screen. Mobile Mode adds on-screen controls built for it.';
      switchBtn.hidden = false;
      dismissBtn.hidden = false;
      dismissBtn.textContent = 'STAY IN PC MODE';
    } else if (coarse) {
      title.textContent = 'ROTATE YOUR PHONE';
      text.textContent = 'Rakti is best fought in landscape.';
      switchBtn.hidden = true;
      dismissBtn.hidden = true;
    } else {
      title.textContent = 'BEST IN LANDSCAPE';
      text.textContent = 'This window is taller than it is wide. Rakti plays best in a wide window — try resizing it.';
      switchBtn.hidden = true;
      dismissBtn.hidden = false;
      dismissBtn.textContent = 'GOT IT';
    }
    prompt.classList.add('show');
  };

  switchBtn?.addEventListener('click', (e) => { e.preventDefault(); Mode.set('mobile'); });
  dismissBtn?.addEventListener('click', (e) => { e.preventDefault(); dismissed = true; refresh(); });
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);
  refresh();
});
