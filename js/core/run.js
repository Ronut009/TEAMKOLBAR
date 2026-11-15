/**
 * The campaign run in play and the three save slots.
 *
 * Difficulty (chosen when a slot's game begins, kept for that slot):
 *   normal    the game as designed: a death returns Rakti to her last checkpoint
 *   hard      a death restarts the level from its very start; Betal and archers have double health,
 *             Pitaji 150 HP and quicker attacks, the Asura 400 HP and enraged sooner
 *   hardcore  as hard, and a death ends the run: the slot goes back to Level 1
 * Chaos mode and the test keys play with no slot and always as normal.
 *
 * A slot (localStorage 'rakti.saves', an array of SLOT_COUNT entries or null):
 *   { difficulty, level, prologue, snap, time, deaths, attempts, completed, updated }
 *   snap = the level's own kept progress (level.snapshot()), only in normal: hard and hardcore have no checkpoints.
 */
export const SLOT_COUNT = 3;
export const DIFFICULTIES = ['normal', 'hard', 'hardcore'];
const KEY = 'rakti.saves';

export const Run = {
  difficulty: 'normal',
  campaign: false,        // true while a story level (1-4) is loaded; the engine sets it in loadLevel
  get mode() { return this.campaign ? this.difficulty : 'normal'; },
  level: 0,               // the level loaded (the engine sets it in loadLevel)
  /** Betal's health: Levels 1-2 15 (Hard / Hardcore 20), Level 3 20 (30). Outside the story 10 (Chaos sets its own).
   *  (The boss has its own numbers: see fatherBoss.js.) */
  get betalHp() {
    if (!this.campaign) return 10;
    const hard = this.mode !== 'normal';
    return this.level >= 3 ? (hard ? 30 : 20) : (hard ? 20 : 15);
  },
  /** Archers' health, Level 2 and Level 4: 12 (Hard / Hardcore 20). Outside the story 12. */
  get archerHp() { return this.campaign && this.mode !== 'normal' ? 20 : 12; },
  /** Hard and hardcore: a death does not return to a checkpoint. */
  get noCheckpoints() { return this.mode !== 'normal'; },
  /** Hard and hardcore: the stronger boss. */
  get hardBoss() { return this.mode !== 'normal'; }
};

function readAll() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { /* storage blocked or damaged: no saves */ }
  if (!Array.isArray(list)) list = [];
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const s = list[i];
    return s && typeof s === 'object' && DIFFICULTIES.includes(s.difficulty) && s.level >= 1 && s.level <= 4 ? s : null;
  });
}

export const Saves = {
  all() { return readAll(); },
  get(i) { return readAll()[i] || null; },
  /** Returns false when the browser would not store it (private window, storage blocked). */
  write(i, save) {
    const list = readAll();
    list[i] = save ? { ...save, updated: Date.now() } : null;
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  },
  clear(i) { return this.write(i, null); },
  /** A new game in a slot. `attempts` counts hardcore runs begun in it. */
  fresh(difficulty, attempts = 1) {
    return { difficulty, level: 1, prologue: false, snap: null, time: 0, deaths: 0, attempts, completed: false };
  }
};
