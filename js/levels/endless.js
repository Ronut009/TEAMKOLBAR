/**
 * ==========================================================================
 * UNLIMITED MODE: THE SIEGE WALL (js/levels/endless.js)
 * One arena, endless rounds. Rounds 0-3 send 2, 3, 4 and 5 mobs, then every round adds 5 more (10, 15, 20 ...).
 * The next round only starts once the last mob of the current one is dead.
 *
 * The backdrop follows the crowd. With the round's whole horde on the field the wall stands under a
 * blood-red sky; as the horde thins to 40% the sky calms and the vines green again (the two walls blend).
 *
 * Mobs: Betal, fast Runners (round 1+), huge slow Brutes (round 2+) on the floor, and archers on top of the
 * castle wall (only the Trishul reaches them). Every 3 rounds all mob health grows by another 15%.
 *
 * [Q] Kali's mud: the floor around Rakti sinks into a mud patch. Only enemies standing in it are slowed.
 * Rakti keeps every weapon: talwar, Trishul and Kali's form [X].
 *
 * Art (assets/endless): floor_grass.png (base tile), mud_sheet.png (3 x 4 morph frames: grass -> mud -> grass),
 * sky_0.jpg / sky_1.jpg (calm and blood sky, no wall in them) and castle_wall.png (the wall, its own layer).
 * ==========================================================================
 */

import { PlatformArt } from '../render/platformArt.js';
import { Betal } from '../entities/betal.js';
import { EnemySpriteSheet } from '../entities/enemySprites.js';
import { Archer } from '../entities/archer.js';

// The backdrops are 1672 x 941 (16:9) drawn at 0.6x, so a 16:9 window sees the whole arena at once.
const SKY_COUNT = 2;               // calm sky, blood sky: blended by how full the crowd is
const WORLD_W = 1003;
const WORLD_H = 565;
const FLOOR_Y = 515;           // the wall's ground strip starts just above this line

// Rounds 0-3 send 2, 3, 4 and 5 mobs; from round 4 on every round adds 5 more (10, 15, 20 ...)
const OPENING_ROUNDS = [2, 3, 4, 5];
const PER_ROUND = 5;
const ROUND_BREAK = 3;           // seconds between rounds
const HIGH_AT = 1;               // full crowd = blood sky
const CALM_AT = 0.4;             // 40% of the crowd or fewer = calm sky
const SKY_SPEED = 0.4;           // sky blend per second (the full change takes ~2.5 s)

// Mud patch (assets/endless/mud_sheet.png: 3 columns x 4 rows of 650 x 150, frames 0 grass .. 6 mud .. 11 grass)
// v2 (the jungle-stone slab, cut by assets/endless/source/build_v2.py): 3 x 4 cells of 650 x 180; v1 is in assets/endless/backup
const MUD = { src: 'assets/endless/mud_sheet.png', cw: 650, ch: 180, cols: 3, surface: 98, scale: 0.5, halfW: 145 };
const MUD_FORM = 1.2, MUD_HOLD = 5.5, MUD_FADE = 1.4;
const MUD_LIFE = MUD_FORM + MUD_HOLD + MUD_FADE;
const MUD_SLOW = 0.3;
const MUD_COOLDOWN = 6;

const BEST_KEY = 'raktiUnlimitedBest';
const BEST_SCORE_KEY = 'raktiUnlimitedBestScore';

// Score: points per kill by type, a bonus for every cleared round (doubled if she took no damage that round),
// and DAMAGE_PENALTY points lost for every point of health she loses.
const POINTS = { betal: 100, runner: 150, archer: 250, brute: 400 };
const CLEAR_BONUS = 100;          // + CLEAR_BONUS_STEP per round number
const CLEAR_BONUS_STEP = 50;
const DAMAGE_PENALTY = 5;

// Mob health grows by HP_STEP every HP_EVERY rounds (compounding)
const HP_STEP = 0.15;
const HP_EVERY = 3;

// Floor mobs: hp is at round 0; speed multiplies the round's base chase speed; height is the drawn size
const KINDS = {
  betal: { hp: 10, speed: 1.0, damage: 4, height: 82, range: 46, tint: null },
  runner: { hp: 6, speed: 1.75, damage: 3, height: 72, range: 42, tint: 'hue-rotate(95deg) saturate(1.7)' },
  brute: { hp: 28, speed: 0.6, damage: 7, height: 108, range: 56, tint: 'sepia(0.55) hue-rotate(-25deg) saturate(2.2) brightness(0.8)' }
};

