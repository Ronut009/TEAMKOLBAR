/**
 * ==========================================================================
 * LEVEL 3: THE JUNGLE (js/levels/level3.js)
 * Built like Level 2: the map is cut into short floor chunks (about 450-550 px each) with a pit between
 * every two, about as long as Level 2 overall. Background screens, a shared floor strip (PlatformArt
 * 'jungle'), data-driven floors / pits / pillars, Betal swordsmen, a relic and a door at the end.
 *   Home field -> pit on two pillars -> chunk -> pit with a stepping ledge -> chunk ->
 *   WIDE chasm: leap onto the high ledge as Kali [X], cross the golden bridge -> chunk ->
 *   pit on two pillars -> final chunk. The sealed forest door waits at the end of the map from the start.
 * Hazards (no spike packs of four any more): jungle spikes in packs of two on a timer, and single
 * jungle vines that rise and sink, and spin at anyone who comes near. Only the sword destroys a vine.
 *   Slay every Betal -> the Forest Heart awakens at the start (an arrow guides Rakti back) -> [E] take it ->
 *   carry it to the door -> [E] offer it -> the door opens -> walk through to Level 4.
 * The old horde level is kept in js/level3.js as a backup.
 * ==========================================================================
 */

import { PlatformArt } from '../render/platformArt.js';
import { Betal } from '../entities/betal.js';
import { EnemySpriteSheet } from '../entities/enemySprites.js';

// Backgrounds are 2000 x 585 (dark bottom band cropped). The moss floor line sits at image y = 522.
const BG_SCALE = 368 / 522;
const SCREEN_W = 2000 * BG_SCALE;      // ~1410 world px per screen
const SCREEN_H = 585 * BG_SCALE;       // ~412
const FLOOR_Y = 368;
const FEATHER = 240 * BG_SCALE;        // image px faded in at each screen's left edge
const X = (screen, imageX = 0) => screen * (SCREEN_W - FEATHER) + imageX * BG_SCALE;

// Pillar art reused from Level 1 (assets/level1/pillar_tall.png) until jungle pillars exist
const PILLAR_ART = { tall: { src: 'assets/level1/pillar_tall.png', w: 329, h: 735, surface: 10 } };
const PIT_PILLAR_SCALE = 0.24;

// Jungle spikes (assets/level3/jungle_spike.png): 24 frames, 8 per row, each frame two near-identical variants
// (0/1, 2/3 ...). A pack is two spikes side by side, the second drawn with the partner variant.
const JSPIKE_ART = { src: 'assets/level3/jungle_spike.png', cw: 230, ch: 390, cols: 8, ground: 387, scale: 0.26 };
const JSPIKE_HEIGHT = [70, 69, 127, 129, 71, 74, 172, 168, 234, 237, 302, 301, 353, 353, 385, 386, 217, 218, 172, 173, 141, 140, 72, 73];
const JSPIKE_DORMANT = [0, 1], JSPIKE_WARN = [2, 6], JSPIKE_RISE = [8, 10, 12, 14], JSPIKE_HOLD = [14, 15], JSPIKE_FALL = [16, 18, 20, 22];
const SPIKE_SPACING = 46;
const SPIKE_PACK_W = SPIKE_SPACING * 2;
const SPIKE_CYCLE = 6;
const SPIKE_DAMAGE = 4;
// Jungle vines: sheet A (27 frames, 9 per row) rises, sways and sinks; sheet B (19 frames, 10 per row) is the
// attack: grows (0-5), spins (6-13), settles and sinks (14-18).
const VINE_A = { src: 'assets/level3/vine_a.png', cw: 206, ch: 281, cols: 9, ground: 278, scale: 0.34 };
const VINE_B = { src: 'assets/level3/vine_b.png', cw: 372, ch: 331, cols: 10, ground: 328, scale: 0.34 };
const VINE_NOTICE = 150;       // she is noticed this close (and roughly level with the vine)
const VINE_HIT = 62;           // the spin reaches this far to either side
const VINE_SWORD_REACH = 72;
const VINE_HP = 10;
const VINE_DAMAGE = 4;
const PIT_DAMAGE = 3;

