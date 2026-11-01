/**
 * ==========================================================================
 * THE FATHER / THE ASURA (js/entities/fatherBoss.js)
 * Level 4's two-stage boss. Frames are cut from the sheets in assets/level4/boss into
 * assets/level4/sprites/<anim>_<n>.png at twice their world size (drawn at 0.5).
 *
 *   Stage 1  Rakti's father, possessed (BOSS.HP .. BOSS.STAGE2_HP): walks her down, sword combo,
 *            and a green crescent he sends skimming along the floor (jump it).
 *   Turn     at STAGE2_HP he is thrown down and the Asura tears out of him (dialogue in between).
 *   Stage 2  the Asura (STAGE2_HP .. 0): slash, purple ground blast, ground spikes under Rakti,
 *            and flight: purple orbs that home like the archers' arrows, then a diving slam.
 *   Defeat   the demon burns away and her father stands up again.
 * ==========================================================================
 */

import { Arrow } from './archer.js';
import { Sfx } from '../core/audio.js';

export const BOSS = {
  HP: 300,            // Pitaji fights from 300 down to 200: 100 HP, shown on his own bar
  STAGE2_HP: 200,     // the Asura then has 200, on the boss bar
  F_SPEED: 78,
  D_SPEED: 92,
  FLY_Y: 175,                 // hover height above the floor
  SLASH_DMG: 4, ENERGY_DMG: 4,
  D_SLASH_DMG: 5, BLAST_DMG: 6, SPIKE_DMG: 5, DIVE_DMG: 6, ORB_DMG: 4,
  ORB_SPEED: 215
};

const DIR = 'assets/level4/sprites/';
// frame metrics at the stored (2x) scale; `scale` per frame is drawn on top of the 0.5 base
const ART = {
  f_walk: { n: 6, w: 172, h: 169, ax: 78, ay: 165.2 },
  f_slash: { n: 6, w: 246, h: 202, ax: 87.2, ay: 198.4 },
  f_energy: { n: 6, w: 262, h: 203, ax: 87.9, ay: 198.4 },
  f_fall: { n: 4, w: 249, h: 128, ax: 145.8, ay: 124.3 },
  // the father (frame 0) shrinks into the demon's scale (frame 7): the sheet draws them at different sizes
  transform: { n: 8, w: 300, h: 332, ax: 162, ay: 326.7, from: 1, to: 0.682 },
  leap: { n: 6, w: 306, h: 233, ax: 163.6, ay: 228.5 },
  d_walk: { n: 6, w: 255, h: 238, ax: 127.4, ay: 232.8 },
  d_slash: { n: 6, w: 406, h: 264, ax: 218, ay: 246.6 },
  d_blast: { n: 6, w: 332, h: 267, ax: 184, ay: 261.3 },
  d_fly: { n: 6, w: 231, h: 213, ax: 96.9, ay: 210 },
  d_orb: { n: 4, w: 296, h: 196, ax: 127.8, ay: 192.6 },
  d_slam: { n: 6, w: 261, h: 294, ax: 132.3, ay: 290.4 },
  defeat: { n: 8, w: 166, h: 225, ax: 85.3, ay: 222.1, from: 1, to: 0.78 },
  spikes: { n: 6, w: 175, h: 94, ax: 76.2, ay: 90.3 },
  orb_purple: { n: 6, w: 79, h: 56, ax: 51.2, ay: 28.6 }
};
const loadSet = (name) => Array.from({ length: ART[name].n }, (_, i) => { const im = new Image(); im.src = `${DIR}${name}_${i}.png`; return im; });
const ready = (i) => i && i.complete && i.naturalWidth > 0;
const rand = (a, b) => a + Math.random() * (b - a);

let IMGS = null;
export function bossImages() {
  if (!IMGS) { IMGS = {}; for (const k of Object.keys(ART)) IMGS[k] = loadSet(k); }
  return IMGS;
}

/** Draws frame `i` of `name` with its feet at (x, y). */
export function drawBossFrame(ctx, name, i, x, y, facing = 'right', alpha = 1, flash = 0, extraScale = 1) {
  const A = ART[name], im = bossImages()[name][Math.max(0, Math.min(A.n - 1, i))];
  if (!ready(im)) return;
  let k = 0.5 * extraScale;
  if (A.from !== undefined) k *= A.from + (A.to - A.from) * (i / (A.n - 1));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(facing === 'left' ? -k : k, k);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(im, -A.ax, -A.ay, A.w, A.h);
  if (flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, flash * 4) * 0.6 * alpha;
    ctx.drawImage(im, -A.ax, -A.ay, A.w, A.h);
  }
  ctx.restore();
}

