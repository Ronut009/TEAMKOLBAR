/**
 * ==========================================================================
 * LEVEL 4: THE RED FORT (js/levels/level4.js)
 * Two screens of the red fort wall at sunset (assets/level4/fort_a.jpg with the portal gate, fort_b.jpg).
 *
 *   1. Rakti steps out of the portal. The last relic, Maa Kali's skull mala, sits on a shrine right
 *      by the gate. Too easy: Rakti says so. Taking it lets her Kali form [X] hurl gold orbs, but from
 *      now on that form needs a full charge, filled by the damage she deals with blade and Trishul.
 *   2. Her father appears on the Lion Throne at the far end. He is possessed; after a short talk he
 *      leaps down and attacks, and archers rise in the parapet windows (5 waves over the whole fight).
 *   3. Boss stage 1, the father (300 -> 200 HP). He is thrown down and the Asura tears out of him.
 *   4. Boss stage 2, the Asura (200 -> 0): it flies, hurls homing purple orbs, slashes, blasts the ground
 *      and raises spikes under Rakti.
 *   5. The demon burns away, her father stands again, they talk, and Rakti runs to hug him. The end.
 * Deaths keep the story where it was: Rakti returns to the arena and the current boss stage restarts.
 * The previous archer-fort version is kept in js/levels/backup/level4_archer_fort_v1.js.
 * ==========================================================================
 */

import { Arrow } from '../entities/archer.js';
import { Sfx } from '../core/audio.js';
import { FatherBoss } from '../entities/fatherBoss.js';
import { drawShrineBeacon } from '../render/shrineBeacon.js';

// ---------------------------------------------------------------------------
// World: one 3404 x 887 panorama (assets/level4/fort_panorama.jpg) made from the two fort screens, their walls
// joined slit-to-slit and colour-matched (scratchpad tools/l4pano.py), drawn at BG_K
// ---------------------------------------------------------------------------
const BG_K = 0.62;
const PANO_W = 3404;
const SCREEN_H = 887 * BG_K;             // ~550
const WORLD_W = Math.round(PANO_W * BG_K);
const FLOOR_Y = Math.round(775 * BG_K);  // the paving Rakti walks on (image row 775)
const PORTAL = { x: 105, y: 335 };       // the swirling gate at the left
const ARENA_MIN = 40;                    // the whole courtyard is the arena
const ARENA_MAX = WORLD_W - 40;
// Raised stone ledges in the arena (fort_ledge.png, 400 x 51 at 2x: drawn 200 x 25.5, feet 6 px below its top edge)
const LEDGE_ART = { src: 'assets/level4/sprites/fort_ledge.png', w: 200, h: 25.5, deck: 6 };
// Removed on request: the courtyard is open floor again (the old positions are kept in this comment):
//   { x1: 660, x2: 860 }, { x1: 980, x2: 1180 }, { x1: 1780, x2: 1980 }, all at y = FLOOR_Y - 96
const LEDGES = [];

// The Lion Throne (assets/level4/sprites/throne.png, 847 x 535) at the right end; its low platform and the
// lion's pedestal can be stood on
const THRONE = { src: 'assets/level4/sprites/throne.png', w: 847, h: 535, drawW: 430 };
THRONE.k = THRONE.drawW / THRONE.w;
THRONE.x = WORLD_W - THRONE.drawW - 250;   // back toward the far wall, but in far enough for the camera to frame Pitaji on it
THRONE.y = FLOOR_Y + 4 - THRONE.h * THRONE.k;
const tpx = (px) => THRONE.x + px * THRONE.k;
const tpy = (py) => THRONE.y + py * THRONE.k;
const THRONE_DAIS = { x1: tpx(25), x2: tpx(520), y: Math.round(tpy(372)) };
const THRONE_SEAT = { x1: tpx(530), x2: tpx(760), y: Math.round(tpy(245)) };
const FATHER_HOME = { x: Math.round(tpx(600)), y: THRONE_SEAT.y };
// where the scenes put them: the start of stage 2 (and the respawn spot in the fight) and the reunion
const FIGHT_SPOT = { rakti: 1000, boss: 1400 };
const HUG_X = 1200;

// The relic shrine near the gate (relic_shrine.png, 307 x 204)
const SHRINE = { src: 'assets/level4/sprites/relic_shrine.png', w: 307, h: 204, drawW: 150, x: 560 };
SHRINE.k = SHRINE.drawW / SHRINE.w;
SHRINE.top = FLOOR_Y + 3 - SHRINE.h * SHRINE.k;

// The arched parapet (fort_parapet.png 1961 x 287, with the dark chamber behind the openings): three strips laid
// end to end along the whole wall top (panorama x 541..3244), their base resting on the wall's coping (row 340);
// archers rise in the 8 open embrasures of each, 24 in all, over both halves of the fort
const PARAPET = { src: 'assets/level4/fort_parapet.png', backSrc: 'assets/level4/fort_parapet_back.png', imgW: 1961, imgH: 287,
  sillPx: 201, windowPx: [109, 429, 586, 743, 1053, 1212, 1525, 1684] };
const WALL_X0 = 541 * BG_K, WALL_X1 = 3244 * BG_K, WALL_TOP = 340 * BG_K;
// the 12 bays of a strip run from image x 25 to 1919: strips are laid at that pitch so the next strip's first bay
// starts exactly where the last one ended (their base ledges overlap) and no joint shows
PARAPET.bay0 = 25; PARAPET.pitch = 1894;
PARAPET.scale = (WALL_X1 - WALL_X0) / 3 / PARAPET.pitch;
const STRIPS = [0, 1, 2].map((i) => ({ x: WALL_X0 + (i * PARAPET.pitch - PARAPET.bay0) * PARAPET.scale, bottom: WALL_TOP }));
for (const s of STRIPS) {
  s.y = s.bottom - PARAPET.imgH * PARAPET.scale;
  s.sill = s.y + PARAPET.sillPx * PARAPET.scale;
}
const WINDOWS = STRIPS.flatMap((s, si) => PARAPET.windowPx.map((px, i) => ({ id: si * 8 + i, x: s.x + px * PARAPET.scale, sill: s.sill, strip: s })));

