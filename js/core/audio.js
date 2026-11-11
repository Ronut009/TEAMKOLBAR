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

import { Options } from './options.js';

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
  vine_out:      { vol: 0.6, jitter: 0.08, gap: 0.12, maxOverlap: 3, overlapGain: [1, 0.7, 0.5] },   // a jungle vine rises from the ground
  vine_in:       { vol: 0.5, jitter: 0.08, gap: 0.12, maxOverlap: 3, overlapGain: [1, 0.7, 0.5] },   // ...and sinks back in
  vine_lash:     { vol: 0.75, jitter: 0.08, gap: 0.1 },                              // ...or whips round at Rakti
  mob_aggro:     { vol: 0.8, jitter: 0.06, gap: 0.12, maxOverlap: 3, overlapGain: [1, 0.6, 0.35] },   // a melee mob locks on
  mob_growl:     { vol: 0.16, loop: true, fade: 0.35, fadeOut: 0.5 },                // ...and growls, quietly, while it chases
  item_aura:     { vol: 0.5, loop: true, fade: 0.4, fadeOut: 0.9 },                                // Rakti is near a relic she needs to go on
  door_open:     { vol: 0.8, jitter: 0.02, gap: 0.5 },                               // a door unlocks and swings open
  portal_open:   { vol: 0.7, jitter: 0, gap: 3 },                                    // the portal behind it starts up
  item_get:      { vol: 0.8, jitter: 0, gap: 1 },                                    // Rakti takes an item she needs to go on
  text_pop:      { vol: 0.6, jitter: 0, gap: 0.05, variants: 3, rotate: true },       // a text box pops up (all three before any repeats)
  jump:          { vol: 0.6, jitter: 0.04, gap: 0.1 },                               // Rakti jumps
  morph:         { vol: 0.7, jitter: 0, gap: 0.8 },                                  // Rakti takes Kali's form
  footsteps:     { vol: 0.42, loop: true, fade: 0.04, fadeOut: 0.1 },                // Rakti runs: sped up to her stride (was 0.55)
  ground_rise:   { vol: 0.7, jitter: 0.05, gap: 0.1, maxOverlap: 3, overlapGain: [1, 0.7, 0.5] },   // something rises out of the ground
  stone_move:    { vol: 0.35, loop: true, fade: 0.3, fadeOut: 0.5 },                 // a stone pier grinds up and down nearby
  stone_shake:   { vol: 0.7, jitter: 0.05, gap: 0.15 },                              // a stone starts to give way
  stone_open:    { vol: 0.8, jitter: 0.04, gap: 0.25 },                              // a jungle stone breaks open into a platform
  stone_close:   { vol: 0.7, jitter: 0.04, gap: 0.25 },                              // it slides shut into a rock again
  boss_gong:     { vol: 0.75, jitter: 0,   gap: 2 },                                 // the father leaves his throne and the fight begins
  boss_land:     { vol: 0.8, jitter: 0.03, gap: 0.3 },                               // the father drops to the floor from a height
  boss_slam:     { vol: 0.9, jitter: 0.03, gap: 0.3 },                               // the ground slam that raises the spikes
  rocket_launch: { vol: 0.7, jitter: 0.04, gap: 0.08 },                              // an archer fires a rocket
  rocket_fly:    { vol: 0.4, loop: true }                                            // a rocket is burning its way across
};

const HEARING = 700;      // world px: beyond this a placed sound is almost silent
const LOOP_FADE = 0.15;   // seconds to fade a held loop in and out
const LOOP_HOLD = 0.12;   // a loop stops when nothing has held it for this long

const MUSIC_BASE = 'assets/audio/music/';

/**
 * Background music (one track at a time, looped). Browsers refuse to start sound before the player has
 * clicked or pressed a key, so if the first try is blocked the track starts on the first click or key press.
 */
// Music tracks (assets/audio/music, loudness-matched to -16 LUFS by tools/music_prep): vol = element volume.
// The level themes sit low under the sound effects. loop: false plays once (Level 4's arrival).
// (level tracks raised ~45% on request; the old values are in js/levels/backup/audio_before_louder_levels.js)
const TRACKS = {
  title:        { vol: 0.42, loop: true,  label: 'Main Theme' },
  level1:       { vol: 0.19, loop: true,  label: 'Drowned Dwaraka' },
  level2:       { vol: 0.19, loop: true,  label: 'Surya Mandir' },
  level3:       { vol: 0.19, loop: true,  label: 'Vrindavan' },
  level4_start: { vol: 0.23, loop: false, label: 'Indraprastha' },
  pitaji_fight: { vol: 0.22, loop: true,  label: 'Pitaji' },
  demon_fight:  { vol: 0.22, loop: true,  label: 'The Asura' },
  reunited:     { vol: 0.19, loop: false, label: 'Reunited' },
  sands:        { vol: 0.27, loop: false, label: 'The Sands of Time' }
};
const MUSIC_FADE = 0.8;   // s for a track to fade in or out