// The castle wall (assets/endless/castle_wall.png, 2000 x 715) is its own layer, its foot on the floor line.
// v2: the sun fortress (2000 x 704, cropped to the art); v1 is in assets/endless/backup
const WALL = { src: 'assets/endless/castle_wall.png', w: 2000, h: 704, scale: 0.5, footDrop: 6 };
WALL.x = (WORLD_W - WALL.w * WALL.scale) / 2;
WALL.y = FLOOR_Y + WALL.footDrop - WALL.h * WALL.scale;
const wallPoint = (sx, sy) => ({ x: WALL.x + sx * WALL.scale, y: WALL.y + sy * WALL.scale });
// Archers stand on top of the wall (points on the art's parapet / ruin / tower tops), drawn BEHIND the wall so the
// stones hide their legs: the wall top meets his waist. They fill the slots in this order.
// v2 fortress: the four battlement gaps (their walkway, source row 286), the ruin's top and the low stretch of wall
// between the third and fourth gaps, measured on the 2086 px source and fitted to the 2000 px wall (WK). (The round
// tower's top, source 1880 x 104, sits under the Chaos mode panel in the top right corner, so it is not used.)
const WK = 2000 / 2086;
const ARCHER_SLOTS = [
  wallPoint(805 * WK, 286 * WK), wallPoint(1205 * WK, 286 * WK), wallPoint(500 * WK, 286 * WK),
  wallPoint(1540 * WK, 286 * WK), wallPoint(225 * WK, 114 * WK), wallPoint(1370 * WK, 331 * WK)
];
const ARCHER_FOOT_DROP = 24;     // feet sink this far below the wall top: the wall top meets his waist
const ARCHER_ART = {
  frameW: 156, frameH: 130, anchorX: 79, anchorY: 128.5, scale: 0.5, handX: 14, handY: -33, barY: -70, height: 58,
  arrowW: 34, arrowH: 7, center: [16, -38.5], upCenter: [9.5, -43], upAngle: -0.73
};

const rand = (a, b) => a + Math.random() * (b - a);
const img = (src) => { const i = new Image(); i.src = src; return i; };
const ready = (i) => i && i.complete && i.naturalWidth > 0;

/** A Betal with its own size, tint and stats (Runner, Brute). */
class Mob extends Betal {
  constructor(kind, x, minX, maxX, y) {
    super(x, minX, maxX, y);
    this.kind = kind;
    this.drawHeight = KINDS[kind].height;
    this.tint = KINDS[kind].tint;
  }

  render(ctx, sprites) {
    if (this.removed || this.hidden) return;
    ctx.save();
    if (this.tint) ctx.filter = this.tint;
    sprites.render(ctx, this, { height: this.drawHeight });
    ctx.restore();
    if (this.dead || this.hp >= this.maxHp) return;
    const w = 34, x = Math.round(this.x - w / 2), y = Math.round(this.y - this.drawHeight * 0.98);
    ctx.save();
    ctx.fillStyle = 'rgba(10, 8, 14, 0.85)';
    ctx.fillRect(x - 1, y - 1, w + 2, 5);
    ctx.fillStyle = this.hitFlash > 0 ? '#fff1bd' : '#b54b55';
    ctx.fillRect(x, y, w * Math.max(0, this.hp / this.maxHp), 3);
    ctx.restore();
  }
}