// Archers (Level 2's desert archer frames), small on the distant wall
const R = PARAPET.scale / 0.57;          // relative to the first fort's parapet scale
const ARCHER_ART = {
  dir: 'assets/level2/archer/',
  frameW: 156, frameH: 130, anchorX: 79, anchorY: 128.5, scale: 0.5 * R,
  muzzle: [16 * R, -38.5 * R], arrowW: 26, arrowH: 6, footDrop: 14 * R, rise: 36 * R
};

export const L4_CONFIG = {
  ARCHER_HP: 24,              // two Trishul hits (12 each with the Forest Heart), three gold orbs
  ARROW_DAMAGE: 2,
  ARROW_SPEED: 240,
  // five waves over the boss fight (window ids 0-7 left strip, 8-15 middle, 16-23 right, over both fort halves)
  WAVES: [
    { windows: [11, 17], stagger: 0.8, cooldown: [3.2, 4.6] },
    { windows: [7, 13, 20], stagger: 0.7, cooldown: [3.2, 4.6] },
    { windows: [5, 10, 18], stagger: 0.7, cooldown: [3.0, 4.4] },
    { windows: [8, 12, 16, 22], stagger: 0.6, cooldown: [3.2, 4.8] },
    { windows: [6, 9, 15, 21], stagger: 0.6, cooldown: [3.0, 4.6] }
  ],
  WAVE_BREAK: 6,              // seconds between a cleared wave and the next
  FIRE_RANGE: 720
};

const rand = (a, b) => a + Math.random() * (b - a);
const img = (src) => { const i = new Image(); i.src = src; return i; };
const ready = (i) => i && i.complete && i.naturalWidth > 0;

// ---------------------------------------------------------------------------
// Story lines (s: speaker, t: text, g: gesture frame)
// ---------------------------------------------------------------------------
const L_ARRIVE = [
  { s: 'kali', p: 6, g: 4, t: 'The Red Fort, Rakti. The last relic waits inside these walls: my own mala of skulls. Your father\'s trail ends here too.' }
];
const L_DOUBT = [
  { s: 'rakti', p: 3, g: 3, t: 'That\'s it? Maa Kali\'s mala, just sitting here by the gate, with no one guarding it?' },
  { s: 'rakti', p: 4, g: 4, t: 'Every other relic was buried behind traps and Asura. This is too easy. Something is wrong.' },
  { s: 'kali', p: 7, g: 1, t: 'Then trust that feeling, Rakti, and take it anyway. Whatever waits in this fort, you will need my mala to face it.' }
];
const L_MALA = [
  { s: 'kali', p: 6, g: 6, t: 'My mala is yours now. In my form [X] you no longer only leap: strike, and you will hurl my light as golden orbs.' },
  { s: 'kali', p: 7, g: 1, t: 'But my form is no longer free. Every blow you land with your own talwar or the Trishul feeds it. When the bar is full, call me.' },
  { s: 'rakti', p: 1, g: 2, focus: 'father', t: 'Wait... someone is standing on the throne at the end of the wall.' }
];
// father portraits: lines pick a still frame with p (see PORTRAIT_FRAMES in engine.js); g is the old father2 index,
// 13 / 14 / 15 anger (possessed)
const L_FATHER = [
  { s: 'rakti', p: 10, g: 3, focus: 'meet', t: 'Pitaji? PITAJI! It\'s me, Rakti! I followed your trail through every realm...' },
  { s: 'father', p: 11, g: 0, focus: 'meet', t: 'Rakti. You brought me the mala. Good girl.' },
  { s: 'rakti', p: 2, g: 3, focus: 'meet', t: 'What is wrong with your eyes? Pitaji, it\'s me!' },
  { s: 'father', p: 1, g: 15, focus: 'meet', t: 'Your father is not here any more. Put the mala down, child... or I will tear it from your hands.' },
  { s: 'kali', p: 2, g: 4, focus: 'meet', t: 'That voice is not his! Something is wearing him, Rakti. Defend yourself, and do not let it near my mala!' }
];
const L_TURN = [
  { s: 'rakti', p: 9, g: 3, t: 'Pitaji! Stop, please! I don\'t want to hurt you!' },
  { s: 'demon', p: 10, g: 2, t: 'Your father broke the day he reached for my mala. This body is MINE now, girl!' },
  { s: 'demon', p: 6, g: 1, t: 'Hand me the last relic, and I will let the rift swallow every realm you love.' },
  { s: 'kali', p: 11, g: 1, t: 'Strike the demon, not the man, Rakti! Burn it out of him with my light!' }
];
const L_FREED = [
  { s: 'father', p: 2, g: 11, t: 'Rakti...? Is it really you? I couldn\'t fight it. I heard every word it said with my mouth.' },
  { s: 'rakti', p: 8, g: 2, t: 'It\'s over, Pitaji. Maa Kali brought me all the way here. I\'m taking you home.' },
  { s: 'father', p: 5, g: 12, t: 'My brave girl. Four realms... for your foolish old father.' },
  { s: 'father', p: 6, g: 10, t: 'Come here, beti.' },
  { s: 'kali', p: 5, g: 7, t: 'The four relics are whole again, and the rift is closing. Go home together, both of you.' }
];

