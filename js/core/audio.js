/**
 * ==========================================================================
 * SOUND EFFECTS (js/core/audio.js)
 * Short WAV effects from assets/audio/sfx, played through the Web Audio API.
 *
 *   Sfx.play('sword_swing')                 plain
 *   Sfx.at('betal_hurt', enemy.x)           placed in the world: quieter and panned the further it is from Rakti
 *
 * Browsers only let audio start after a click or key press, so the context is resumed on the first
 * one. [M] mutes and unmutes. Repeats of one sound inside `gap` seconds are dropped, so a crowd of
 * Betal cannot stack the same swing into a roar.
 * ==========================================================================
 */

const BASE = 'assets/audio/sfx/';

// vol: loudness of the file, jitter: random pitch spread (+/-), gap: seconds before it may play again
const SOUNDS = {
  sword_swing:   { vol: 0.55, jitter: 0.08, gap: 0.06 },
  sword_hit:     { vol: 0.8,  jitter: 0.07, gap: 0.04 },
  trishul_throw: { vol: 0.7,  jitter: 0.04, gap: 0.1 },
  trishul_hit:   { vol: 0.85, jitter: 0.05, gap: 0.04 },
  jump:          { vol: 0.35, jitter: 0.06, gap: 0.12 },
  hurt:          { vol: 0.9,  jitter: 0.03, gap: 0.2 },
  player_death:  { vol: 0.95, jitter: 0,    gap: 1 },
  divine:        { vol: 0.8,  jitter: 0,    gap: 1 },
  mud_cast:      { vol: 0.9,  jitter: 0.03, gap: 0.3 },
  betal_swing:   { vol: 0.5,  jitter: 0.1,  gap: 0.09 },
  betal_hurt:    { vol: 0.55, jitter: 0.12, gap: 0.05 },
  enemy_death:   { vol: 0.65, jitter: 0.12, gap: 0.07 },
  archer_shoot:  { vol: 0.55, jitter: 0.08, gap: 0.1 },
  vine_spin:     { vol: 0.6,  jitter: 0.06, gap: 0.2 },
  vine_cut:      { vol: 0.75, jitter: 0.06, gap: 0.1 },
  kill_pop:      { vol: 0.5,  jitter: 0.04, gap: 0.05 },
  round_start:   { vol: 0.85, jitter: 0,    gap: 1 },
  round_clear:   { vol: 0.85, jitter: 0,    gap: 1 },
  checkpoint:    { vol: 0.7,  jitter: 0,    gap: 1 },
  ui_click:      { vol: 0.7,  jitter: 0.02, gap: 0.05 }
};

const HEARING = 900;   // world px: beyond this a placed sound is almost silent

class SfxPlayer {
  constructor() {
    this.muted = false;
    this.volume = 0.5;
    this.listenerX = 0;
    this.buffers = {};
    this.lastPlayed = {};
    this.ctx = null;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    for (const name of Object.keys(SOUNDS)) {
      fetch(`${BASE}${name}.wav`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then((data) => this.ctx.decodeAudioData(data))
        .then((buffer) => { this.buffers[name] = buffer; })
        .catch(() => { /* a missing file just means that sound stays silent */ });
    }

    const unlock = () => { if (this.ctx.state === 'suspended') this.ctx.resume(); };
    for (const type of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(type, unlock, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.repeat) this.setMuted(!this.muted);
    });
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : this.volume;
  }

  play(name, { volume = 1, rate = 1, pan = 0 } = {}) {
    const ctx = this.ctx, def = SOUNDS[name], buffer = this.buffers[name];
    if (!ctx || !def || !buffer || this.muted) return;
    if (ctx.state === 'suspended') { ctx.resume(); return; }
    const now = ctx.currentTime;
    if (now - (this.lastPlayed[name] ?? -1) < def.gap) return;
    this.lastPlayed[name] = now;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * def.jitter);
    const gain = ctx.createGain();
    gain.gain.value = def.vol * volume;
    let node = src;
    node.connect(gain);
    node = gain;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      node = p;
    }
    node.connect(this.master);
    src.start();
  }

  /** A sound in the world at x: fades and pans with its distance from Rakti. */
  at(name, x, opts = {}) {
    const dx = x - this.listenerX;
    const near = Math.max(0.12, 1 - Math.abs(dx) / HEARING);
    this.play(name, { ...opts, volume: (opts.volume ?? 1) * near, pan: Math.max(-0.8, Math.min(0.8, dx / 700)) });
  }
}

export const Sfx = new SfxPlayer();