/** The Asura's purple orb: it hunts Rakti exactly like the archers' homing arrows (and her blade can cut it). */
// states in which he is on foot (he stands on the floor or a throne platform and drops off its edge)
const GROUNDED = new Set(['walk', 'slash', 'energy', 'recover', 'stagger', 'blast', 'slam', 'lunge', 'dodge', 'land']);

export class PurpleOrb extends Arrow {
  constructor(x, y, owner) {
    super(x, y, owner);
    this.damage = BOSS.ORB_DMG;
    this.sfx = false;
    this.width = 26; this.height = 26;
    this.trailA = '#b04dff';
    this.trailB = '#f0c8ff';
    this.spin = 0;
  }
  update(dt, player, level) {
    this.spin += dt;
    return super.update(dt, player, level);
  }
  render(ctx) {
    for (const p of this.trailParticles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const f = Math.floor(this.spin * 12) % 3 === 2 ? 4 : [0, 1, 2, 3][Math.floor(this.spin * 10) % 4];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, 20);
    g.addColorStop(0, 'rgba(200, 120, 255, 0.5)');
    g.addColorStop(1, 'rgba(120, 30, 200, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(this.x - 20, this.y - 20, 40, 40);
    ctx.restore();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const A = ART.orb_purple, im = bossImages().orb_purple[f], k = 0.5;
    if (ready(im)) ctx.drawImage(im, -A.ax * k, -A.ay * k, A.w * k, A.h * k);
    ctx.restore();
  }
}

export class FatherBoss {
  constructor(level, x, y) {
    this.level = level;
    this.home = { x, y };
    bossImages();
    this.waves = [];      // the father's green crescents
    this.spikes = [];     // the Asura's ground spikes
    this.rings = [];      // shockwave rings (visual)
    this.reset(1);
  }

  /** stage 1: the father on his throne; stage 2: straight back into the Asura (respawn after dying to it). */
  reset(stage = 1) {
    this.stage = stage;
    this.hp = stage === 1 ? BOSS.HP : BOSS.STAGE2_HP;
    this.maxHp = BOSS.HP;
    this.stage2Hp = BOSS.STAGE2_HP;   // Pitaji: HP .. STAGE2_HP (100 on his own bar); the Asura: STAGE2_HP .. 0
    this.x = stage === 1 ? this.home.x : this.home.x - 300;
    this.y = stage === 1 ? this.home.y : this.level.floorY;
    this.vy = 0;
    this.facing = 'left';
    this.state = stage === 1 ? 'throne' : 'walk';
    this.t = 0;
    this.anim = 0;
    this.hitFlash = 0;
    this.alpha = stage === 1 ? 0 : 1;   // fades in on the throne when the mala is taken
    this.cd = { energy: 3, blast: 4, slam: 3, fly: 9, attack: 0.8, dodge: 2, lunge: 2.5, jump: 2 };
    this.perchTime = 0;        // how long Rakti has been standing up on a ledge (he comes up after her)
    this.recentDmg = 0;        // damage taken over the last moments (he answers a beating)
    this.combo = 0;
    this.staggerDmg = 0;
    this.hitDone = false;
    this.casts = 0;
    this.waves = [];
    this.spikes = [];
    this.rings = [];
    this.sparks = [];
  }

  get active() { return this.state !== 'throne' && this.state !== 'hidden'; }
  get fighting() { return ['walk', 'slash', 'energy', 'recover', 'stagger', 'blast', 'slam', 'takeoff', 'hover', 'orbcast', 'dive', 'land', 'leapdown', 'dodge', 'lunge', 'jumpslash'].includes(this.state); }
  get invulnerable() { return !this.fighting || this.state === 'leapdown' || this.state === 'dodge'; }
  get enraged() { return this.stage === 2 && this.hp <= 100; }
  get demon() { return this.stage === 2 && this.state !== 'defeat' && this.state !== 'freed'; }
  // targeting geometry (Trishul / gold orbs / sword)
  get hitHeight() { return this.demon ? 88 : 70; }
  get hitHalfW() { return this.demon ? 26 : 20; }
  get alive() { return this.fighting; }
  get dead() { return !this.fighting; }