/**
 * Two layers of music. The base layer is the start menu's or the level's theme; the overlay (the Sands of Time)
 * fades the base out and pauses it while it plays, and the base resumes where it left off afterwards.
 * The engine decides every frame what should play (setBase / setOverlay); a track already playing just continues.
 */
class MusicPlayer {
  constructor() {
    this.muted = false;
    this.userVol = Options.gain('music');   // Settings > Game > Music
    this.duck = 1;          // the pause menu turns everything down a little
    this.base = null;
    this.overlay = null;
    this.dying = [];
    if (typeof window !== 'undefined') {
      // The music is a media element like a YouTube tab: switching to another tab never pauses it. If the browser
      // held it back at load (autoplay blocked), try again whenever the page is shown, focused or restored.
      const retry = () => this.tryStart();
      document.addEventListener('visibilitychange', retry);
      window.addEventListener('focus', retry);
      window.addEventListener('pageshow', retry);
      this.last = performance.now();
      setInterval(() => this.tick(), 40);
    }
  }

  /** The base track's name (null when silent). */
  get name() { return this.base?.name ?? null; }

  // older callers: play(name) / stop() act on the base layer
  play(name) { this.setBase(name); }
  stop(seconds = MUSIC_FADE) { this.setBase(null, seconds); }

  setBase(name, fade = MUSIC_FADE) {
    if ((this.base?.name ?? null) === (name ?? null)) return;
    if (this.base) this.retire(this.base, fade);
    this.base = name ? this.make(name) : null;
  }

  setOverlay(name, fade = MUSIC_FADE) {
    if ((this.overlay?.name ?? null) === (name ?? null)) return;
    if (this.overlay) this.retire(this.overlay, fade);
    this.overlay = name ? this.make(name) : null;
  }

  make(name) {
    if (typeof Audio === 'undefined') return null;
    const def = TRACKS[name] || { vol: 0.3, loop: true, label: name };
    const audio = new Audio(`${MUSIC_BASE}${name}.mp3`);
    audio.loop = def.loop;
    audio.preload = 'auto';
    audio.volume = 0;
    const L = { name, def, audio, level: 0, ended: false, blocked: false, held: false };
    audio.addEventListener('ended', () => { L.ended = true; });
    this.announce(def.label);
    this.start(L);
    return L;
  }

  start(L) {
    L.audio.play().then(() => { L.blocked = false; this.showHint(false); }).catch(() => {
      if (this.base !== L && this.overlay !== L) return;
      L.blocked = true;
      this.startOnFirstInput(L);
    });
  }

  retire(L, fade) {
    if (!L) return;
    L.fade = Math.max(0.05, fade);
    this.dying.push(L);
  }

  /** Volumes glide toward their targets; the base pauses (keeping its place) under the overlay and resumes after. */
  tick() {
    const now = performance.now(), dt = Math.min(0.2, (now - this.last) / 1000);
    this.last = now;
    const step = dt / MUSIC_FADE;
    for (const L of [this.base, this.overlay]) {
      if (!L) continue;
      const under = L === this.base && this.overlay && !this.overlay.ended;
      const target = this.muted ? 0 : Math.min(1, L.def.vol * this.userVol) * this.duck * (under ? 0 : 1);
      L.level = L.level < target ? Math.min(target, L.level + step * L.def.vol) : Math.max(target, L.level - step * L.def.vol);
      L.audio.volume = Math.max(0, Math.min(1, L.level));
      if (under && L.level <= 0.001 && !L.audio.paused) { L.audio.pause(); L.held = true; }
      if (!under && L.held && !L.ended) { L.held = false; this.start(L); }
    }
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const L = this.dying[i];
      L.level = Math.max(0, L.level - (dt / L.fade) * Math.max(0.05, L.def.vol));
      L.audio.volume = Math.max(0, Math.min(1, L.level));
      if (L.level <= 0) { L.audio.pause(); this.dying.splice(i, 1); }
    }
  }

  /** Starts a wanted track that is sitting paused because the browser refused it. */
  tryStart() {
    for (const L of [this.base, this.overlay]) if (L && L.blocked && !L.held) this.start(L);
  }

  /** Lets the browser treat the page as a media player: it shows in the media controls and stays alive in a background tab. */
  announce(label) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'Rakti: The Last Guardian', artist: label });
    navigator.mediaSession.playbackState = 'playing';
  }

  /** The browser refused to start the track (always so right after a page refresh): start it on the first click,
   *  key press or touch. Keeps listening until one of those is accepted, and shows a hint on the start menu. */
  startOnFirstInput(L) {
    const events = ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchstart', 'touchend'];
    const done = () => { for (const type of events) window.removeEventListener(type, go); this.showHint(false); };
    const go = () => {
      if (this.base !== L && this.overlay !== L) { done(); return; }   // no longer wanted: never revive it
      L.audio.play().then(() => { L.blocked = false; done(); }).catch(() => {});
    };
    for (const type of events) window.addEventListener(type, go, { passive: true });
    if (L.name === 'title') this.showHint(true);
  }

  showHint(on) {
    if (typeof document !== 'undefined') document.getElementById('musicHint')?.classList.toggle('show', on);
  }

  setDuck(k) { this.duck = k; }

  /** Settings: the music volume as a multiplier of the game's own mix. */
  setUserVolume(k) { this.userVol = Math.max(0, k); }

  setMuted(muted) { this.muted = muted; }
}