const BRIDGE_ART = { src: 'assets/level1/golden_bridge_a.png', w: 1200, h: 193, deckY: 40.6 };
// Sprite sheets (assets/level3/, keyed from AI art): heart 5 cols x 2 rows of 225x228 (frames 0-5 idle loop),
// door 7 cols x 2 rows of 326x342 (frame 0 closed .. 6 open, 6-13 swirling portal loop)
const HEART_ART = { src: 'assets/level3/forest_heart.png', cw: 225, ch: 228, cols: 5, idle: 6, scale: 0.6 };
const DOOR_ART = { src: 'assets/level3/forest_door.png', cw: 326, ch: 342, cols: 7, frames: 14, openFrame: 6, scale: 0.4 };
const DOOR_FPS = 9;
const LEDGE_Y = FLOOR_Y - 150;          // 150 px above the floor: Kali's leap (~170) reaches it, a mortal's (~120) does not

export class Level3 {
  constructor() {
    this.levelIndex = 3;
    this.minX = 0;
    this.height = 447;
    this.deathY = 500;
    this.pitDamage = PIT_DAMAGE;
    this.usesScriptedDefeat = false;     // the old horde level ended in a scripted death; this one has normal checkpoints

    const img = (src) => { const i = new Image(); i.src = src; return i; };
    this.bgA = img('assets/level3/jungle_a.jpg');
    this.bgB = img('assets/level3/jungle_b.jpg');
    this.screens = [
      { img: this.bgA, mirror: false }, { img: this.bgB, mirror: false },
      { img: this.bgA, mirror: true }, { img: this.bgB, mirror: true }
    ];
    this.platformArt = new PlatformArt('jungle');
    this.pillarImgs = { tall: img(PILLAR_ART.tall.src) };
    this.spikeSheet = img(JSPIKE_ART.src);
    this.vineAImg = img(VINE_A.src);
    this.vineBImg = img(VINE_B.src);
    this.bridgeImg = img(BRIDGE_ART.src);
    this.enemySprites = new EnemySpriteSheet();
    this.heartImg = img(HEART_ART.src);
    this.doorImg = img(DOOR_ART.src);

    // ------------------------------------------------------------------ floors & pits
    // Short floor chunks with a pit between each pair (the same rhythm as Level 2)
    const END = 4300;
    this.floors = [
      { x1: 0, x2: 560 },                // home field
      { x1: 930, x2: 1450 },
      { x1: 1850, x2: 2370 },
      { x1: 3010, x2: 3470 },
      { x1: 3850, x2: END }              // final chunk, the door at its far end
    ];
    this.pits = [
      { x1: 560, x2: 930 },              // two pillars
      { x1: 1450, x2: 1850 },            // one stepping ledge
      { x1: 2370, x2: 3010 },            // the wide chasm: Kali only
      { x1: 3470, x2: 3850 }             // two pillars
    ];
    this.pillars = [
      { art: 'tall', cx: 645, top: 335, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: 825, top: 305, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: 3555, top: 335, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: 3735, top: 305, scale: PIT_PILLAR_SCALE }
    ];
    // High ledges: two over the chasm (solid for everybody, but only Kali can jump up to the first) and one
    // stepping stone in the middle of the second pit
    this.ledges = [
      { id: 'step_ledge', x1: 1565, x2: 1735, y: FLOOR_Y - 46 },
      { id: 'kali_ledge_a', x1: 2260, x2: 2420, y: LEDGE_Y },
      { id: 'kali_ledge_b', x1: 2980, x2: 3140, y: LEDGE_Y }
    ];
    // The golden bridge joining the two Kali ledges exists (and is drawn) only in Kali form
    this.bridge = { x1: this.ledges[1].x2 - 4, x2: this.ledges[2].x1 + 4, y: LEDGE_Y };

    // Jungle spikes: packs of two, x = left edge of the pack (none placed for now)
    this.spikes = [].map((x, i) => ({ x, phase: i * 1.3 }));
    // Jungle vines: always one at a time
    this.vines = [470, 985, 1290, 2110, 3400, 4010].map((x, i) => ({ x, phase: i * 0.9, state: 'hidden', t: 0, wait: 0.6 + (i % 3) * 0.5, hp: VINE_HP, cool: 0, flash: 0, removed: false }));
    this.fx = [];

    this.checkpoints = [970, 1890, 2310, 3050, 3890];
    this.checkpointIndex = -1;

    this.betals = [
      new Betal(330, 260, 380),
      new Betal(1060, 1000, 1120),
      new Betal(1220, 1160, 1280),
      new Betal(1380, 1320, 1430),
      new Betal(2010, 1940, 2080),
      new Betal(2230, 2160, 2330),
      new Betal(3160, 3100, 3230),
      new Betal(3330, 3260, 3420),
      new Betal(3940, 3880, 4010),
      new Betal(4080, 4020, 4120)
    ];

    // The Forest Heart awakens at the start of the map once every Betal is dead; the door is there from the beginning
    this.relic = { x: 150, collected: false, fly: 0, spawned: false, spawnT: 0 };
    this.clearTimer = 0;
    this.door = { x: 4150, opening: false, openT: 0 };
    this.px = 0; this.py = FLOOR_Y;
    this.width = END;

    this.kaliHintX = 2190;
    this.kaliHintShown = false;
    this.pendingDialogue = null;
    this.artCache = new Map();
    this.artScale = 0;
    this.animTime = 0;
    this.cameraShake = 0;
    this.killToastText = '';
    this.killToastTimer = 0;
    this.screenFade = 0;
    this.isCompleted = false;
  }

