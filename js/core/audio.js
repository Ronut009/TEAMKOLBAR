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
class MusicPlayer {
  constructor() {
    this.volume = 0.4;
    this.muted = false;
    this.audio = null;
    this.name = null;
    this.fade = null;
    if (typeof window !== 'undefined') {
      // The music is a media element like a YouTube tab: switching to another tab never pauses it. If the browser
      // held it back at load (autoplay blocked), try again whenever the page is shown, focused or restored; some
      // browsers allow it by then (a site the player has used before, or a tab opened by a click).
      const retry = () => this.tryStart();
      document.addEventListener('visibilitychange', retry);
      window.addEventListener('focus', retry);
      window.addEventListener('pageshow', retry);
    }
  }

  /** Starts the wanted track if it is sitting paused because an earlier play() was refused. */
  tryStart() {
    const audio = this.audio;
    if (this.blocked) return;
    if (!audio || !this.name || !audio.paused) return;
    audio.play().then(() => this.showHint(false)).catch(() => {});
  }

  /** Lets the browser treat the page as a media player: it shows in the media controls and stays alive in a background tab. */
  announce(name) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'Rakti: The Last Guardian', artist: name === 'title' ? 'Main Theme' : name });
    navigator.mediaSession.playbackState = 'playing';
  }

  play(name) {
    if (typeof Audio === 'undefined' || this.blocked) return;
    clearInterval(this.fade);
    if (this.name === name && this.audio) { this.audio.volume = this.muted ? 0 : this.volume; return; }   // already playing, or waiting for the first click
    this.stopNow();
    this.name = name;
    const audio = this.audio = new Audio(`${MUSIC_BASE}${name}.mp3`);
    audio.loop = true;
    audio.preload = 'auto';   // fully buffered before the first click, so it starts the instant the browser allows
    audio.volume = this.muted ? 0 : this.volume;
    this.announce(name);
    audio.play().catch(() => { if (this.audio === audio) this.startOnFirstInput(audio); });
  }

  /** The browser refused to start the track (always so right after a page refresh): start it on the first click,
   *  key press or touch. Keeps listening until one of those is accepted, and shows a hint meanwhile. */
  startOnFirstInput(audio) {
    const events = ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchstart', 'touchend'];
    const done = () => { for (const type of events) window.removeEventListener(type, go); this.showHint(false); };
    const go = () => {
      if (this.audio !== audio || !this.name) { done(); return; }   // stopped meanwhile (the game started): never revive it
      audio.play().then(done).catch(() => {});
    };
    for (const type of events) window.addEventListener(type, go, { passive: true });
    this.showHint(true);
  }

  showHint(on) {
    if (typeof document !== 'undefined') document.getElementById('musicHint')?.classList.toggle('show', on);
  }

  /** Fades the track out and rewinds it, so the next play() starts from the beginning again. */
  stop(seconds = 0.8) {
    const audio = this.audio;
    if (!audio) return;
    this.name = null;
    this.showHint(false);
    clearInterval(this.fade);
    const from = audio.volume, t0 = performance.now();
    this.fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      audio.volume = from * (1 - k);
      if (k >= 1) { clearInterval(this.fade); if (this.audio === audio) this.stopNow(); }
    }, 40);
  }

  stopNow() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio = null;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.audio) this.audio.volume = muted ? 0 : this.volume;
  }
}

class SfxPlayer {
  constructor() {
    this.muted = false;
    this.volume = 0.5;
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
