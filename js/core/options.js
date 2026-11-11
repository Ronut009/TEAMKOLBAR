/**
 * The player's game options (Settings > Game): music and effects volume. Remembered in the
 * browser (localStorage 'rakti.options'). Volumes are steps 0..VOL_MAX; VOL_DEFAULT is the game's own mix, so the
 * steps above it are louder than that and the ones below quieter.
 */
export const VOL_MAX = 10, VOL_DEFAULT = 7;
const KEY = 'rakti.options';
const clampVol = (v) => Math.max(0, Math.min(VOL_MAX, Math.round(Number.isFinite(+v) ? +v : VOL_DEFAULT)));

export const Options = {
  music: VOL_DEFAULT,
  sfx: VOL_DEFAULT,

  load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (o.music != null) this.music = clampVol(o.music);
      if (o.sfx != null) this.sfx = clampVol(o.sfx);
    } catch (e) { /* storage blocked or damaged: the defaults stay */ }
    return this;
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify({ music: this.music, sfx: this.sfx })); } catch (e) { /* not remembered */ }
  },
  setVolume(kind, step) { this[kind] = clampVol(step); this.save(); },
  /** A volume step as a multiplier of the game's own mix (VOL_DEFAULT = 1). */
  gain(kind) { return this[kind] / VOL_DEFAULT; }
};
Options.load();