  // ======================================================================== state
  reset() {
    this.pendingDialogue = null;
    Object.assign(this.relic, { collected: false, fly: 0, spawned: false, spawnT: 0 });
    this.clearTimer = 0;
    Object.assign(this.door, { opening: false, openT: 0 });
    this.cameraShake = 0;
    this.killToastTimer = 0;
    this.screenFade = 0;
    this.isCompleted = false;
    this.animTime = 0;
    for (const b of this.betals) b.reset();
    for (const v of this.vines) Object.assign(v, { state: 'hidden', t: 0, wait: 0.6 + (v.phase % 3) * 0.5, hp: VINE_HP, cool: 0, flash: 0, removed: false });
    this.fx = [];
  }

  getRespawnPoint() {
    if (this.checkpointIndex >= 0) return { x: this.checkpoints[this.checkpointIndex] + 30, y: FLOOR_Y };
    return { x: 150, y: FLOOR_Y };
  }

  collectRelic(player) {
    if (this.relic.collected || !this.relic.spawned) return false;
    this.relic.collected = true;
    this.relic.fly = 0.0001;
    this.relic.toX = player ? player.x : this.relic.x;
    this.relic.toY = player ? player.y - 40 : FLOOR_Y - 40;
    this.cameraShake = 0.4;
    this.killToastText = '❤ FOREST HEART CLAIMED: TO THE DOOR';
    this.killToastTimer = 2.4;
    return true;
  }

  openDoor() {
    if (this.door.opening || !this.relic.collected) return;
    this.door.opening = true;
    this.door.openT = 0;
    this.cameraShake = 0.6;
  }

  get enemiesLeft() { return this.betals.some((b) => !b.dead); }
  get doorOpenReady() { return this.door.opening && this.door.openT * DOOR_FPS >= DOOR_ART.openFrame + 0.5; }

  // ======================================================================== geometry
  pillarHalf(p) { return PILLAR_ART[p.art].w * p.scale * 0.4; }

  getPlatforms() {
    const list = [];
    for (const f of this.floors) list.push({ id: 'floor', x1: f.x1, x2: f.x2, y: FLOOR_Y, oneWay: false });
    for (const p of this.pillars) {
      const half = this.pillarHalf(p);
      list.push({ id: 'pillar', x1: p.cx - half, x2: p.cx + half, y: Math.round(p.top), oneWay: false });
    }
    for (const l of this.ledges) list.push({ ...l, oneWay: true });
    list.push({ id: 'golden_bridge', x1: this.bridge.x1, x2: this.bridge.x2, y: this.bridge.y, oneWay: true, divineOnly: true });
    return list;
  }

  checkPlatformLanding(prevY, currY, x, droppingThrough = false, isDivine = false) {
    for (const plat of this.getPlatforms()) {
      if (plat.divineOnly && !isDivine) continue;
      if (x < plat.x1 || x > plat.x2) continue;
      if (plat.oneWay && droppingThrough) continue;
      if (prevY <= plat.y + 6 && currY >= plat.y - 2) return plat;
    }
    return null;
  }

  isOnPlatform(x, y, isDivine = false) {
    for (const plat of this.getPlatforms()) {
      if (plat.divineOnly && !isDivine) continue;
      if (x >= plat.x1 - 2 && x <= plat.x2 + 2 && Math.abs(y - plat.y) <= 4) return plat;
    }
    return null;
  }

  resolvePitWallCollision(x, y) {
    x = Math.max(12, x);
    for (const p of this.pillars) {
      const half = this.pillarHalf(p) + 7;
      if (y > p.top + 5 && Math.abs(x - p.cx) < half) x = x < p.cx ? p.cx - half : p.cx + half;
    }
    return x;
  }