export class EndlessLevel {
  constructor() {
    this.levelIndex = 5;
    this.mouseAimTrishul = true;     // the Trishul flies to the cursor (an enemy under it is aimed at directly)
    // the Trishul's reach is the same as in the story levels (TRISHUL.range); it used to be 700 here
    this.minX = 0;
    this.width = WORLD_W;
    this.height = WORLD_H;
    this.deathY = 700;
    this.pitDamage = 3;
    this.ladders = [];

    this.skies = Array.from({ length: SKY_COUNT }, (_, i) => img(`assets/endless/sky_${i}.jpg`));
    this.wallImg = img(WALL.src);
    this.mudImg = img(MUD.src);
    const A = 'assets/level2/archer/';
    const frames = (name, n) => Array.from({ length: n }, (_, i) => img(`${A}${name}_${i}.png`));
    const aim = frames('aim', 6), aimUp = frames('aimup', 6), hurt = frames('hurt', 2), die = frames('die', 3);
    this.archerSprites = {
      idle: aim[0],
      idleFrames: [aim[0], aim[0], aim[5], aim[5], aim[0], aim[5]],
      aimFrames: aim,
      aimUpFrames: aimUp,
      hurtFrames: [hurt[0], hurt[1], hurt[1], hurt[0]],
      dieFrames: [die[0], die[1], die[2], die[2]],
      defeated: die[2],
      arrow: img('assets/anims/archer_arrow.png')
    };
    this.platformArt = new PlatformArt('grass');
    this.enemySprites = new EnemySpriteSheet();
    this.artCache = new Map();
    this.artScale = 0;

    let best = 0;
    try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { /* storage blocked */ }
    this.best = best;
    let bestScore = 0;
    try { bestScore = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0; } catch (e) { /* storage blocked */ }
    this.bestScore = bestScore;
    this.lastRun = null;

    this.killToastText = '';
    this.killToastTimer = 0;
    this.cameraShake = 0;
    this.pendingDialogue = null;
    this.screenFade = 0;
    this.isCompleted = false;
    this.reset();
  }

  // ======================================================================== state
  reset() {
    if (this.round > 0 || this.kills > 0 || this.killTotal > 0) this.finishRun();
    this.round = 0;
    this.points = 0;
    this.killTotal = 0;
    this.killsByKind = { betal: 0, runner: 0, brute: 0, archer: 0 };
    this.damageTaken = 0;
    this.roundDamage = 0;
    this.prevHp = null;
    this.popups = [];
    this.lastRunShown = false;
    this.betals = [];
    this.archers = [];
    this.queue = [];
    this.usedSlots = 0;
    this.spawned = 0;
    this.kills = 0;
    this.spawnTimer = 0;
    this.spawnGap = 0.4;
    this.phase = 'break';
    this.breakTimer = 2.4;
    this.introShown = false;
    this.skyPos = 0;
    this.patches = [];
    this.mudCooldown = 0;
    this.fx = [];
    this.animTime = 0;
    this.cameraShake = 0;
    this.killToastTimer = 0;
    this.player = null;
  }

  getRespawnPoint() {
    return { x: WORLD_W / 2, y: FLOOR_Y };
  }

  playerHasTrishul() { return true; }
  getNearbyInteractable() { return null; }
  checkLevelComplete() { return false; }

  /** Points from kills and cleared rounds, minus a penalty for the damage Rakti took. */
  get score() { return Math.max(0, this.points - this.damageTaken * DAMAGE_PENALTY); }

