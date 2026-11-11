/**
 * The campaign run in play and the three save slots.
 *
 * Difficulty (chosen when a slot's game begins, kept for that slot):
 *   normal    the game as designed: a death returns Rakti to her last checkpoint
 *   hard      a death restarts the level from its very start; Betal and archers have double health,
 *             Pitaji 150 HP and quicker attacks, the whole boss 600 HP
 *   hardcore  as hard, and a death ends the run: the slot goes back to Level 1
 * Chaos mode and the test keys play with no slot and always as normal.
 *
 * A slot (localStorage 'rakti.saves', an array of SLOT_COUNT entries or null):
 *   { difficulty, level, prologue, snap, time, deaths, attempts, completed, updated }
 *   snap = the level's own kept progress (level.snapshot()), only in normal: hard and hardcore have no checkpoints.
 */
export const SLOT_COUNT = 3;
export const DIFFICULTIES = ['normal', 'hard', 'hardcore'];
const HARD_ENEMY_HP = 2;        // Betal 10 -> 20, archers 12 -> 24 (Level 4's 24 -> 48)
const KEY = 'rakti.saves';

export const Run = {
  difficulty: 'normal',
  campaign: false,        // true while a story level (1-4) is loaded; the engine sets it in loadLevel
  get mode() { return this.campaign ? this.difficulty : 'normal'; },
  /** Health multiplier for Betal and archers (the boss has its own numbers: see fatherBoss.js). */
  get enemyHp() { return this.mode === 'normal' ? 1 : HARD_ENEMY_HP; },
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