// ---------------------------------------------------------------------------
// An archer in one of the parapet's embrasures
// ---------------------------------------------------------------------------
class FortArcher {
  constructor(win) {
    this.id = `fort_${win.id}`;
    this.win = win;
    this.x = win.x;
    this.baseY = win.sill + ARCHER_ART.footDrop;
    this.y = this.baseY;
    this.hitHeight = 32;
    this.hitHalfW = 13;
    this.maxHp = L4_CONFIG.ARCHER_HP;
    this.reset();
  }

  reset() {
    this.hp = this.maxHp;
    this.alive = true;
    this.hidden = true;
    this.removed = false;
    this.state = 'hidden';            // hidden | rise | ready | aim | hurt | dying
    this.timer = 0;
    this.spawnDelay = Infinity;
    this.cooldown = 1;
    this.cooldownRange = [3, 4.5];
    this.frame = 0;
    this.animTimer = 0;
    this.facing = 'left';
    this.rise = 0;
    this.fade = 1;
    this.hitFlash = 0;
    this.hitCooldown = 0;
    this.sparks = [];
  }

  summon(delay, cooldownRange) {
    this.reset();
    this.spawnDelay = delay;
    this.cooldownRange = cooldownRange;
  }

  /** The archers flee (end of the fight): they sink back into the dark. */
  dismiss() {
    if (this.hidden || this.removed || !this.alive) { this.hidden = true; this.removed = true; return; }
    this.alive = false;
    this.state = 'dying';
    this.timer = 0;
  }