  /** Called when a run ends (death, [R], leaving): remembers it and keeps the best score. */
  finishRun() {
    this.lastRun = { score: this.score, kills: this.killTotal, damage: this.damageTaken, round: this.round };
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try { localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore)); } catch (e) { /* storage blocked */ }
    }
  }

  get roundSize() {
    const r = this.round, n = OPENING_ROUNDS.length;
    return r < n ? OPENING_ROUNDS[r] : OPENING_ROUNDS[n - 1] + PER_ROUND * (r - n + 1);
  }
  get aliveCount() {
    return this.betals.reduce((n, b) => n + (b.dead ? 0 : 1), 0) + this.archers.reduce((n, a) => n + (a.alive ? 1 : 0), 0);
  }

  /** Every HP_EVERY rounds all mobs get another HP_STEP more health. */
  get hpMult() { return Math.pow(1 + HP_STEP, Math.floor(this.round / HP_EVERY)); }

  /** Text for the on-screen counter (the engine copies it into #endlessHud). */
  get hudText() {
    const left = this.phase === 'break' ? this.roundSize : this.roundSize - this.kills;
    const mud = this.mudCooldown > 0 ? `${Math.ceil(this.mudCooldown)}s` : 'READY';
    const hp = Math.round((this.hpMult - 1) * 100);
    return [
      `ROUND ${this.round}`,
      `MOBS LEFT ${Math.max(0, left)} / ${this.roundSize}`,
      hp ? `MOB HP +${hp}%` : null,
      `SCORE ${this.score}`,
      `KILLS ${this.killTotal}`,
      `DAMAGE TAKEN ${this.damageTaken}`,
      `MUD [Q] ${mud}`,
      `BEST ${this.bestScore}`
    ].filter(Boolean).join('\n');
  }

  /** The same numbers, structured for the framed counter panel. */
  get hudData() {
    const left = this.phase === 'break' ? this.roundSize : this.roundSize - this.kills;
    return {
      round: this.round, left: Math.max(0, left), size: this.roundSize, hpBonus: Math.round((this.hpMult - 1) * 100),
      score: this.score, kills: this.killTotal, damage: this.damageTaken, best: this.bestScore,
      mudReady: !(this.mudCooldown > 0), mudIn: Math.ceil(this.mudCooldown || 0), resting: this.phase === 'break'
    };
  }

  toast(text, time = 1.8) {
    this.killToastText = text;
    this.killToastTimer = time;
  }

  registerKill(enemy) {
    const isArcher = this.archers.includes(enemy);
    if (!isArcher && !this.betals.includes(enemy)) return;
    this.kills++;
    const kind = isArcher ? 'archer' : (enemy.kind || 'betal');
    this.killTotal++;
    this.killsByKind[kind]++;
    this.points += POINTS[kind];
    this.popups.push({ x: enemy.x, y: enemy.y - (isArcher ? 60 : 80), text: `+${POINTS[kind]}`, t: 0 });
  }

  /** Arrows break on the floor. */
  isSolidPoint(x, y) {
    return y >= FLOOR_Y;
  }

  /** Everything the Trishul can hit: the floor mobs and the archers on the wall. */
  getDamageables() {
    return [...this.betals.filter((b) => !b.dead && !b.hidden),
      ...this.archers.filter((a) => a.alive && a.appear >= 1)];
  }

  // ======================================================================== geometry
  getPlatforms() {
    return [{ id: 'floor', x1: -200, x2: WORLD_W + 200, y: FLOOR_Y, oneWay: false }];
  }

  checkPlatformLanding(prevY, currY, x) {
    if (prevY <= FLOOR_Y + 6 && currY >= FLOOR_Y - 2) return this.getPlatforms()[0];
    return null;
  }

  isOnPlatform(x, y) {
    return Math.abs(y - FLOOR_Y) <= 4 ? this.getPlatforms()[0] : null;
  }

  resolvePitWallCollision(x) {
    return Math.max(12, Math.min(WORLD_W - 12, x));
  }

  // ======================================================================== [Q] mud
  castQ(player) {
    if (!player || player.isDead || !player.hasPearl) return;
    if (!player.isGrounded || player.isCasting || player.isClimbing) return;
    if (this.mudCooldown > 0) {
      this.toast(`✧ THE EARTH IS RESTING: ${Math.ceil(this.mudCooldown)}s ✧`, 1);
      return;
    }
    const dir = player.facing === 'left' ? -1 : 1;
    const cx = Math.max(MUD.halfW, Math.min(WORLD_W - MUD.halfW, player.x + dir * 110));
    player.startCast(() => this.spawnMud(cx), cx);
  }

  spawnMud(cx) {
    this.patches.push({ cx, t: 0 });
    this.mudCooldown = MUD_COOLDOWN;
    this.cameraShake = Math.max(this.cameraShake, 0.2);
    this.dust(cx, 24, ['#6a3a18', '#8a5426', '#4a2810']);
    this.toast('✦ KALI\'S MUD ✦', 1.2);
  }

  /** The patch's slowing grip lasts from the moment the mud shows until it starts to dry. */
  patchActive(p) {
    return p.t >= 0.5 && p.t < MUD_FORM + MUD_HOLD + MUD_FADE * 0.5;
  }

  inMud(x) {
    return this.patches.some((p) => this.patchActive(p) && Math.abs(x - p.cx) < MUD.halfW);
  }

  dust(x, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 80;
      this.fx.push({ x: x + rand(-60, 60), y: FLOOR_Y - 4, vx: Math.cos(a) * sp, vy: -Math.abs(Math.sin(a)) * sp - 20, life: 0.5 + Math.random() * 0.5, maxLife: 1, c: colors[i % colors.length] });
    }
  }

  // ======================================================================== rounds
  startRound() {
    this.phase = 'spawn';
    this.spawned = 0;
    this.kills = 0;
    this.spawnTimer = 0;
    const n = this.roundSize, r = this.round;
    const archers = r === 0 ? 1 : Math.min(ARCHER_SLOTS.length, 1 + (r >> 1));
    const runners = r >= 1 ? Math.floor(n * 0.2) : 0;
    const brutes = r >= 2 ? Math.floor(n * 0.1) : 0;
    const kinds = [
      ...Array(archers).fill('archer'), ...Array(runners).fill('runner'), ...Array(brutes).fill('brute'),
      ...Array(Math.max(0, n - archers - runners - brutes)).fill('betal')
    ];
    for (let i = kinds.length - 1; i > 0; i--) {   // shuffle
      const j = Math.floor(Math.random() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    this.queue = kinds;
    this.usedSlots = 0;
    const spread = Math.min(7, 2.5 + n * 0.06);   // the whole round walks in over a few seconds
    this.spawnGap = spread / n;
    this.toast(`⚔ ROUND ${r}: ${n} MOBS ⚔`, 2.4);
  }

  spawnNext() {
    const kind = this.queue.pop();
    if (kind === 'archer') this.spawnArcher();
    else this.spawnMob(kind);
    this.spawned++;
  }

  spawnMob(kind) {
    const K = KINDS[kind];
    const left = Math.random() < 0.5;
    const b = new Mob(kind, left ? 28 : WORLD_W - 28, 12, WORLD_W - 12, FLOOR_Y);
    b.maxHp = b.hp = Math.round(K.hp * this.hpMult);
    b.damage = K.damage;
    b.attackRange = K.range;
    b.noticeRange = 4000;                        // the horde always hunts her
    b.chaseSpeed = (64 + Math.min(this.round * 3, 46)) * K.speed * rand(0.9, 1.15);
    b.patrolSpeed = 46;
    if (kind === 'brute') { b.attackAnimDuration = 0.9; b.attackHitAt = 0.5; }
    b.attackCooldown = rand(0.4, 1.4);
    b.fadeAlpha = 0;
    b.facing = left ? 'right' : 'left';
    this.betals.push(b);
  }

  spawnArcher() {
    const slot = ARCHER_SLOTS[this.usedSlots++ % ARCHER_SLOTS.length];
    const a = new Archer(slot.x, slot.y + ARCHER_FOOT_DROP, `wall_${this.usedSlots}`, ARCHER_ART);
    a.maxHp = a.hp = Math.round(12 * this.hpMult);
    a.shootCooldown = Math.max(1.9, 3.3 - this.round * 0.07);
    a.cooldownTimer = rand(1.2, 2.6);
    a.appear = 0;
    a.dormant = true;
    this.archers.push(a);
    this.burstAt(slot.x, slot.y - 30, 14, ['#ff6a4a', '#ffd27a', '#3a2a20']);
  }

  burstAt(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 70;
      this.fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.5, maxLife: 0.5, c: colors[i % colors.length] });
    }
  }

  // ======================================================================== update
  update(playerX, playerY, dt, isDivine = false, player = null) {
    this.player = player;
    this.animTime += dt;
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2.0);
    if (this.killToastTimer > 0) this.killToastTimer -= dt;
    this.mudCooldown = Math.max(0, this.mudCooldown - dt);

    // damage taken (health that goes back up, e.g. the heal after a round, is not counted)
    if (player && !player.isDead) {
      if (this.prevHp !== null && player.hp < this.prevHp) {
        this.damageTaken += this.prevHp - player.hp;
        this.roundDamage += this.prevHp - player.hp;
      }
      this.prevHp = player.hp;
    }
    if (!this.lastRunShown && this.lastRun) {
      this.lastRunShown = true;
      this.toast(`LAST RUN: ${this.lastRun.score} PTS · ${this.lastRun.kills} KILLS · ROUND ${this.lastRun.round}`, 3.2);
    }
    for (const q of this.popups) q.t += dt;
    this.popups = this.popups.filter((q) => q.t < 1);

    // rounds
    if (this.phase === 'break') {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) this.startRound();
    } else if (this.phase === 'spawn') {
      this.spawnTimer -= dt;
      while (this.spawnTimer <= 0 && this.spawned < this.roundSize) {
        this.spawnNext();
        this.spawnTimer += this.spawnGap;
      }
      if (this.spawned >= this.roundSize) this.phase = 'fight';
    }
    if (this.phase === 'fight' && this.aliveCount === 0) {
      this.phase = 'break';
      this.breakTimer = ROUND_BREAK;
      if (this.round >= this.best) {
        this.best = this.round;
        try { localStorage.setItem(BEST_KEY, String(this.best)); } catch (e) { /* storage blocked */ }
      }
      const bonus = (CLEAR_BONUS + CLEAR_BONUS_STEP * this.round) * (this.roundDamage === 0 ? 2 : 1);
      this.points += bonus;
      this.toast(`✦ ROUND ${this.round} CLEARED  +${bonus}${this.roundDamage === 0 ? ' · FLAWLESS' : ''} ✦`, 2.6);
      this.roundDamage = 0;
      this.round++;
      this.cameraShake = Math.max(this.cameraShake, 0.3);
      if (player && !player.isDead) {
        player.hp = Math.min(player.maxHp, player.hp + Math.ceil(player.maxHp * 0.2));
        this.prevHp = player.hp;
      }
    }

    // Betal (the ones standing in mud move and strike at 30% speed)
    for (const b of this.betals) b.update(dt * (this.inMud(b.x) ? MUD_SLOW : 1), player, this, true);
    this.separate();
    this.betals = this.betals.filter((b) => !b.removed);

    // Archers on the wall (arrows are their own; the Trishul is the only answer)
    for (const a of this.archers) {
      if (a.appear < 1) a.appear = Math.min(1, a.appear + dt * 2);
      a.dormant = a.appear < 1;
      a.update(dt, player, this);
    }
    this.archers = this.archers.filter((a) => !a.canBeRemoved || a.arrows.length);

    // mud patches and dust
    for (const p of this.patches) p.t += dt;
    this.patches = this.patches.filter((p) => p.t < MUD_LIFE);
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const q = this.fx[i];
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt;
      if (q.life <= 0) this.fx.splice(i, 1);
    }

    // The sky follows how full the round's crowd is: 100% = blood sky, 40% and under = calm
    const frac = this.roundSize > 0 ? this.aliveCount / this.roundSize : 0;
    const target = Math.max(0, Math.min(1, (frac - CALM_AT) / (HIGH_AT - CALM_AT))) * (SKY_COUNT - 1);
    const step = SKY_SPEED * dt;
    this.skyPos += Math.max(-step, Math.min(step, target - this.skyPos));
  }

  /** Betal do not stack into one body: close ones ease apart. */
  separate() {
    const list = this.betals.filter((b) => !b.dead && !b.hidden).sort((a, b) => a.x - b.x);
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      const gap = b.x - a.x;
      if (gap < 30 && !a.isAttacking && !b.isAttacking) {
        const push = (30 - gap) * 0.2 + (gap === 0 ? 0.3 : 0);
        a.x = a.clampX(a.x - push);
        b.x = b.clampX(b.x + push);
      }
    }
  }

  // ======================================================================== rendering
  updateArtScale(ctx) {
    const a = ctx.getTransform().a || 1;
    const k = Math.max(1, Math.min(4, Math.ceil(a * 4) / 4));
    if (k !== this.artScale) { this.artScale = k; this.artCache.clear(); }
  }

  cachedArt(key, w, h, isReady, paint) {
    let c = this.artCache.get(key);
    if (c) return c;
    if (!isReady) return null;
    const k = this.artScale || 1;
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * k));
    c.height = Math.max(1, Math.ceil(h * k));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.scale(c.width / w, c.height / h);
    paint(g);
    this.artCache.set(key, c);
    return c;
  }

  renderBackground(ctx) {
    this.updateArtScale(ctx);
    ctx.save();
    ctx.fillStyle = '#2a1408';
    ctx.fillRect(-300, -40, WORLD_W + 600, WORLD_H + 300);

    // 1. Sky: two stages blended by skyPos, with a glow along the horizon
    const i = Math.min(SKY_COUNT - 1, Math.floor(this.skyPos)), f = this.skyPos - i;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (ready(this.skies[i])) ctx.drawImage(this.skies[i], 0, 0, WORLD_W, WORLD_H);
    if (f > 0.001 && i + 1 < SKY_COUNT && ready(this.skies[i + 1])) {
      ctx.globalAlpha = f;
      ctx.drawImage(this.skies[i + 1], 0, 0, WORLD_W, WORLD_H);
      ctx.globalAlpha = 1;
    }
    const k = this.skyPos / (SKY_COUNT - 1);
    const glow = ctx.createLinearGradient(0, 120, 0, 340);
    glow.addColorStop(0, 'rgba(255, 90, 30, 0)');
    glow.addColorStop(1, `rgba(255, 105, 40, ${0.5 * k})`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 120, WORLD_W, 230);
    const haze = ctx.createLinearGradient(0, 160, 0, 340);
    haze.addColorStop(0, 'rgba(210, 235, 255, 0)');
    haze.addColorStop(1, `rgba(215, 238, 255, ${0.3 * (1 - k)})`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 160, WORLD_W, 190);

    // 2. Archers stand behind the wall (their arrows are drawn in front of it, below)
    for (const a of this.archers) this.drawArcher(ctx, a);

    // 3. The castle wall; as the crowd swells its vines wither and the stone takes the red light
    this.drawWall(ctx, k);
    for (const a of this.archers) for (const arrow of a.arrows) arrow.render(ctx, this.archerSprites.arrow);

    // 4. The floor: the base tile, stretched past both edges so its rounded ends stay off screen
    this.platformArt.draw(ctx, -140, WORLD_W + 140, FLOOR_Y);

    // 5. Mud patches morph the floor under them
    for (const p of this.patches) this.drawMud(ctx, p);

    // 6. Floor mobs and dust
    for (const b of this.betals) b.render(ctx, this.enemySprites);
    for (const q of this.fx) {
      ctx.globalAlpha = Math.max(0, q.life / q.maxLife);
      ctx.fillStyle = q.c;
      ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 13px Cinzel, serif';
    ctx.textAlign = 'center';
    for (const q of this.popups) {
      ctx.globalAlpha = Math.max(0, 1 - q.t);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(30, 10, 0, 0.9)';
      ctx.fillStyle = '#ffe08a';
      ctx.strokeText(q.text, q.x, q.y - q.t * 30);
      ctx.fillText(q.text, q.x, q.y - q.t * 30);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** The archer's body (arrows are drawn separately, in front of the wall). */
  drawArcher(ctx, a) {
    const arrows = a.arrows;
    a.arrows = [];
    ctx.save();
    if (a.appear < 1) ctx.globalAlpha = a.appear;
    a.render(ctx, this.archerSprites);
    ctx.restore();
    a.arrows = arrows;
  }

  drawWall(ctx, k) {
    const w = WALL.w * WALL.scale, h = WALL.h * WALL.scale, ok = ready(this.wallImg);
    const calm = this.cachedArt('wall:calm', w, h, ok, (g) => g.drawImage(this.wallImg, 0, 0, w, h));
    const dead = this.cachedArt('wall:dead', w, h, ok, (g) => {
      g.filter = 'sepia(0.9) hue-rotate(-20deg) saturate(1.5) brightness(0.7) contrast(1.08)';
      g.drawImage(this.wallImg, 0, 0, w, h);
    });
    if (!calm) return;
    ctx.drawImage(calm, WALL.x, WALL.y, w, h);
    if (dead && k > 0.01) {
      ctx.globalAlpha = Math.min(1, k * 0.85);
      ctx.drawImage(dead, WALL.x, WALL.y, w, h);
      ctx.globalAlpha = 1;
    }
  }

  drawMud(ctx, p) {
    const art = MUD, s = art.scale, w = art.cw * s, h = art.ch * s;
    let frame;
    if (p.t < MUD_FORM) frame = Math.min(6, Math.floor((p.t / MUD_FORM) * 7));
    else if (p.t < MUD_FORM + MUD_HOLD) frame = 6;
    else frame = Math.min(11, 7 + Math.floor(((p.t - MUD_FORM - MUD_HOLD) / MUD_FADE) * 5));
    const alpha = Math.min(1, p.t / 0.25, (MUD_LIFE - p.t) / 0.3);
    const c = this.cachedArt(`mud:${frame}`, w, h, ready(this.mudImg), (g) =>
      g.drawImage(this.mudImg, (frame % art.cols) * art.cw, Math.floor(frame / art.cols) * art.ch, art.cw, art.ch, 0, 0, w, h));
    if (!c) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.drawImage(c, p.cx - w / 2, FLOOR_Y - art.surface * s, w, h);
    ctx.restore();
  }

  renderForeground() {}
}