  // ======================================================================== interactions
  getNearbyInteractable(px, py) {
    const onFloor = Math.abs(py - FLOOR_Y) < 14;
    if (this.relic.spawned && !this.relic.collected && this.relic.spawnT > 0.8 && Math.abs(px - this.relic.x) < 60 && onFloor) {
      return {
        type: 'relic', x: this.relic.x, y: FLOOR_Y, prompt: '[E] TAKE THE FOREST HEART', title: '⚜ THE FOREST HEART ⚜',
        text: "The Forest Heart, Rakti: the third relic beats with the jungle's own pulse. Carry it to the sealed door at the far end of the forest. Only it will open the way."
      };
    }
    if (!this.door.opening && Math.abs(px - this.door.x) < 70 && onFloor) {
      if (this.relic.collected) {
        return {
          type: 'door_offer', x: this.door.x, y: FLOOR_Y, prompt: '[E] OFFER THE FOREST HEART', speaker: 'kali', title: '⚜ THE FOREST DOOR ⚜',
          text: 'The heart answers the door, Rakti. Walk through when the way is open.',
          onInteract: () => this.openDoor()
        };
      }
      return {
        type: 'inspection', x: this.door.x, y: FLOOR_Y, prompt: '[E] EXAMINE THE DOOR', speaker: 'stele', title: '⚜ THE SEALED DOOR ⚜',
        text: this.enemiesLeft
          ? 'The door is sealed by living roots. Something in the forest still stirs. The guardians must fall first.'
          : 'I need the Forest Heart to open. It has awakened far to the west, where your journey began.'
      };
    }
    return null;
  }

  checkLevelComplete(px, py) {
    if (this.isCompleted || !this.doorOpenReady) return false;
    if (Math.abs(px - this.door.x) < 26 && Math.abs(py - FLOOR_Y) < 8) {
      this.isCompleted = true;
      this.checkpointIndex = -1;      // a replay starts from the home field
      return true;
    }
    return false;
  }

  // ======================================================================== update
  update(playerX, playerY, dt, isDivine = false, player = null) {
    this.animTime += dt;
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2.0);
    if (this.killToastTimer > 0) this.killToastTimer -= dt;

    this.px = playerX; this.py = playerY;
    if (this.relic.collected && this.relic.fly < 1) this.relic.fly = Math.min(1, this.relic.fly + dt * 1.4);
    if (this.relic.spawned) this.relic.spawnT += dt;
    if (this.door.opening) {
      this.door.openT += dt;
      if (this.doorOpenReady) this.cameraShake = Math.max(this.cameraShake, 0.1);
    }