  setState(s) { this.state = s; this.t = 0; this.anim = 0; this.hitDone = false; }

  /** Any hit from Rakti. source 'orb' = Kali's gold orbs (they do not refill the charge). */
  takeHit(damage, fromX, level = this.level, source = null) {
    if (this.invulnerable) return false;
    Sfx.play('hit');
    const floor = this.stage === 1 ? BOSS.STAGE2_HP : 0;
    const dealt = Math.min(damage, this.hp - floor);
    this.hp = Math.max(floor, this.hp - damage);
    this.hitFlash = 0.22;
    this.level.onBossDamage?.(dealt, source);
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.sparks.push({ x: this.x + rand(-10, 10), y: this.y - this.hitHeight * 0.55, vx: Math.cos(a) * rand(40, 120), vy: Math.sin(a) * rand(40, 120) - 30,
        life: 0.4, max: 0.4, c: this.demon ? (i % 2 ? '#c77dff' : '#ffffff') : (i % 2 ? '#ffd36b' : '#ff4d4d') });
    }
    this.staggerDmg += damage;
    this.recentDmg += damage;
    if (this.hp <= floor) {
      if (this.stage === 1) this.level.onBossStageOver?.(1);
      else this.level.onBossStageOver?.(2);
      return true;
    }
    // every so often a hit staggers him (never mid-air)
    if (this.staggerDmg >= (this.demon ? 45 : 32) && !['takeoff', 'hover', 'orbcast', 'dive'].includes(this.state)) {
      this.staggerDmg = 0;
      this.setState('stagger');
    }
    return false;
  }

  // ------------------------------------------------------------------ cut-scene steps (driven by the level)
  appearOnThrone() { this.state = 'throneShow'; this.t = 0; }
  leapDown() { this.vy = -330; this.setState('leapdown'); }
  fall() { this.setState('falling'); this.waves = []; }
  transform() { this.setState('transform'); }
  startStage2() {
    this.stage = 2; this.y = this.level.floorY;
    this.cd = { blast: 3, slam: 2.5, fly: 7, attack: 0.6, dodge: 2, lunge: 3, jump: 2 };
    this.setState('walk');
  }
  defeat() { this.setState('defeat'); this.y = this.level.floorY; this.spikes = []; this.waves = []; }

  // ------------------------------------------------------------------ update
  update(dt, player, paused) {
    const L = this.level, floor = L.floorY;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt;
      if (p.life <= 0) this.sparks.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) { this.rings[i].t += dt; if (this.rings[i].t > 0.5) this.rings.splice(i, 1); }
    if (paused) return;
    this.t += dt;
    this.anim += dt;
    for (const k of Object.keys(this.cd)) this.cd[k] -= dt;
    this.updateWaves(dt, player);
    this.updateSpikes(dt, player);

    const P = player && !player.isDead ? player : null;
    const dx = P ? P.x - this.x : 0;
    const face = () => { if (P) this.facing = dx < 0 ? 'left' : 'right'; };
    const dir = this.facing === 'left' ? -1 : 1;
    const inFront = (reach) => P && Math.abs(dx) <= reach && (dir > 0 ? dx > -12 : dx < 12) && Math.abs(P.y - this.y) < 60;
    const hurt = (dmg, kx = 210, ky = -170) => { if (P && P.invulnerableTimer <= 0) { P.takeDamage(dmg, Math.sign(dx || dir) * kx, ky); L.shake(0.35); } };
    this.swordCheck(P, dx);
    this.recentDmg = Math.max(0, this.recentDmg - dt * 12);
    // she is standing above him (the throne's dais or seat): after a moment he jumps up after her
    const onLedge = P && P.isGrounded && P.y < this.y - 30;
    const below = P && P.isGrounded && P.y > this.y + 30;   // she has dropped down past him
    this.perchTime = onLedge ? this.perchTime + dt : 0;
    const speedK = this.enraged ? 0.75 : 1;   // the Asura's cooldowns shrink once it is badly hurt