class SfxPlayer {
  constructor() {
    this.muted = false;
    this.baseVolume = 0.5;                              // the game's own mix
    this.volume = this.baseVolume * Options.gain('sfx');   // Settings > Game > Effects
    this.buffers = {};
    this.lastPlayed = {};
    this.rotation = {};
    this.loops = {};
    this.playing = {};
    this.listenerX = 0;   // where Rakti is: placed sounds fade and pan with their distance from her
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

  /** Settings: the effects volume as a multiplier of the game's own mix. */
  setUserVolume(k) {
    this.volume = this.baseVolume * Math.max(0, k);
    if (this.master && !this.muted) this.master.gain.value = this.volume;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : this.volume;
    Music.setMuted(muted);
  }

  /**
   * A looping sound kept alive by calling this every frame it should be heard. However many things call it
   * in one frame (ten rockets in the air), only one copy plays; when nobody has called it for a moment
   * (the last rocket landed, a level change, a pause) it fades out and stops by itself. `level` (0..1) is how
   * loud it should be right now, so a sound can swell as the player gets closer to its source.
   */
  hold(name, level = 1, rate = 1) {
    const ctx = this.ctx, def = SOUNDS[name], buffer = this.buffers[name]?.[0];
    if (!ctx || !def?.loop || !buffer || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    let l = this.loops[name];
    if (l) {   // several things may hold it in one frame: the loudest one sets the level
      l.src.playbackRate.value = rate;
      l.level = now === l.stamp ? Math.max(l.level, level) : level;
      l.stamp = now;
      l.last = now;
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.setTargetAtTime(def.vol * level, now, def.fade ?? LOOP_FADE / 3);
    src.connect(gain);
    gain.connect(this.master);
    src.start();
    l = this.loops[name] = { src, gain, last: now, level };
    l.timer = setInterval(() => {
      const t = ctx.currentTime;
      if (t - l.last < LOOP_HOLD) { l.gain.gain.setTargetAtTime(def.vol * l.level, t, def.fade ?? LOOP_FADE / 3); return; }
      clearInterval(l.timer);
      delete this.loops[name];
      l.gain.gain.cancelScheduledValues(t);
      l.gain.gain.setValueAtTime(l.gain.gain.value, t);
      const out = def.fadeOut ?? LOOP_FADE;
      l.gain.gain.linearRampToValueAtTime(0, t + out);
      l.src.stop(t + out + 0.02);
    }, 40);
  }

  /** A sound in the world at x: quieter and panned the further it is from Rakti. With `range` the sound is only
   *  heard up close: silent beyond `range` world px and falling off steeply inside it. */
  at(name, x, opts = {}) {
    const dx = x - this.listenerX;
    if (opts.range) {
      const k = 1 - Math.abs(dx) / opts.range;
      if (k <= 0) return;
      this.play(name, { ...opts, volume: (opts.volume ?? 1) * k * k, pan: Math.max(-0.8, Math.min(0.8, dx / 300)) });
      return;
    }
    const near = Math.max(0.12, 1 - Math.abs(dx) / HEARING);
    this.play(name, { ...opts, volume: (opts.volume ?? 1) * near, pan: Math.max(-0.8, Math.min(0.8, dx / 700)) });
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

  play(name, { volume = 1, rate = 1, pan = 0 } = {}) {
    const ctx = this.ctx, def = SOUNDS[name], pool = this.buffers[name];
    if (!ctx || !def || !pool || this.muted) return;
    const ready = pool.flatMap((b, i) => (b ? [i] : []));
    if (!ready.length) return;
    if (ctx.state === 'suspended') { ctx.resume(); return; }
    const now = ctx.currentTime;
    if (now - (this.lastPlayed[name] ?? -1) < def.gap) return;
    // maxOverlap: how many copies may sound at once (extra calls are skipped); overlapGain: each overlapping
    // copy is quieter than the one before, so a pack all noticing Rakti does not stack into a roar
    const playing = this.playing[name] ?? 0;
    if (def.maxOverlap && playing >= def.maxOverlap) return;
    this.lastPlayed[name] = now;

    const src = ctx.createBufferSource();
    src.buffer = pool[def.rotate ? this.nextInRotation(name, ready) : ready[Math.floor(Math.random() * ready.length)]];
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * def.jitter);
    const gain = ctx.createGain();
    gain.gain.value = def.vol * volume * (def.overlapGain?.[playing] ?? 1);
    let node = gain;
    src.connect(gain);
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      gain.connect(p);
      node = p;
    }
    node.connect(this.master);
    this.playing[name] = playing + 1;
    src.onended = () => { this.playing[name] = Math.max(0, (this.playing[name] ?? 1) - 1); };
    src.start();
  }
}

export const Music = new MusicPlayer();
export const Sfx = new SfxPlayer();