    for (const b of this.betals) b.update(dt, player, this, true);
    this.updateVines(dt, player);
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const q = this.fx[i];
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt;
      if (q.life <= 0) this.fx.splice(i, 1);
    }

    // Every Betal slain: the Forest Heart awakens at the start of the map
    if (!this.relic.spawned && !this.enemiesLeft) {
      this.clearTimer += dt;
      if (this.clearTimer > 1.2) {
        this.relic.spawned = true;
        this.relic.spawnT = 0;
        this.cameraShake = 0.7;
        this.killToastText = '❤ THE FOREST HEART AWAKENS';
        this.killToastTimer = 2.6;
        this.pendingDialogue = {
          speaker: 'kali', title: '⚜ THE FOREST HEART ⚜',
          text: 'The guardians are fallen, Rakti. The Forest Heart has awakened where your journey began. Follow the arrow back to it, then bring it to the door.'
        };
      }
    }

    if (!this.kaliHintShown && playerX >= this.kaliHintX) {
      this.kaliHintShown = true;
      this.pendingDialogue = {
        speaker: 'kali', title: '⚜ MAA KALI: BEYOND THE CHASM ⚜',
        text: 'No mortal leap crosses this chasm, Rakti. Take my form [X]: leap to the high ledge, then run the bridge of light before my strength fades.'
      };
    }

    if (!player || player.isDead) return;

    if (player.isGrounded) {
      for (let i = this.checkpointIndex + 1; i < this.checkpoints.length; i++) {
        if (playerX >= this.checkpoints[i]) {
          this.checkpointIndex = i;
          this.killToastText = '✦ CHECKPOINT ✦';
          this.killToastTimer = 1.6;
        }
      }
    }

    for (const trap of this.spikes) {
      const state = this.spikeState(trap);
      if (!state.harmful) continue;
      const x1 = trap.x + 6, x2 = trap.x + SPIKE_PACK_W - 6;
      if (playerX > x1 && playerX < x2 && playerY >= FLOOR_Y - state.reach && playerY <= FLOOR_Y + 6) {
        const away = playerX < (x1 + x2) / 2 ? -1 : 1;
        if (player.invulnerableTimer <= 0) {
          player.takeDamage(SPIKE_DAMAGE, away * 150, -340);
          this.cameraShake = Math.max(this.cameraShake, 0.4);
        }
      }
    }
  }

  spikeState(trap) {
    const t = (this.animTime + trap.phase) % SPIKE_CYCLE;
    const reachOf = (f) => JSPIKE_HEIGHT[f] * JSPIKE_ART.scale * 0.8;
    if (t < 2.3) return { frame: JSPIKE_DORMANT[Math.floor(t / 0.6) % 2], harmful: false, reach: 0 };
    if (t < 2.7) return { frame: JSPIKE_WARN[Math.min(1, Math.floor((t - 2.3) / 0.2))], harmful: false, reach: 0 };
    if (t < 3.2) {
      const i = Math.min(3, Math.floor((t - 2.7) / 0.125)), frame = JSPIKE_RISE[i];
      return { frame, harmful: i >= 2, reach: reachOf(frame) };
    }
    if (t < 5.6) {
      const frame = JSPIKE_HOLD[Math.floor((t - 3.2) / 0.12) % 2];
      return { frame, harmful: true, reach: reachOf(frame) };
    }
    const i = Math.min(3, Math.floor((t - 5.6) / 0.1)), frame = JSPIKE_FALL[i];
    return { frame, harmful: i <= 1, reach: reachOf(frame) };
  }

  // ---------------------------------------------------------------- jungle vines
  /** Rises, sways and sinks on its own; once Rakti is near it grows, spins to hit her, then sinks and rests. */
  updateVines(dt, player) {
    const alive = player && !player.isDead;
    for (const v of this.vines) {
      if (v.removed) continue;
      v.t += dt;
      v.cool = Math.max(0, v.cool - dt);
      v.flash = Math.max(0, v.flash - dt);
      if (v.state === 'dead') { if (v.t > 0.9) v.removed = true; continue; }
      const dx = alive ? player.x - v.x : 1e9;
      const onLevel = alive && Math.abs(player.y - FLOOR_Y) < 70;

      // only the sword cuts a vine, and not while it is sunk into the ground
      if (onLevel && v.state !== 'hidden' && player.isAttacking && Math.abs(dx) < VINE_SWORD_REACH) {
        const facingIt = dx === 0 || (dx > 0 ? player.facing === 'left' : player.facing !== 'left');
        if (facingIt && player.claimSwingHit(v)) {
          v.hp -= player.swordDamage;
          v.flash = 0.2;
          this.cameraShake = Math.max(this.cameraShake, 0.2);
          this.leafBurst(v.x, FLOOR_Y - 40, v.hp <= 0 ? 22 : 8);
          if (v.hp <= 0) { v.state = 'dead'; v.t = 0; continue; }
        }
      }

      if (v.state === 'attack') {
        const growT = (6 - v.attackFrom) / 14, spinT = 16 / 18, backT = 5 / 10;
        if (v.t < growT) v.phase2 = 'grow';
        else if (v.t < growT + spinT) v.phase2 = 'spin';
        else if (v.t < growT + spinT + backT) v.phase2 = 'back';
        else { v.state = 'hidden'; v.t = 0; v.wait = 1.4; v.cool = 1.6; v.phase2 = null; continue; }
        if (v.phase2 === 'spin' && onLevel && Math.abs(dx) < VINE_HIT && player.y >= FLOOR_Y - 95 && player.invulnerableTimer <= 0) {
          player.takeDamage(VINE_DAMAGE, (dx < 0 ? -1 : 1) * 170, -320);
          this.cameraShake = Math.max(this.cameraShake, 0.35);
        }
        continue;
      }

      if (alive && v.cool <= 0 && onLevel && Math.abs(dx) < VINE_NOTICE) {
        v.attackFrom = v.state === 'sway' ? 4 : v.state === 'emerge' ? 2 : 0;
        v.state = 'attack'; v.t = 0; v.phase2 = 'grow';
        continue;
      }
      if (v.state === 'hidden' && v.t >= v.wait) { v.state = 'emerge'; v.t = 0; }
      else if (v.state === 'emerge' && v.t >= 10 / 12) { v.state = 'sway'; v.t = 0; }
      else if (v.state === 'sway' && v.t >= 2.4) { v.state = 'retract'; v.t = 0; }
      else if (v.state === 'retract' && v.t >= 9 / 12) { v.state = 'hidden'; v.t = 0; v.wait = 1.1 + (v.phase % 3) * 0.4; }
    }
  }

  leafBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
      this.fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.6 + Math.random() * 0.4, maxLife: 1, c: Math.random() > 0.4 ? '#4f9a2a' : '#9acd4a' });
    }
  }

  vineFrame(v) {
    const t = v.t;
    switch (v.state) {
      case 'hidden': return ['a', 0];
      case 'emerge': return ['a', Math.min(9, Math.floor(t * 12))];
      case 'sway': return ['a', 10 + Math.floor(t * 8) % 8];
      case 'retract': return ['a', 18 + Math.min(8, Math.floor(t * 12))];
      case 'dead': return ['a', 18 + Math.min(8, Math.floor(t * 10))];
      default: {
        const growT = (6 - v.attackFrom) / 14;
        if (v.phase2 === 'grow') return ['b', v.attackFrom + Math.min(5 - v.attackFrom, Math.floor(t * 14))];
        if (v.phase2 === 'spin') return ['b', 6 + Math.floor((t - growT) * 18) % 8];
        return ['b', 14 + Math.min(4, Math.floor((t - growT - 16 / 18) * 10))];
      }
    }
  }

  drawVine(ctx, v) {
    if (v.removed || !this.inView(v.x - 120, v.x + 120)) return;
    const [sheet, frame] = this.vineFrame(v);
    const art = sheet === 'a' ? VINE_A : VINE_B, im = sheet === 'a' ? this.vineAImg : this.vineBImg;
    const f = this.sheetFrame('vine' + sheet, im, art, frame);
    if (!f) return;
    ctx.save();
    if (v.state === 'dead') ctx.globalAlpha = Math.max(0, 1 - v.t / 0.9);
    const shake = v.flash > 0 ? Math.sin(v.flash * 140) * 2 : 0;
    ctx.drawImage(f.c, v.x - f.w / 2 + shake, FLOOR_Y + 3 - art.ground * art.scale, f.w, f.h);
    ctx.restore();
  }

  // ======================================================================== rendering
  updateArtScale(ctx) {
    const a = ctx.getTransform().a || 1;
    const k = Math.max(1, Math.min(4, Math.ceil(a * 4) / 4));
    if (k !== this.artScale) { this.artScale = k; this.artCache.clear(); }
  }

  cachedArt(key, w, h, ready, paint) {
    let c = this.artCache.get(key);
    if (c) return c;
    if (!ready) return null;
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

  screenCanvas(key, image, { mirror = false, feather = true } = {}) {
    const ready = image.complete && image.naturalWidth > 0;
    return this.cachedArt('scr:' + key, SCREEN_W, SCREEN_H, ready, (g) => {
      g.save();
      if (mirror) { g.translate(SCREEN_W, 0); g.scale(-1, 1); }
      g.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
      g.restore();
      if (feather) {
        g.globalCompositeOperation = 'destination-in';
        const grad = g.createLinearGradient(0, 0, SCREEN_W, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(FEATHER / SCREEN_W, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,1)');
        g.fillStyle = grad;
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      }
    });
  }

  inView(x1, x2) {
    const v = this.view;
    return !v || (x2 >= v.x1 && x1 <= v.x2);
  }

  renderBackground(ctx, isDivine = false) {
    this.updateArtScale(ctx);
    const t = ctx.getTransform(), cw = ctx.canvas.width;
    this.view = t.a ? { x1: -t.e / t.a - 60, x2: (cw - t.e) / t.a + 60 } : null;
    ctx.save();
    // 1. Screens (the canvas is black below the art, which the pit shading and floor strip cover)
    this.screens.forEach((s, n) => {
      const x = X(n);
      if (!this.inView(x, x + SCREEN_W + 1)) return;
      const c = this.screenCanvas(`s${n}`, s.img, { mirror: s.mirror, feather: n > 0 });
      if (!c) return;
      ctx.save();
      ctx.imageSmoothingQuality = 'low';
      ctx.drawImage(c, x, 0, SCREEN_W + 1, SCREEN_H);
      ctx.restore();
    });

    this.renderPits(ctx);

    // 2. Floors and high ledges (tiled platform art)
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (const f of this.floors) if (this.inView(f.x1, f.x2)) this.platformArt.draw(ctx, f.x1, f.x2, FLOOR_Y);
    for (const l of this.ledges) if (this.inView(l.x1, l.x2)) this.platformArt.draw(ctx, l.x1, l.x2, l.y);
    ctx.restore();

    // 3. Pillars, hazards, props
    for (const p of this.pillars) this.drawPillar(ctx, p);
    for (const trap of this.spikes) this.drawSpikeTrap(ctx, trap);
    for (const v of this.vines) this.drawVine(ctx, v);
    this.renderBridge(ctx, isDivine);
    this.renderDoor(ctx);
    this.renderHeart(ctx);

    // 4. Enemies
    for (const b of this.betals) b.render(ctx, this.enemySprites);
    this.renderGuideArrow(ctx);
    for (const q of this.fx) {
      ctx.globalAlpha = Math.max(0, q.life / q.maxLife);
      ctx.fillStyle = q.c;
      ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  renderPits(ctx) {
    for (const pit of this.pits) {
      if (!this.inView(pit.x1, pit.x2)) continue;
      const g = ctx.createLinearGradient(0, FLOOR_Y - 6, 0, FLOOR_Y + 70);
      g.addColorStop(0, 'rgba(2, 10, 6, 0)');
      g.addColorStop(1, 'rgba(1, 5, 3, 0.97)');
      ctx.fillStyle = g;
      ctx.fillRect(pit.x1, FLOOR_Y - 6, pit.x2 - pit.x1, this.height - FLOOR_Y + 8);
    }
  }

  drawPillar(ctx, p) {
    const art = PILLAR_ART[p.art], im = this.pillarImgs[p.art];
    const w = art.w * p.scale, h = art.h * p.scale;
    if (!this.inView(p.cx - w / 2, p.cx + w / 2)) return;
    const c = this.cachedArt(`pillar:${p.art}:${p.scale}`, w, h, im.complete && im.naturalWidth > 0, (g) => g.drawImage(im, 0, 0, w, h));
    if (c) ctx.drawImage(c, p.cx - w / 2, p.top - art.surface * p.scale, w, h);
  }

  drawSpikeTrap(ctx, trap) {
    const { frame } = this.spikeState(trap);
    if (!this.inView(trap.x - 60, trap.x + SPIKE_PACK_W + 60)) return;
    const art = JSPIKE_ART;
    for (let k = 0; k < 2; k++) {
      const f = this.sheetFrame('jspike', this.spikeSheet, art, k === 0 ? frame : frame ^ 1);
      if (!f) return;
      ctx.drawImage(f.c, trap.x + SPIKE_SPACING * (k + 0.5) - f.w / 2, FLOOR_Y + 3 - art.ground * art.scale, f.w, f.h);
    }
  }

  /** Golden bridge between the two high ledges: seen and walkable only in Kali form. */
  renderBridge(ctx, isDivine) {
    if (!isDivine) return;
    const b = this.bridge, span = b.x2 - b.x1;
    if (!this.inView(b.x1, b.x2)) return;
    const im = this.bridgeImg, s = span / BRIDGE_ART.w, H = BRIDGE_ART.h * s;
    const c = this.cachedArt('bridge', span, H, im.complete && im.naturalWidth > 0, (g) => g.drawImage(im, 0, 0, span, H));
    if (!c) return;
    const top = b.y - BRIDGE_ART.deckY * s;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, top - 16, 0, top + H + 8);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, 'rgba(255, 210, 110, 0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(b.x1, top - 16, span, H + 24);
    ctx.restore();
    ctx.drawImage(c, b.x1, top, span, H);
  }

  /** Draws one frame of a sprite sheet at w x h world px, pre-scaled once into its own cache entry. */
  sheetFrame(key, img, art, frame) {
    const w = art.cw * art.scale, h = art.ch * art.scale;
    const c = this.cachedArt(`${key}:${frame}`, w, h, img.complete && img.naturalWidth > 0, (g) =>
      g.drawImage(img, (frame % art.cols) * art.cw, Math.floor(frame / art.cols) * art.ch, art.cw, art.ch, 0, 0, w, h));
    return c && { c, w, h };
  }

  /** The Forest Heart on its root-wrapped dais: fades in with a ring of light, pulses idle, glows when Rakti is near. */
  renderHeart(ctx) {
    const r = this.relic;
    if (!r.spawned) return;
    const f = this.sheetFrame('heart', this.heartImg, HEART_ART, Math.floor(this.animTime * 8) % HEART_ART.idle);
    if (!f || !this.inView(r.x - 120, r.x + 120)) return;
    const cy = FLOOR_Y - f.h * 0.5;
    let alpha = Math.min(1, r.spawnT / 1.0);
    if (r.collected) alpha *= 1 - Math.min(1, r.fly * 1.6);
    const near = Math.abs(this.px - r.x) < 110 ? 1 : 0.45;
    if (alpha > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 3);
      const g = ctx.createRadialGradient(r.x, cy, 4, r.x, cy, 70);
      g.addColorStop(0, `rgba(255, 90, 60, ${(0.35 + 0.2 * pulse) * alpha * near})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(r.x - 72, cy - 72, 144, 144);
      if (r.spawnT < 1.4) {   // awakening ring
        ctx.strokeStyle = `rgba(255, 150, 90, ${1 - r.spawnT / 1.4})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(r.x, FLOOR_Y - 8, 20 + r.spawnT * 110, 5 + r.spawnT * 22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(f.c, r.x - f.w / 2, FLOOR_Y + 2 - f.h, f.w, f.h);
      ctx.restore();
    }
    if (r.collected && r.fly < 1) {       // a spark of the heart flies to Rakti
      const t = r.fly, e = t * t * (3 - 2 * t);
      const x = r.x + (r.toX - r.x) * e, y = cy + (r.toY - cy) * e - Math.sin(t * Math.PI) * 30;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 1, x, y, 20);
      g.addColorStop(0, `rgba(255, 200, 150, ${1 - t})`);
      g.addColorStop(1, 'rgba(255, 60, 40, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 20, y - 20, 40, 40);
      ctx.restore();
    }
  }

  /** The forest door: closed from the start, opens frame by frame once the heart is offered, then its portal swirls. */
  renderDoor(ctx) {
    const d = this.door;
    let frame = 0;
    if (d.opening) {
      const k = Math.floor(d.openT * DOOR_FPS);
      frame = k < DOOR_ART.openFrame ? k : DOOR_ART.openFrame + (Math.floor(this.animTime * DOOR_FPS) % (DOOR_ART.frames - DOOR_ART.openFrame));
    }
    const f = this.sheetFrame('door', this.doorImg, DOOR_ART, frame);
    if (!f || !this.inView(d.x - 100, d.x + 100)) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 2);
    if (frame >= 2 || this.relic.collected) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cy = FLOOR_Y - f.h * 0.45;
      const g = ctx.createRadialGradient(d.x, cy, 6, d.x, cy, 90);
      const a = frame >= 2 ? 0.28 + 0.1 * pulse : 0.1 + 0.06 * pulse;
      g.addColorStop(0, `rgba(190, 110, 255, ${a})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(d.x - 92, cy - 92, 184, 184);
      ctx.restore();
    }
    ctx.drawImage(f.c, d.x - f.w / 2, FLOOR_Y + 2 - f.h, f.w, f.h);
  }

  /** A bobbing arrow beside Rakti pointing at the awakened heart (then at the door once she carries it). */
  renderGuideArrow(ctx) {
    const r = this.relic;
    let tx = null, label = '';
    if (r.spawned && r.spawnT > 0.8 && !r.collected) { tx = r.x; label = 'FOREST HEART'; }
    else if (r.collected && !this.door.opening) { tx = this.door.x; label = 'DOOR'; }
    if (tx === null) return;
    const dx = tx - this.px;
    if (Math.abs(dx) < 140) return;
    const dir = Math.sign(dx), bob = Math.sin(this.animTime * 5) * 5;
    const ax = this.px + dir * (70 + bob), ay = this.py - 105;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.scale(dir, 1);
    ctx.fillStyle = 'rgba(255, 214, 110, 0.95)';
    ctx.strokeStyle = 'rgba(90, 40, 10, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-16, -5); ctx.lineTo(2, -5); ctx.lineTo(2, -12); ctx.lineTo(16, 0);
    ctx.lineTo(2, 12); ctx.lineTo(2, 5); ctx.lineTo(-16, 5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 230, 160, 0.95)';
    ctx.strokeStyle = 'rgba(30, 10, 0, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.strokeText(label, ax, ay - 16);
    ctx.fillText(label, ax, ay - 16);
    ctx.restore();
  }
}