    // Reactions, checked while he is free to move: dodge an incoming gold orb or a swing he sees coming
    if (P && (this.state === 'walk' || this.state === 'recover') && this.cd.dodge <= 0) {
      const orbIn = (P.goldOrbs || []).some((o) => Math.abs(o.x - this.x) < 150 && Math.sign(this.x - o.x) === Math.sign(o.vx) && Math.abs(o.y - (this.y - 45)) < 60);
      const swingIn = P.isAttacking && Math.abs(dx) < 80 && (dx > 0 ? P.facing === 'left' : P.facing === 'right') && P.attackFrame <= 1;
      if ((orbIn && Math.random() < 0.45) || (swingIn && Math.random() < (this.stage === 1 ? 0.3 : 0.2))) {
        this.cd.dodge = this.stage === 1 ? 2.6 : 3.2;
        this.dodgeDir = Math.sign(this.x - P.x) || 1;
        this.setState('dodge');
        L.burst(this.x, floor - 6, 8, this.stage === 1 ? ['#c8955a', '#ffd36b'] : ['#c77dff', '#3d0a6e'], 70, 0.35);
      }
    }

    switch (this.state) {
      case 'throne': break;
      case 'throneShow':
        this.alpha = Math.min(1, this.t / 1.2);
        if (Math.random() < 0.5) L.burst(this.x + rand(-20, 20), this.y - rand(0, 70), 1, ['#9b4dff', '#3d0a6e', '#ffd36b'], 30, 0.8);
        if (this.alpha >= 1) this.state = 'throne';
        break;
      case 'leapdown': {
        // from the throne down to the floor, toward Rakti
        if (this.leapFrom == null) this.leapFrom = this.y;   // never lands back on what he leapt from
        const y0 = Math.max(this.y, this.leapFrom + 4);
        this.vy += 900 * dt;
        this.y += this.vy * dt;
        this.x += (this.facing === 'left' ? -1 : 1) * 190 * dt;
        const land = this.surfaceAt(this.x, y0);
        if (this.y >= land && this.vy > 0) {
          this.y = land;
          this.leapFrom = null;
          Sfx.play('boss_land');
          L.shake(0.5);
          L.burst(this.x, land - 4, 16, ['#c8955a', '#ffd36b', '#7a2d12'], 120, 0.5);
          this.setState('recover');
        }
        break;
      }
      // -------------------------------------------------------- stage 1: the father
      case 'walk': {
        face();
        const d = Math.abs(dx);
        const kali = P && P.isDivine;          // Rakti in Kali form, hurling orbs from range: close the gap fast
        if (this.stage === 1) {
          if (this.perchTime > 0.6 && this.cd.jump <= 0) this.jumpAfter(P);
          else if (below && Math.abs(dx) < 160) { this.setState('leapdown'); this.vy = -160; }
          else if (d < 62 && this.cd.attack <= 0) { this.combo = Math.random() < 0.4 ? 1 : 0; this.setState('slash'); }
          else if (d > 110 && d < 260 && this.cd.lunge <= 0 && P && P.isGrounded && !onLedge) this.setState('lunge');
          else if (d > 200 && this.cd.energy <= 0 && !onLedge && this.y >= floor - 2) { this.doubleWave = this.hp < 250; this.setState('energy'); }
          else if (d > 46) this.x += Math.sign(dx) * BOSS.F_SPEED * (kali ? 1.6 : 1) * dt;
        } else {
          if (this.cd.fly <= 0 || (this.perchTime > 1.0 && this.cd.fly < 4)) { this.setState('takeoff'); this.casts = 0; }
          else if (this.perchTime > 0.6 && this.cd.jump <= 0 && this.y >= floor - 2 && Math.abs(dx) < 260) this.jumpAfter(P);
          else if (below && Math.abs(dx) < 160) { this.setState('leapdown'); this.vy = -160; }
          else if (d < 80 && this.recentDmg > 14 && this.cd.blast <= 0) this.setState('blast');   // she is hammering him: blast her off
          else if (d < 78 && this.cd.attack <= 0) { this.combo = Math.random() < 0.35 ? 1 : 0; this.setState(this.cd.blast <= 0 && Math.random() < 0.4 ? 'blast' : 'slash'); }
          else if (d > 120 && d < 480 && this.cd.slam <= 0) this.setState('slam');
          else if (d > 130 && d < 300 && this.cd.lunge <= 0 && P && P.isGrounded && !onLedge) this.setState('lunge');
          else if (d > 58) this.x += Math.sign(dx) * BOSS.D_SPEED * (kali ? 1.5 : 1) * dt;
        }
        break;
      }
      case 'dodge':
        // a quick hop back out of reach; he comes straight back with a swing
        this.x += this.dodgeDir * 330 * dt * Math.max(0, 1 - this.t / 0.32);
        if (this.t >= 0.32) { this.cd.attack = 0; this.cd.lunge = Math.min(this.cd.lunge, 0.2); this.setState('walk'); }
        break;
      case 'lunge':
        // a fast dash in, ending in a slash
        face();
        if (this.t > 0.12) this.x += (this.facing === 'left' ? -1 : 1) * (this.stage === 1 ? 420 : 460) * dt;
        if (this.t >= 0.4 || Math.abs(dx) < 54) { this.cd.lunge = rand(3.2, 4.6) * speedK; this.combo = 0; this.setState('slash'); }
        break;
      case 'jumpslash': {
        // he leaps up after her when she climbs the throne, and lands on it (dais or seat) beside her
        const y0 = this.y;
        this.vy += 1100 * dt;
        this.y += this.vy * dt;
        this.x += Math.max(-260 * dt, Math.min(260 * dt, this.jumpTo - this.x));
        if (!this.hitDone && P && Math.abs(P.x - this.x) < 70 && Math.abs(P.y - this.y) < 70) {
          this.hitDone = true;
          hurt(BOSS.SLASH_DMG + 1, 240, -200);
          L.burst(this.x, this.y - 40, 8, ['#ffffff', '#ffd36b'], 90, 0.3);
        }
        const land = this.surfaceAt(this.x, y0);
        if (this.vy > 0 && this.y >= land) {
          this.y = land;
          Sfx.play('boss_land');
          L.shake(0.4);
          L.burst(this.x, land - 4, 12, ['#c8955a', '#ffd36b', '#7a2d12'], 110, 0.4);
          this.cd.jump = rand(2.2, 3.2);
          this.setState('recover');
        }
        break;
      }
      case 'slash': {
        const ft = this.stage === 1 ? 0.1 : 0.085;
        if (this.anim >= ft * 3 && !this.hitDone) {
          this.hitDone = true;
          Sfx.play('mob_swing');
          if (inFront(this.stage === 1 ? 80 : 98)) hurt(this.stage === 1 ? BOSS.SLASH_DMG : BOSS.D_SLASH_DMG);
          L.burst(this.x + dir * 50, this.y - 40, 6, this.stage === 1 ? ['#ffffff', '#ffd36b'] : ['#c77dff', '#ffffff'], 70, 0.3);
        }
        if (this.anim >= ft * 6) {
          if (this.combo > 0 && P && Math.abs(dx) < 95) { this.combo--; face(); this.setState('slash'); break; }   // a second cut
          this.cd.attack = (this.stage === 1 ? 0.9 : 0.75) * speedK;
          this.setState('recover');
        }
        break;
      }
      case 'energy':
        face();
        if (this.anim >= 0.11 * 4 && !this.hitDone) {
          this.hitDone = true;
          this.waves.push({ x: this.x + dir * 40, dir, t: 0 });
          Sfx.play('boss_blast');
          if (this.doubleWave) this.waves.push({ x: this.x + dir * 40, dir, t: -0.45 });   // a second one behind it
          L.shake(0.2);
        }
        if (this.anim >= 0.11 * 6) { this.cd.energy = rand(4.2, 5.8); this.cd.attack = 0.6; this.setState('recover'); }
        break;
      case 'recover':
        if (this.t >= (this.stage === 1 ? 0.45 : 0.35)) this.setState('walk');
        break;
      case 'stagger':
        if (this.t >= 0.4) { this.cd.attack = 0.3; this.setState('walk'); }
        break;
      // -------------------------------------------------------- stage 2: the Asura
      case 'blast':
        if (this.anim >= 0.12 * 3 && !this.hitDone) {
          this.hitDone = true;
          this.rings.push({ x: this.x, y: floor, t: 0, r: 125 });
          Sfx.play('boss_blast');
          L.shake(0.6);
          L.burst(this.x, floor - 6, 26, ['#c77dff', '#3d0a6e', '#ffffff'], 160, 0.6);
          if (P && Math.abs(dx) < 125 && P.y > floor - 30) hurt(BOSS.BLAST_DMG, 260, -230);
        }
        if (this.anim >= 0.12 * 6) { this.cd.blast = rand(5, 7) * speedK; this.cd.attack = 0.7; this.recentDmg = 0; this.setState('recover'); }
        break;
      case 'slam':
        face();
        if (this.anim >= 0.12 * 2 && !this.hitDone) {
          this.hitDone = true;
          // aimed where she is going, not where she is
          const lead = P ? Math.max(-120, Math.min(120, (P.vx || 0) * 0.45)) : 0;
          const px = Math.max(L.arenaMin + 20, Math.min(L.arenaMax - 20, (P ? P.x : this.x + dir * 160) + lead));
          Sfx.play('boss_slam');
          this.spikes.push({ x: px, t: -0.5, hit: false });
          this.spikes.push({ x: px - 85, t: -0.8, hit: false });
          this.spikes.push({ x: px + 85, t: -0.8, hit: false });
          if (this.enraged) { this.spikes.push({ x: px - 170, t: -1.1, hit: false }); this.spikes.push({ x: px + 170, t: -1.1, hit: false }); }
          L.shake(0.3);
        }
        if (this.anim >= 0.12 * 6) { this.cd.slam = rand(4, 5.5) * speedK; this.cd.attack = 0.5; this.setState('recover'); }
        break;
      case 'takeoff':
        face();
        this.y = floor - BOSS.FLY_Y * Math.min(1, this.t / 0.6);
        if (this.t < 0.1) L.burst(this.x, floor - 4, 14, ['#3d0a6e', '#c77dff', '#1a0a20'], 110, 0.5);
        if (this.t >= 0.6) this.setState('hover');
        break;
      case 'hover': {
        face();
        const want = P ? P.x - Math.sign(dx || 1) * 170 : this.x;
        const tx = Math.max(L.arenaMin + 40, Math.min(L.arenaMax - 40, want));
        this.x += Math.max(-150 * dt, Math.min(150 * dt, tx - this.x));
        this.y = floor - BOSS.FLY_Y + Math.sin(this.t * 3) * 8;
        if (this.t >= (this.casts === 0 ? 0.7 : 1.1)) {
          if (this.casts < (this.perchTime > 1 ? 1 : this.enraged ? 5 : 3)) this.setState('orbcast');
          else this.setState('dive');
        }
        break;
      }
      case 'orbcast':
        face();
        this.y = floor - BOSS.FLY_Y + Math.sin(this.anim * 3) * 4;
        if (this.anim >= 0.13 * 3 && !this.hitDone) {
          this.hitDone = true;
          this.casts++;
          const ox = this.x + dir * 34, oy = this.y - 62;
          const orb = new PurpleOrb(ox, oy, this);
          const ty = P ? P.y - 25 : floor - 25, tx = P ? P.x : ox + dir * 100;
          orb.release(BOSS.ORB_SPEED, Math.atan2(ty - oy, tx - ox));
          L.arrows.push(orb);
          L.burst(ox, oy, 8, ['#c77dff', '#ffffff'], 80, 0.35);
        }
        if (this.anim >= 0.13 * 4 + 0.15) this.setState('hover');
        break;
      case 'dive': {
        // a swoop onto where Rakti stands
        if (this.t < 0.05) { this.diveFrom = { x: this.x, y: this.y }; this.diveTo = P ? P.x : this.x; face(); }
        const u = Math.min(1, this.t / 0.55);
        this.x = this.diveFrom.x + (this.diveTo - this.diveFrom.x) * u;
        this.y = this.diveFrom.y + (floor - this.diveFrom.y) * u * u;
        // the swoop itself hits her on the way down (she cannot hide on a ledge)
        if (!this.hitDone && P && Math.abs(P.x - this.x) < 44 && Math.abs((P.y - 30) - (this.y - 50)) < 50) { this.hitDone = true; hurt(BOSS.DIVE_DMG, 240, -200); }
        if (u >= 1) {
          this.y = floor;
          this.rings.push({ x: this.x, y: floor, t: 0, r: 95 });
          Sfx.play('boss_land');
          L.shake(0.7);
          L.burst(this.x, floor - 6, 24, ['#c77dff', '#3d0a6e', '#ffffff'], 150, 0.6);
          if (P && Math.abs(P.x - this.x) < 95 && P.y > floor - 40) hurt(BOSS.DIVE_DMG, 260, -230);
          this.setState('land');
        }
        break;
      }
      case 'land':
        if (this.anim >= 0.16 * 4) { this.cd.fly = rand(11, 14) * speedK; this.cd.attack = 0.4; this.setState('walk'); }
        break;
      // -------------------------------------------------------- the turn and the end
      case 'falling':
        this.y = Math.min(floor, this.y + 300 * dt);
        break;
      case 'transform':
        if (Math.random() < 0.7) L.burst(this.x + rand(-30, 30), this.y - rand(0, 80), 1, ['#9b4dff', '#3d0a6e', '#e0b0ff'], 60, 0.9);
        break;
      case 'defeat':
        if (this.anim < 1.6 && Math.random() < 0.6) L.burst(this.x + rand(-25, 25), this.y - rand(10, 90), 1, ['#9b4dff', '#3d0a6e', '#c8b6ff'], 50, 0.9);
        break;
    }
    this.x = Math.max(L.arenaMin, Math.min(L.arenaMax, this.x));
    // On foot he stands on whatever is under him: the floor, or the throne's dais / seat. Walking off an edge he drops.
    if (GROUNDED.has(this.state)) {
      const s = this.surfaceAt(this.x, this.y);
      if (this.y < s - 1) { this.fallV = (this.fallV || 0) + 1100 * dt; this.y = Math.min(s, this.y + this.fallV * dt); }
      else { this.y = s; this.fallV = 0; }
    }
  }

  /** The highest surface at x that is at or below height y: a throne platform (level.bossPlatforms) or the floor. */
  surfaceAt(x, y) {
    let best = this.level.floorY;
    for (const p of this.level.bossPlatforms?.() || []) {
      if (x >= p.x1 && x <= p.x2 && p.y >= y - 3 && p.y < best) best = p.y;
    }
    return best;
  }

  /** A leap up to Rakti's height (onto the throne after her), slashing on the way. */
  jumpAfter(P) {
    const rise = Math.max(60, this.y - P.y + 46);
    this.jumpTo = P.x - Math.sign(P.x - this.x || 1) * 30;
    this.vy = -Math.sqrt(2 * 1100 * rise);
    this.setState('jumpslash');
  }

  /** Rakti's blade (one hit per swing, she must face him; Kali form cannot use the blade). */
  swordCheck(P, dx) {
    if (!P || !P.isAttacking || this.invulnerable) return;
    if (Math.abs(dx) > 64 || P.y < this.y - this.hitHeight - 10 || P.y > this.y + 30) return;
    const facingHim = dx === 0 || (dx > 0 ? P.facing === 'left' : P.facing !== 'left');
    if (facingHim && P.claimSwingHit?.(this)) this.takeHit(P.swordDamage, P.x, this.level, 'sword');
  }

  updateWaves(dt, P) {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.t += dt;
      if (w.t < 0) continue;
      w.x += w.dir * 300 * dt;
      if (P && !w.hit && Math.abs(P.x - w.x) < 18 && P.y > this.level.floorY - 34 && P.invulnerableTimer <= 0) {
        w.hit = true;
        P.takeDamage(BOSS.ENERGY_DMG, w.dir * 200, -170);
        this.level.shake(0.3);
      }
      if (w.t > 3 || w.hit || w.x < this.level.arenaMin - 60 || w.x > this.level.width + 60) this.waves.splice(i, 1);
    }
  }

  updateSpikes(dt, P) {
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const s = this.spikes[i];
      s.t += dt;
      const f = Math.floor(s.t / 0.08);
      if (s.t >= 0 && !s.burst) { s.burst = true; this.level.shake(0.25); this.level.burst(s.x, this.level.floorY - 4, 10, ['#3a2d3a', '#c77dff', '#1a0a20'], 110, 0.5); }
      if (f >= 1 && f <= 4 && !s.hit && P && Math.abs(P.x - s.x) < 30 && P.y > this.level.floorY - 52 && P.invulnerableTimer <= 0) {
        s.hit = true;
        P.takeDamage(BOSS.SPIKE_DMG, Math.sign(P.x - s.x || 1) * 160, -260);
        this.level.shake(0.35);
      }
      if (f >= 6) this.spikes.splice(i, 1);
    }
  }

  // ------------------------------------------------------------------ drawing
  /** [name, frame] for the current state. */
  frame() {
    const st = this.state, a = this.anim, s1 = this.stage === 1;
    const loop = (n, ft) => Math.floor(a / ft) % n;
    const once = (n, ft) => Math.min(n - 1, Math.floor(a / ft));
    switch (st) {
      case 'throne': case 'throneShow': return ['f_walk', 0];
      case 'leapdown': return s1 ? ['f_slash', 2] : ['d_fly', loop(6, 0.09)];
      case 'walk': return s1 ? ['f_walk', loop(6, 0.11)] : ['d_walk', loop(6, 0.1)];
      case 'slash': return s1 ? ['f_slash', once(6, 0.1)] : ['d_slash', once(6, 0.085)];
      case 'energy': return ['f_energy', once(6, 0.11)];
      case 'recover': return s1 ? ['f_slash', 5] : ['d_walk', 0];
      case 'stagger': return s1 ? ['f_fall', 0] : ['d_slam', 3];
      case 'dodge': return s1 ? ['f_walk', 5 - loop(6, 0.06)] : ['d_walk', 5 - loop(6, 0.06)];
      case 'lunge': return s1 ? ['f_slash', 1] : ['d_slash', 1];
      case 'jumpslash': return s1 ? ['f_slash', this.vy < 0 ? 2 : 3] : ['d_fly', loop(6, 0.09)];
      case 'blast': return ['d_blast', once(6, 0.12)];
      case 'slam': return ['d_slam', once(6, 0.12)];
      case 'takeoff': case 'hover': return ['d_fly', loop(6, 0.09)];
      case 'orbcast': return ['d_orb', once(4, 0.13)];
      case 'dive': return ['leap', this.t < 0.3 ? 0 : 1];
      case 'land': return ['leap', 2 + once(4, 0.16)];
      case 'falling': return ['f_fall', once(4, 0.2)];
      case 'transform': return ['transform', once(8, 0.3)];
      case 'defeat': return ['defeat', once(8, 0.42)];
      case 'freed': return ['defeat', 7];
      default: return ['f_walk', 0];
    }
  }

  render(ctx) {
    if (this.state === 'hidden') return;
    const [name, i] = this.frame();
    // shadow on the floor
    const ground = this.surfaceAt(this.x, this.y);
    const air = Math.max(0, ground - this.y);
    ctx.save();
    ctx.globalAlpha = this.alpha * Math.max(0.15, 0.4 - air / 500);
    ctx.fillStyle = '#1a0805';
    ctx.beginPath();
    ctx.ellipse(this.x, ground + 2, this.demon ? 34 : 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (this.demon) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(this.x, this.y - 50, 4, this.x, this.y - 50, 80);
      g.addColorStop(0, `rgba(150, 60, 255, ${0.16 + 0.06 * Math.sin(this.t * 4)})`);
      g.addColorStop(1, 'rgba(60, 0, 120, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(this.x - 80, this.y - 130, 160, 160);
      ctx.restore();
    }
    drawBossFrame(ctx, name, i, this.x, this.y, this.facing, this.alpha, this.hitFlash);
    for (const p of this.sparks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  /** Drawn in front of Rakti: the crescents, the spikes and the shockwave rings. */
  renderEffects(ctx) {
    const floor = this.level.floorY;
    for (const w of this.waves) {
      if (w.t < 0) continue;
      ctx.save();
      ctx.translate(w.x, floor - 18);
      ctx.scale(w.dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = k === 0 ? 'rgba(170, 255, 200, 0.95)' : k === 1 ? 'rgba(60, 230, 140, 0.6)' : 'rgba(255, 220, 120, 0.4)';
        ctx.lineWidth = 5 - k * 1.4;
        ctx.beginPath();
        ctx.arc(-10 - k * 6, 0, 22 + k * 3, -1.1, 1.1);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const s of this.spikes) {
      if (s.t < 0) {
        // warning: a purple crack glowing where they will erupt
        const a = 0.35 + 0.35 * Math.sin(s.t * 40);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(s.x, floor, 2, s.x, floor, 34);
        g.addColorStop(0, `rgba(200, 110, 255, ${a})`);
        g.addColorStop(1, 'rgba(120, 30, 200, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(s.x - 36, floor - 20, 72, 30);
        ctx.restore();
        continue;
      }
      drawBossFrame(ctx, 'spikes', Math.min(5, Math.floor(s.t / 0.08)), s.x, floor + 4, 'right', 1, 0, 0.8);
    }
    for (const r of this.rings) {
      const u = r.t / 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(200, 120, 255, ${0.8 * (1 - u)})`;
      ctx.lineWidth = 4 * (1 - u) + 1;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r * (0.3 + 0.7 * u), 10 + 10 * u, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
