/**
 * ==========================================================================
 * SOUND EFFECTS (js/core/audio.js)
 * Knife and Trishul sounds from assets/audio/sfx, played through the Web Audio API.
 *
 *   Sfx.play('sword_draw')
 *
 * A sound with `variants: n` loads <name>1.wav ... <name>n.wav and plays one at random. With
 * `rotate: true` they play in a shuffled rotation instead: every variant once before any repeats, and
 * the same one never twice in a row.
 * Browsers only let audio start after a click or key press, so the context is resumed on the first
 * one. [M] mutes and unmutes. Repeats of one sound inside `gap` seconds are dropped.
 * ==========================================================================
 */

const BASE = 'assets/audio/sfx/';

// vol: loudness of the file, jitter: random pitch spread (+/-), gap: seconds before it may play again
const SOUNDS = {
  sword_draw:    { vol: 0.6, jitter: 0.03, gap: 0.15 },
  trishul_draw:  { vol: 0.6, jitter: 0.03, gap: 0.15 },
  trishul_throw: { vol: 0.7, jitter: 0.03, gap: 0.1 },
  sword_swing:   { vol: 0.5, jitter: 0.05, gap: 0.06, variants: 2 },
  hit:           { vol: 0.8, jitter: 0,    gap: 0.04, variants: 5, rotate: true },   // a mob is hit
  mob_swing:     { vol: 0.7, jitter: 0,    gap: 0.08, variants: 3, rotate: true },   // a Betal's or the boss's blade lands
  boss_blast:    { vol: 0.75, jitter: 0.03, gap: 0.3 },                              // the boss fires an energy blast
  boss_gong:     { vol: 0.75, jitter: 0,   gap: 2 },                                 // the father leaves his throne and the fight begins
  boss_land:     { vol: 0.8, jitter: 0.03, gap: 0.3 },                               // the father drops to the floor from a height
  boss_slam:     { vol: 0.9, jitter: 0.03, gap: 0.3 },                               // the ground slam that raises the spikes
  rocket_launch: { vol: 0.7, jitter: 0.04, gap: 0.08 },                              // an archer fires a rocket
  rocket_fly:    { vol: 0.4, loop: true }                                            // a rocket is burning its way across
};

const LOOP_FADE = 0.15;   // seconds to fade a held loop in and out
const LOOP_HOLD = 0.12;   // a loop stops when nothing has held it for this long

class SfxPlayer {
  constructor() {
    this.muted = false;
    this.volume = 0.5;
    this.buffers = {};
    this.lastPlayed = {};
    this.rotation = {};
    this.loops = {};
    this.ctx = null;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    for (const [name, def] of Object.entries(SOUNDS)) {
      const files = def.variants ? Array.from({ length: def.variants }, (_, i) => `${name}${i + 1}.wav`) : [`${name}.wav`];
      this.buffers[name] = [];
      files.forEach((file, i) => {
        fetch(BASE + file)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
          .then((data) => this.ctx.decodeAudioData(data))
          .then((buffer) => { this.buffers[name][i] = buffer; })
          .catch(() => { /* a missing file just means that sound stays silent */ });
      });
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

  /**
   * A looping sound kept alive by calling this every frame it should be heard. However many things call it
   * in one frame (ten rockets in the air), only one copy plays; when nobody has called it for a moment
   * (the last rocket landed, a level change, a pause) it fades out and stops by itself.
   */
  hold(name) {
    const ctx = this.ctx, def = SOUNDS[name], buffer = this.buffers[name]?.[0];
    if (!ctx || !def?.loop || !buffer || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    let l = this.loops[name];
    if (l) { l.last = now; return; }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(def.vol, now + LOOP_FADE);
    src.connect(gain);
    gain.connect(this.master);
    src.start();
    l = this.loops[name] = { src, gain, last: now };
    l.timer = setInterval(() => {
      const t = ctx.currentTime;
      if (t - l.last < LOOP_HOLD) return;
      clearInterval(l.timer);
      delete this.loops[name];
      l.gain.gain.cancelScheduledValues(t);
      l.gain.gain.setValueAtTime(l.gain.gain.value, t);
      l.gain.gain.linearRampToValueAtTime(0, t + LOOP_FADE);
      l.src.stop(t + LOOP_FADE + 0.02);
    }, 40);
  }

  /** Shuffled rotation: each variant once per round, and a new round never starts with the one just played. */
  nextInRotation(name, ready) {
    const st = this.rotation[name] ??= { queue: [], last: -1 };
    st.queue = st.queue.filter((i) => ready.includes(i));
    if (!st.queue.length) {
      const q = [...ready];
      for (let i = q.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q[i], q[j]] = [q[j], q[i]];
      }
      if (q.length > 1 && q[0] === st.last) [q[0], q[q.length - 1]] = [q[q.length - 1], q[0]];
      st.queue = q;
    }
    st.last = st.queue.shift();
    return st.last;
  }

  play(name, { volume = 1, rate = 1 } = {}) {
    const ctx = this.ctx, def = SOUNDS[name], pool = this.buffers[name];
    if (!ctx || !def || !pool || this.muted) return;
    const ready = pool.flatMap((b, i) => (b ? [i] : []));
    if (!ready.length) return;
    if (ctx.state === 'suspended') { ctx.resume(); return; }
    const now = ctx.currentTime;
    if (now - (this.lastPlayed[name] ?? -1) < def.gap) return;
    this.lastPlayed[name] = now;

    const src = ctx.createBufferSource();
    src.buffer = pool[def.rotate ? this.nextInRotation(name, ready) : ready[Math.floor(Math.random() * ready.length)]];
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * def.jitter);
    const gain = ctx.createGain();
    gain.gain.value = def.vol * volume;
    src.connect(gain);
    gain.connect(this.master);
    src.start();
  }
}

export const Sfx = new SfxPlayer();
