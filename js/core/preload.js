/**
 * ==========================================================================
 * ASSET PRELOADER (js/core/preload.js)
 * Every level builds its art with `new Image().src = ...` when the game starts. On a first visit those files are still
 * downloading when a level is drawn, which showed as invisible platforms and backgrounds (and as lag while they pop in).
 * This module is imported before anything else: it watches every image the game asks for, so the title menu can hold the
 * buttons (with a progress bar) and the loading screen can wait until the files of the level being entered have arrived.
 * ==========================================================================
 */

const GROUPS = ['core', 'endless', 'level2', 'level3', 'level4'];
const GIVE_UP_MS = 90000;           // never block the game forever (a stalled connection): play on after this long

const stats = {};
for (const g of GROUPS) stats[g] = { total: 0, done: 0 };

const groupOf = (url) => {
  const m = /assets\/(level2|level3|level4|endless)\//.exec(url || '');
  return m ? m[1] : 'core';         // title, UI, audio, Rakti, portraits and Level 1 are needed from the first frame
};

// count every image from the moment its src is set until it has loaded (or failed)
const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
if (desc && desc.set) {
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    enumerable: desc.enumerable,
    get() { return desc.get.call(this); },
    set(value) {
      const g = groupOf(String(value));
      const s = stats[g];
      s.total++;
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        s.done++;
        this.removeEventListener('load', settle);
        this.removeEventListener('error', settle);
      };
      this.addEventListener('load', settle);
      this.addEventListener('error', settle);
      desc.set.call(this, value);
      if (this.complete && this.naturalWidth > 0) settle();
    }
  });
}

let engineReadyAt = 0;

export const Preload = {
  /** main.js calls this once the Engine (and with it every level's image requests) exists. */
  markEngineReady() { engineReadyAt = performance.now(); },

  ready(groups) {
    if (!engineReadyAt) return false;
    if (performance.now() - engineReadyAt > GIVE_UP_MS) return true;
    return groups.every((g) => stats[g].done >= stats[g].total);
  },

  percent(groups) {
    let total = 0, done = 0;
    for (const g of groups) { total += stats[g].total; done += Math.min(stats[g].done, stats[g].total); }
    return total ? Math.floor((100 * done) / total) : 0;
  },

  /** Which groups must be in before a level can be played (index 1-4 = story levels, 5 = Unlimited mode). */
  groupsFor(levelIndex) {
    if (levelIndex === 5) return ['core', 'endless'];
    if (levelIndex >= 2 && levelIndex <= 4) return ['core', 'level' + levelIndex];
    return ['core'];
  }
};

// ---- title menu: hold the buttons until their mode's art is in, with a progress bar ----
window.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('titleMainMenu');
  const campaign = document.getElementById('startGameButton');
  const unlimited = document.getElementById('endlessGameButton');
  if (!menu || !campaign || !unlimited) return;

  const box = document.createElement('div');
  box.className = 'preload-status';
  box.setAttribute('role', 'status');
  box.innerHTML = '<div class="preload-label"></div><div class="preload-track"><span></span></div>';
  menu.appendChild(box);
  const label = box.querySelector('.preload-label');
  const bar = box.querySelector('span');

  let videoWarmed = false;
  const tick = () => {
    const coreReady = Preload.ready(['core']);
    const allReady = Preload.ready(['core', 'endless']);
    campaign.disabled = !coreReady;
    if (coreReady && !videoWarmed) {
      // the opening film starts buffering only once the game art is in, so the two do not fight over a slow connection
      videoWarmed = true;
      const film = document.getElementById('introVideo');
      if (film) film.preload = 'auto';
    }
    unlimited.disabled = !allReady;
    if (allReady) {
      box.classList.add('done');
      return true;
    }
    const pct = Preload.percent(coreReady ? ['endless'] : ['core']);
    label.textContent = coreReady ? `Chaos mode loading ${pct}%` : `Loading game art ${pct}%`;
    bar.style.width = `${pct}%`;
    return false;
  };
  tick();
  const timer = setInterval(() => { if (tick()) clearInterval(timer); }, 120);
});