  takeHit(damage, fromX, level = null, source = null) {
    if (!this.alive || this.hidden || this.hitCooldown > 0) return false;
    Sfx.play('hit');
    const dealt = Math.min(damage, this.hp);
    this.hp = Math.max(0, this.hp - damage);
    this.hitFlash = 0.25;
    this.hitCooldown = 0.3;
    this.burst(10);
    level?.onArcherDamage?.(dealt, source);
    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dying';
      this.timer = 0;
      level?.registerKill(this);
      return true;
    }
    this.state = 'hurt';
    this.timer = 0.32;
    return false;
  }

  burst(n) {
    for (let i = 0; i < n; i++) {
      this.sparks.push({
        x: this.x + (Math.random() - 0.5) * 14, y: this.baseY - 22 + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 90, vy: -20 - Math.random() * 60, life: 0.4, maxLife: 0.4, size: 1.5 + Math.random() * 1.6,
        color: Math.random() > 0.4 ? '#ffd700' : '#ff2244'
      });
    }
  }

  fire(player, level) {
    const dir = this.facing === 'left' ? -1 : 1;
    const ox = this.x + dir * ARCHER_ART.muzzle[0];
    const oy = this.baseY + ARCHER_ART.muzzle[1];
    const arrow = new Arrow(ox, oy, this);
    arrow.width = ARCHER_ART.arrowW;
    arrow.height = ARCHER_ART.arrowH;
    arrow.damage = L4_CONFIG.ARROW_DAMAGE;
    const tx = player ? player.x : ox + dir * 100;
    const ty = player ? player.y - 25 : oy + 100;
    arrow.release(L4_CONFIG.ARROW_SPEED, Math.atan2(ty - oy, tx - ox));
    level.arrows.push(arrow);
    level.burst(ox, oy, 5, ['#ffd700', '#ff9d3a', '#fff1b0'], 60, 0.3);
  }

  update(dt, player, level, paused) {
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt;
      if (p.life <= 0) this.sparks.splice(i, 1);
    }
    if (this.state === 'dying') {
      this.timer += dt;
      this.rise = Math.max(0, 1 - this.timer / 1.2);
      this.fade = Math.max(0, 1 - this.timer / 1.2);
      if (this.timer >= 1.2) this.removed = true;
      return;
    }
    if (this.removed || paused) return;
    if (player) this.facing = player.x < this.x ? 'left' : 'right';

    switch (this.state) {
      case 'hidden':
        this.spawnDelay -= dt;
        if (this.spawnDelay <= 0) {
          this.state = 'rise';
          this.timer = 0;
          this.hidden = false;
          level.burst(this.x, this.win.sill - 8, 8, ['#6b2a14', '#a24a24', '#ffb86b'], 40, 0.5);
        }
        break;
      case 'rise':
        this.timer += dt;
        this.rise = Math.min(1, this.timer / 0.8);
        if (this.rise >= 1) { this.state = 'ready'; this.cooldown = rand(0.8, 1.8); }
        break;
      case 'ready': {
        this.animTimer += dt;
        const inRange = player && !player.isDead && Math.abs(player.x - this.x) <= L4_CONFIG.FIRE_RANGE;
        this.cooldown -= dt;
        if (this.cooldown <= 0 && inRange) { this.state = 'aim'; this.frame = 0; this.animTimer = 0; }
        break;
      }
      case 'aim':
        this.animTimer += dt;
        if (this.animTimer >= 0.12) {
          this.animTimer = 0;
          this.frame++;
          if (this.frame === 4) this.fire(player, level);
          if (this.frame >= 6) { this.state = 'ready'; this.frame = 0; this.cooldown = rand(this.cooldownRange[0], this.cooldownRange[1]); }
        }
        break;
      case 'hurt':
        this.timer -= dt;
        if (this.timer <= 0) { this.state = 'ready'; this.cooldown = rand(0.8, 1.6); }
        break;
    }
  }

  render(ctx, art) {
    if (this.hidden || this.removed) return;
    let frameImg;
    if (this.state === 'dying') frameImg = art.die[Math.min(2, Math.floor(this.timer / 0.35))];
    else if (this.state === 'hurt') frameImg = art.hurt[Math.floor(this.timer * 10) % 2];
    else if (this.state === 'aim') frameImg = art.aim[Math.min(5, this.frame)];
    else frameImg = art.idle[Math.floor(this.animTimer * 4) % art.idle.length];
    if (!ready(frameImg)) return;
    const A = ARCHER_ART, dir = this.facing === 'left' ? -1 : 1;
    const y = this.baseY + (1 - this.rise) * A.rise;
    ctx.save();
    ctx.globalAlpha = this.fade;
    ctx.translate(this.x, y);
    ctx.scale(dir, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(frameImg, -A.anchorX * A.scale, -A.anchorY * A.scale, A.frameW * A.scale, A.frameH * A.scale);
    if (this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, this.hitFlash * 4) * 0.7;
      ctx.drawImage(frameImg, -A.anchorX * A.scale, -A.anchorY * A.scale, A.frameW * A.scale, A.frameH * A.scale);
    }
    ctx.restore();
    if (this.state === 'aim' && this.frame >= 1 && this.frame <= 3) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(this.x, this.win.sill - 16, 2, this.x, this.win.sill - 16, 16);
      g.addColorStop(0, 'rgba(255,120,60,0.5)');
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(this.x - 18, this.win.sill - 34, 36, 36);
      ctx.restore();
    }
  }

  renderBar(ctx) {
    if (this.hidden || this.removed || !this.alive || this.hp >= this.maxHp) return;
    const w = 22, x = this.x - w / 2, y = this.win.strip.y - 5;
    ctx.save();
    ctx.fillStyle = 'rgba(20,6,4,0.85)';
    ctx.fillRect(x - 1, y - 1, w + 2, 5);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(x, y, w * (this.hp / this.maxHp), 3);
    ctx.restore();
  }

  renderSparks(ctx) {
    for (const p of this.sparks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// The level
// ---------------------------------------------------------------------------
export class Level4 {
  constructor() {
    this.levelIndex = 4;
    this.width = WORLD_W;
    this.height = Math.round(SCREEN_H);
    this.deathY = 900;
    this.floorY = FLOOR_Y;
    this.arenaMin = ARENA_MIN;
    this.arenaMax = ARENA_MAX;

    this.bgImg = img('assets/level4/fort_panorama.jpg');      // fort_a.jpg / fort_b.jpg are kept as the sources
    this.ledgeImg = img(LEDGE_ART.src);
    this.malaImg = img('assets/level4/sprites/mala.png');
    this.parapetImg = img(PARAPET.src);
    this.parapetBackImg = img(PARAPET.backSrc);
    this.throneImg = img(THRONE.src);
    this.shrineImg = img(SHRINE.src);
    this.arrowImg = img('assets/anims/archer_arrow.png');
    this.hugImgs = Array.from({ length: 12 }, (_, i) => img(`assets/level4/sprites/hug_${i}.png`));
    const frames = (name, n) => Array.from({ length: n }, (_, i) => img(`${ARCHER_ART.dir}${name}_${i}.png`));
    const aim = frames('aim', 6);
    this.art = { aim, idle: [aim[0], aim[0], aim[5], aim[5]], hurt: frames('hurt', 2), die: frames('die', 3) };

    this.platforms = [
      { id: 'floor', x1: 0, x2: WORLD_W, y: FLOOR_Y, oneWay: false },
      { id: 'throne_dais', x1: THRONE_DAIS.x1, x2: THRONE_DAIS.x2, y: THRONE_DAIS.y, oneWay: true },
      { id: 'throne_seat', x1: THRONE_SEAT.x1, x2: THRONE_SEAT.x2, y: THRONE_SEAT.y, oneWay: true },
      ...LEDGES.map((l, i) => ({ id: 'ledge' + i, x1: l.x1 + 8, x2: l.x2 - 8, y: l.y, oneWay: true }))   // none now
    ];
    this.ladders = [];
    this.archers = WINDOWS.map((w) => new FortArcher(w));
    this.boss = new FatherBoss(this, FATHER_HOME.x, FATHER_HOME.y);
    this.artCache = new Map();
    this.cameraShake = 0;
    this.killToastText = '';
    this.killToastTimer = 0;
    this.pendingDialogue = null;
    this.freshStart();
    this.reset();
  }

  /** Arriving from another level (or the [P] test key): the whole story from the portal. */
  freshStart() {
    this.arrived = false;       // the portal intro has played
    this.doubtTalked = false;
    this.malaTaken = false;
    this.fatherTalked = false;
    this.meetWalk = false;
    this.fightStage = 0;        // 0 before the fight, 1 father, 2 the Asura, 3 over
    this.waveIndex = 0;         // archer waves already started
    this.ending = null;
    this.completed = false;
    this.malaFly = 0;
  }

  /** Back after a death: progress stays; the current boss stage and archer wave start over. */
  reset() {
    this.arrows = [];
    this.particles = [];
    this.cameraShake = 0;
    this.killToastTimer = 0;
    this.pendingDialogue = null;
    this.cutscene = null;
    this.screenFade = 0;
    this.intro = this.arrived ? null : { t: 0 };
    for (const a of this.archers) a.reset();
    this.waveTimer = -1;
    this.waveLive = false;
    if (this.fightStage === 1) {
      // the father waits on his throne again and leaps down a moment after Rakti returns
      this.boss.reset(1);
      this.boss.alpha = 1;
      this.boss.state = 'throne';
      this.cutscene = { kind: 'relaunch', t: 0 };
      this.waveIndex = Math.max(0, this.waveIndex - 1);
    } else if (this.fightStage === 2) {
      this.boss.reset(2);
      this.boss.state = 'hidden';
      this.cutscene = { kind: 'relaunch2', t: 0 };
      this.waveIndex = Math.max(0, this.waveIndex - 1);
    } else {
      this.boss.reset(1);
      if (this.malaTaken) this.boss.alpha = 1;
    }
  }

  get introPending() { return !this.arrived; }

  getRespawnPoint() {
    if (this.fightStage >= 1) return { x: FIGHT_SPOT.rakti, y: FLOOR_Y };
    if (this.malaTaken) return { x: SHRINE.x + 90, y: FLOOR_Y };
    return { x: PORTAL.x + 85, y: FLOOR_Y };
  }

  /** Engine hook on every (re)spawn: the mala's powers stay with her once taken. */
  onPlayerSpawn(player) {
    this.player = player;
    if (this.malaTaken) this.grantMala(player, false);
    if (this.fightStage >= 1) { player.facing = 'right'; player.divineCharge = Math.max(player.divineCharge, 0.5); }
  }

  grantMala(player, fresh) {
    player.kaliOrbs = true;
    player.chargeMode = true;
    player.divineDuration = 10;
    if (fresh) player.divineCharge = 1;      // the first call is a gift, to learn the orbs
  }

  // ------------------------------------------------------------ helpers used by arrows / the player
  isSolidPoint(x, y) { return y >= FLOOR_Y - 2; }

  getDamageables() {
    const list = this.archers.filter((a) => a.alive && !a.hidden && !a.removed);
    if (this.boss.fighting) list.push(this.boss);
    return list;
  }

  shake(v) { this.cameraShake = Math.max(this.cameraShake, v); }

  burst(x, y, count, colors, speed = 80, life = 0.4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life: life * (0.6 + Math.random() * 0.6), maxLife: life,
        size: 1.5 + Math.random() * 2, color: colors[i % colors.length] });
    }
  }

  toast(text, secs = 2.4) { this.killToastText = text; this.killToastTimer = secs; }

  /** Damage Rakti deals with blade / Trishul feeds Kali's charge (the orbs themselves do not). */
  onArcherDamage(dealt, source) { if (source !== 'orb') this.player?.addCharge?.(dealt); }
  onBossDamage(dealt, source) { if (source !== 'orb') this.player?.addCharge?.(dealt); }

  registerKill() {
    const pending = this.archers.filter((a) => this.isWaveMember(a) && a.alive).length;
    this.shake(0.3);
    this.toast(pending > 0 ? `ARCHER DOWN  ·  ${pending} LEFT` : `VOLLEY ${this.waveIndex} BROKEN`, 1.6);
  }

  isWaveMember(a) {
    return this.waveIndex > 0 && L4_CONFIG.WAVES[this.waveIndex - 1].windows.includes(a.win.id);
  }

  startWave() {
    if (this.waveIndex >= L4_CONFIG.WAVES.length) return;
    this.waveIndex++;
    const cfg = L4_CONFIG.WAVES[this.waveIndex - 1];
    cfg.windows.forEach((id, i) => this.archers[id].summon(0.4 + i * cfg.stagger, cfg.cooldown));
    this.waveLive = true;
    this.toast(`ARCHERS ON THE WALL  ·  WAVE ${this.waveIndex} OF ${L4_CONFIG.WAVES.length}`, 2.2);
  }

  updateWaves(dt) {
    if (this.fightStage < 1 || this.fightStage > 2 || this.cutscene) return;
    if (this.waveLive) {
      if (!this.archers.some((a) => this.isWaveMember(a) && a.alive)) { this.waveLive = false; this.waveTimer = L4_CONFIG.WAVE_BREAK; }
    } else if (this.waveIndex < L4_CONFIG.WAVES.length) {
      if (this.waveTimer < 0) this.waveTimer = this.waveIndex === 0 ? 1.2 : L4_CONFIG.WAVE_BREAK;
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) { this.waveTimer = -1; this.startWave(); }
    }
  }

  // ------------------------------------------------------------ platform queries (the Level API)
  checkPlatformLanding(prevY, currY, x, dropping = false) {
    for (const p of this.platforms) {
      if (p.oneWay && dropping) continue;
      if (x < p.x1 || x > p.x2) continue;
      if (prevY <= p.y + 6 && currY >= p.y - 2) return { id: p.id, y: p.y, oneWay: p.oneWay };
    }
    return null;
  }

  isOnPlatform(x, y) {
    return this.platforms.find((p) => x >= p.x1 - 2 && x <= p.x2 + 2 && Math.abs(y - p.y) <= 4) || null;
  }

  /** The whole courtyard is open; only the map's two ends stop her. */
  resolvePitWallCollision(x) {
    return Math.max(30, Math.min(x, WORLD_W - 30));
  }

  // ------------------------------------------------------------ the story
  conversation(lines, onDone = null, locked = false) {
    this.pendingDialogue = { lines, onDone, whenLocked: locked };
  }

  takeMala() {
    if (this.malaTaken) return;
    this.malaTaken = true;
    this.shake(0.6);
    this.burst(SHRINE.x, SHRINE.top - 14, 40, ['#ffd36b', '#ffffff', '#ff4d4d'], 140, 0.9);
    this.toast('☠ KALI\'S SKULL MALA ☠', 2.6);
    this.malaFly = 0.0001;
    if (this.player) this.grantMala(this.player, true);
    this.boss.appearOnThrone();
    this.conversation(L_MALA);
  }

  startFight() {
    this.fightStage = 1;
    this.boss.facing = 'left';
    this.boss.leapDown();
    Sfx.play('boss_gong');
    this.waveIndex = 0;
    this.waveTimer = 1.2;
    this.toast('⚔ PITAJI ATTACKS ⚔', 2.2);
  }

  /** Stage 1 done (the father thrown down) or stage 2 done (the Asura burnt out). */
  onBossStageOver(stage) {
    this.arrows = [];
    if (stage === 1) {
      this.boss.fall();
      this.cutscene = { kind: 'turn', t: 0 };
      this.shake(0.8);
    } else {
      this.fightStage = 3;
      this.boss.defeat();
      for (const a of this.archers) a.dismiss();
      this.cutscene = { kind: 'end', t: 0 };
      this.shake(1);
      this.toast('✦ THE ASURA IS BROKEN ✦', 3);
      if (this.player?.isDivine) this.player.divineTimer = 0;
    }
  }

  updateStory(dt, player) {
    const P = player;
    // 1. arriving through the portal
    if (this.intro) {
      const it = this.intro;
      it.t += dt;
      P.inputLocked = true;
      P.facing = 'right';
      if (it.t < 0.1) { P.x = PORTAL.x; P.y = FLOOR_Y; }
      P.spawnAlpha = Math.max(0, Math.min(1, (it.t - 0.5) / 0.5));
      if (it.t > 0.3 && it.t < 1.1 && Math.random() < 0.8) this.burst(PORTAL.x + rand(-14, 14), FLOOR_Y - rand(10, 80), 1, ['#7ff6ff', '#ffffff', '#3ad6e0'], 50, 0.6);
      if (it.t >= 0.95 && !it.walking) { it.walking = true; P.autoWalkX = PORTAL.x + 90; P.autoWalkSpeed = 110; }
      if (it.walking && P.autoWalkX == null) {
        this.intro = null;
        this.arrived = true;
        P.inputLocked = false;
        P.spawnAlpha = 1;
        this.conversation(L_ARRIVE);
      }
      return;
    }
    // 2. the shrine: Rakti's doubt
    if (!this.doubtTalked && Math.abs(P.x - SHRINE.x) < 150 && P.isGrounded) {
      // she stops in front of it
      this.doubtTalked = true;
      P.inputLocked = true;
      P.vx = 0;
      P.facing = P.x < SHRINE.x ? 'right' : 'left';
      this.conversation(L_DOUBT, () => { P.inputLocked = false; }, true);
    }
    // 3. the throne: her father
    if (this.malaTaken && !this.fatherTalked && !this.meetWalk && P.x > THRONE.x - 340 && P.isGrounded && !this.pendingDialogue) {
      // she walks up to the foot of the throne, then they talk (the camera frames the two of them)
      this.meetWalk = true;
      P.inputLocked = true;
      P.autoWalkX = this.boss.x - 300;
      P.autoWalkSpeed = 120;
    }
    if (this.meetWalk && !this.fatherTalked && P.autoWalkX == null) {
      this.fatherTalked = true;
      P.facing = 'right';
      this.conversation(L_FATHER, () => { P.inputLocked = false; this.startFight(); }, true);
    }
    // 4. cut-scenes inside the fight
    const cs = this.cutscene;
    if (!cs) return;
    cs.t += dt;
    if (cs.kind === 'relaunch' && cs.t > 1.2) { this.cutscene = null; this.boss.leapDown(); }
    if (cs.kind === 'relaunch2' && cs.t > 0.6) {
      this.cutscene = null;
      this.boss.x = P.x < WORLD_W / 2 ? Math.min(ARENA_MAX - 60, P.x + 380) : Math.max(ARENA_MIN + 60, P.x - 380);
      this.boss.y = FLOOR_Y;
      this.boss.state = 'walk';
      Object.assign(this.boss.cd, { attack: 1.6, slam: 2.5, blast: 3, fly: 6 });   // a moment of grace after she returns
      this.burst(this.boss.x, FLOOR_Y - 50, 30, ['#9b4dff', '#3d0a6e', '#ffffff'], 140, 0.7);
      this.shake(0.5);
    }
    if (cs.kind === 'turn') {
      // the father falls -> fade out -> both are set apart in the middle of the courtyard -> fade in ->
      // the Asura tears out of him -> it speaks -> stage 2
      P.inputLocked = true;
      const T_OUT = 1.0, T_SET = 1.55, T_IN = 2.1;
      if (cs.t > T_OUT && cs.t < T_SET) this.screenFade = Math.min(1, (cs.t - T_OUT) / 0.5);
      if (cs.t >= T_SET && !cs.placed) {
        cs.placed = true;
        this.screenFade = 1;
        this.arrows = [];
        this.placeForScene(P, FIGHT_SPOT.rakti, FIGHT_SPOT.boss);
        this.boss.transform();
      }
      if (cs.placed && cs.t < T_IN + 0.5) this.screenFade = Math.max(0, 1 - (cs.t - T_IN) / 0.5);
      if (cs.t > T_IN + 0.3 && this.boss.state === 'transform' && this.boss.anim > 0.3 && this.boss.anim < 0.4) this.shake(0.9);
      if (cs.t > T_IN + 2.6 && !cs.talked) {
        cs.talked = true;
        this.conversation(L_TURN, () => {
          P.inputLocked = false;
          this.fightStage = 2;
          this.boss.startStage2();
          this.cutscene = null;
          this.toast('⚔ THE ASURA RISES ⚔', 2.2);
        }, true);
      }
    }
    if (cs.kind === 'end') {
      // the Asura burns away -> he stands as himself -> fade out -> the two of them set together -> fade in ->
      // they talk -> the embrace plays -> the level ends
      P.inputLocked = true;
      const T_OUT = 4.0, T_SET = 4.6, T_IN = 5.0;
      if (cs.t > 3.4 && this.boss.state === 'defeat') this.boss.state = 'freed';
      if (cs.t > T_OUT && cs.t < T_SET) this.screenFade = Math.min(1, (cs.t - T_OUT) / 0.6);
      if (cs.t >= T_SET && !cs.placed) {
        cs.placed = true;
        this.screenFade = 1;
        this.arrows = [];
        this.hugX = HUG_X;
        this.placeForScene(P, HUG_X - 70, HUG_X);
        P.spawnAlpha = 0;                      // the hug frames draw both of them
        this.boss.state = 'hidden';
        this.ending = { t: 0, hold: true };
      }
      if (cs.placed && cs.t < T_IN + 0.6) this.screenFade = Math.max(0, 1 - (cs.t - T_IN) / 0.6);
      if (cs.t > T_IN + 0.9 && !cs.talked) {
        cs.talked = true;
        this.conversation(L_FREED, () => { this.ending.hold = false; this.ending.t = 0; }, true);
      }
    }
  }

  /** Puts Rakti and the boss at fixed spots for a scene, facing each other, with the camera snapped there. */
  placeForScene(P, raktiX, bossX) {
    Object.assign(P, { x: raktiX, y: FLOOR_Y, vx: 0, vy: 0, isGrounded: true, currentPlatform: null, facing: bossX > raktiX ? 'right' : 'left', autoWalkX: null });
    // no swing, queued swing or slash arc carries over into the scene
    Object.assign(P, { isAttacking: false, attackQueued: false, attackFrame: 0 });
    if (P.slashes) P.slashes.length = 0;
    if (P.isDivine) P.divineTimer = 0;
    this.boss.x = bossX;
    this.boss.y = FLOOR_Y;
    this.boss.facing = raktiX < bossX ? 'left' : 'right';
    this.boss.waves = [];
    this.boss.spikes = [];
    this.snapCamera = true;
  }

  /** Engine hook: what the camera looks at (null = Rakti). */
  cameraFocus(line) {
    const P = this.player;
    if (!P) return null;
    const midY = SCREEN_H / 2;
    // Pitaji left of centre (clear of the speaker portraits), Rakti at the left edge of the frame
    if (line?.focus === 'father' || line?.focus === 'meet' || (this.meetWalk && !this.fightStage)) return { x: this.boss.x + 70, y: midY };
    const cs = this.cutscene;
    if (cs && cs.kind === 'turn' && cs.placed) return { x: (FIGHT_SPOT.rakti + FIGHT_SPOT.boss) / 2, y: midY };
    if (this.ending || (cs && cs.kind === 'end')) return { x: this.ending ? HUG_X - 30 : (P.x + this.boss.x) / 2, y: midY };
    return null;
  }

  // ------------------------------------------------------------ per-frame update
  update(playerX, playerY, dt, isDivine, player) {
    this.player = player;
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2.0);
    if (this.killToastTimer > 0) this.killToastTimer -= dt;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    if (!player) return;
    const paused = Boolean(player.dialogueOpen);
    if (!paused) this.updateStory(dt, player);
    if (this.ending) {
      if (!this.ending.hold) this.ending.t += dt;
      if (!this.ending.hold && Math.random() < 0.3) this.burst(HUG_X - 30 + rand(-60, 60), FLOOR_Y - rand(40, 160), 2, ['#ffd700', '#fff1b0', '#ff9d3a'], 40, 1);
    }
    if (this.malaFly > 0 && this.malaFly < 1) this.malaFly = Math.min(1, this.malaFly + dt * 1.5);
    const quiet = paused || Boolean(this.cutscene && this.cutscene.kind !== 'relaunch' && this.cutscene.kind !== 'relaunch2');
    if (!paused) this.updateWaves(dt);
    for (const a of this.archers) a.update(dt, player, this, quiet);
    this.boss.update(dt, player, paused);
    if (!quiet) {
      for (let i = this.arrows.length - 1; i >= 0; i--) {
        if (!this.arrows[i].update(dt, player, this)) this.arrows.splice(i, 1);
      }
    }
    if (!this.malaTaken && Math.random() < 0.2) this.burst(SHRINE.x + rand(-14, 14), SHRINE.top - 20 + rand(-6, 6), 1, ['#ffd36b', '#fff1b0', '#ff4d4d'], 20, 0.9);
  }

  // ------------------------------------------------------------ interaction / HUD
  getNearbyInteractable(px, py) {
    if (!this.malaTaken && this.doubtTalked && Math.abs(px - SHRINE.x) < 70 && Math.abs(py - FLOOR_Y) < 20) {
      return {
        type: 'inspection', x: SHRINE.x, y: SHRINE.top, prompt: '[E] TAKE KALI\'S SKULL MALA', speaker: 'kali', title: '⚜ THE FOURTH RELIC ⚜',
        text: 'The mala answers your hand, Rakti. Feel my strength wake inside it.',
        onInteract: () => this.takeMala()
      };
    }
    return null;
  }

  /** Surfaces the boss can stand on besides the floor: the throne's dais and seat (he climbs up after Rakti). */
  bossPlatforms() {
    return [THRONE_DAIS, THRONE_SEAT];
  }

  bossHud() {
    if (this.fightStage < 1 || this.fightStage > 2) return null;
    const b = this.boss;
    // Pitaji has 100 HP on his own bar (BOSS.HP .. STAGE2_HP); the Asura's 200 fill the boss bar from full
    if (b.stage === 1) return { ratio: (b.hp - b.stage2Hp) / (b.maxHp - b.stage2Hp), name: 'PITAJI  ·  POSSESSED', father: true };
    return { ratio: b.hp / b.stage2Hp, name: 'THE ASURA', demon: true };
  }

  checkLevelComplete() {
    if (this.completed) return false;
    if (this.ending && !this.ending.hold && this.ending.t > 12 * 0.42 + 2.4) { this.completed = true; return true; }
    return false;
  }

  clearDialoguePending() {}

  // ------------------------------------------------------------ drawing
  cachedArt(key, w, h, isReady, paint) {
    let c = this.artCache.get(key);
    if (c) return c;
    if (!isReady) return null;
    const k = 2;
    c = document.createElement('canvas');
    c.width = Math.ceil(w * k); c.height = Math.ceil(h * k);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.scale(k, k);
    paint(g);
    this.artCache.set(key, c);
    return c;
  }

  renderBackground(ctx) {
    // 1. the fort panorama
    if (ready(this.bgImg)) ctx.drawImage(this.bgImg, 0, 0, WORLD_W, SCREEN_H);
    else { ctx.fillStyle = '#7a2d12'; ctx.fillRect(0, 0, WORLD_W, SCREEN_H); }
    this.renderPortalGlow(ctx);

    // 2. dark chambers behind the openings -> archers -> the carved parapets
    const pw = PARAPET.imgW * PARAPET.scale, ph = PARAPET.imgH * PARAPET.scale;
    for (const s of STRIPS) if (ready(this.parapetBackImg)) ctx.drawImage(this.parapetBackImg, s.x, s.y, pw, ph);
    for (const a of this.archers) a.render(ctx, this.art);
    for (const s of STRIPS) if (ready(this.parapetImg)) ctx.drawImage(this.parapetImg, s.x, s.y, pw, ph);
    for (const a of this.archers) a.renderBar(ctx);
    for (const a of this.archers) a.renderSparks(ctx);

    // 3. the throne and the shrine
    if (ready(this.throneImg)) ctx.drawImage(this.throneImg, THRONE.x, THRONE.y, THRONE.w * THRONE.k, THRONE.h * THRONE.k);
    if (ready(this.shrineImg)) ctx.drawImage(this.shrineImg, SHRINE.x - SHRINE.drawW / 2, SHRINE.top, SHRINE.drawW, SHRINE.h * SHRINE.k);
    this.renderMala(ctx);
    // raised stone ledges
    if (ready(this.ledgeImg)) {
      for (const l of LEDGES) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#2a0c04';
        ctx.beginPath();
        ctx.ellipse((l.x1 + l.x2) / 2, FLOOR_Y + 2, (l.x2 - l.x1) * 0.42, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.drawImage(this.ledgeImg, l.x1, l.y - LEDGE_ART.deck, LEDGE_ART.w, LEDGE_ART.h);
      }
    }

    // 4. the boss (or the reunion)
    if (this.ending) this.renderHug(ctx);
    else this.boss.render(ctx);
  }

  /** Drawn over Rakti: projectiles, spikes, sparks. */
  renderForeground(ctx) {
    this.boss.renderEffects(ctx);
    for (const arrow of this.arrows) arrow.render(ctx, this.arrowImg);
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (this.ending && this.ending.t > 5) {
      // a warm light settles over the reunion
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const a = Math.min(1, (this.ending.t - 5) / 2) * 0.35;
      const g = ctx.createRadialGradient(HUG_X - 20, FLOOR_Y - 50, 10, HUG_X - 20, FLOOR_Y - 50, 220);
      g.addColorStop(0, `rgba(255, 220, 140, ${a})`);
      g.addColorStop(1, 'rgba(255, 160, 60, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(HUG_X - 260, FLOOR_Y - 280, 520, 330);
      ctx.restore();
    }
  }

  renderPortalGlow(ctx) {
    const t = performance.now() / 1000;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flare = this.intro ? Math.max(0, 1 - Math.abs(this.intro.t - 0.6) / 0.6) : 0;
    const g = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 6, PORTAL.x, PORTAL.y, 90);
    g.addColorStop(0, `rgba(120, 250, 255, ${0.12 + 0.06 * Math.sin(t * 2.2) + flare * 0.5})`);
    g.addColorStop(1, 'rgba(40, 180, 220, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(PORTAL.x - 90, PORTAL.y - 120, 180, 240);
    ctx.restore();
  }

  /** Maa Kali's skull mala (assets/level4/sprites/mala.png, 110 x 122 at 2x): it floats over the shrine,
   *  glowing, until Rakti takes it; then it flies into her hands and fades. */
  renderMala(ctx) {
    if (this.malaTaken && this.malaFly >= 1) return;
    const t = performance.now() / 1000;
    const w = 46, h = 51;
    let x = SHRINE.x, y = SHRINE.top - 30 + Math.sin(t * 2.2) * 2.5, a = 1, k = 1;
    if (this.malaTaken && this.player) {
      const u = this.malaFly, e = u * u * (3 - 2 * u);
      x += (this.player.x - x) * e;
      y += (this.player.y - 45 - y) * e - Math.sin(u * Math.PI) * 30;
      a = 1 - u * u;
      k = 1 - 0.4 * u;
    }
    if (!this.malaTaken) drawShrineBeacon(ctx, { x: SHRINE.x, baseY: SHRINE.top + 4, relicY: y, relicH: h, t, rgb: '255, 120, 90', shaftH: 110 });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 2, x, y, 44);
    g.addColorStop(0, `rgba(255, 200, 110, ${(0.42 + 0.15 * Math.sin(t * 3)) * a})`);
    g.addColorStop(0.5, `rgba(255, 60, 60, ${0.16 * a})`);
    g.addColorStop(1, 'rgba(255, 60, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 44, y - 44, 88, 88);
    ctx.restore();
    if (!ready(this.malaImg)) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.malaImg, x - (w * k) / 2, y - (h * k) / 2, w * k, h * k);
    ctx.restore();
  }

  renderHug(ctx) {
    const e = this.ending, i = e.hold ? 0 : Math.min(11, Math.floor(e.t / 0.42));
    const im = this.hugImgs[i];
    if (!ready(im)) return;
    // the frames are anchored on her father's feet (stored at 2x)
    const k = 0.5 * 1.1;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(im, HUG_X - 149 * k, FLOOR_Y + 2 - 158.7 * k, 203 * k, 161 * k);
  }

  render(ctx) { this.renderBackground(ctx); }
}
