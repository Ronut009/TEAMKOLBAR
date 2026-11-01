/**
 * ==========================================================================
 * LEVEL 3: THE JUNGLE (js/levels/level3.js)
 * Built like Level 2: the map is cut into short floor chunks (about 450-550 px each) with a pit between
 * every two, about as long as Level 2 overall. Background screens, a shared floor strip (PlatformArt
 * 'jungle'), data-driven floors / pits / pillars, Betal swordsmen, a relic and a door at the end.
 *   Home field -> pit on two pillars -> chunk -> pit on three crumbling jungle platforms -> chunk ->
 *   WIDE chasm: leap onto the high ledge as Kali [X], open the jungle stones one by one with [Q] -> chunk ->
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
import { Sfx } from '../core/audio.js';

// Backgrounds (v2) are 2171 x 724; the sunlit floor line sits at image y = 588, the roots band below it
// reaches past the bottom of the view. (The old 2000 x 585 jungle_a/b.jpg are kept as backups.)
const BG_W = 2171, BG_H = 724;
const BG_SCALE = 368 / 588;
const SCREEN_W = BG_W * BG_SCALE;      // ~1359 world px per screen
const SCREEN_H = BG_H * BG_SCALE;      // ~453
const BG_EXT = 80;                     // the art continues below itself (a mirrored strip), so no black band shows under the floor
const FLOOR_Y = 368;
const FEATHER = 240 * BG_SCALE;        // image px faded in at each screen's left edge
const X = (screen, imageX = 0) => screen * (SCREEN_W - FEATHER) + imageX * BG_SCALE;

// Jungle piers (v2): the jungle slab's own end caps on a solid mossy brick column that darkens and fades into
// the pit (150 x 560, made by tools/make_pier2.py). The old banded jungle_pier.png is kept as a backup.
const PILLAR_ART = { tall: { src: 'assets/level3/jungle_pier_v2.png', w: 150, h: 560, surface: 30 } };
const PIT_PILLAR_SCALE = 0.5;
const PIER_CRUMBLE = 0.6;      // a crumbling pier gives way this long after Rakti lands on it
const PIER_RETURN = 2.6;       // and rises back out of the pit this long after it fell

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

// Jungle pathway stones (v2: 6-frame morph sheet, rock -> breaking -> floating slab; deckY = walking surface
// of the final slab, half = half its walkable width). The first sheet, jungle_path_sheet.png, is kept as a backup.
const PATH_ART = { src: 'assets/level3/jungle_path_sheet_v2.png', frameW: 118, frameH: 137, anchorX: 59, deckY: 73.6, half: 48 };
const PATH_MORPH_TIME = 0.3;
const PATH_HOLD = 3;              // a stone stays a platform this long after [Q], then closes back into a rock
// Crumbling jungle platforms (the final frame of the morph sheet): they drop JFALL_DELAY s after Rakti lands
const JFALL_DELAY = 0.5;
const JFALL_RESPAWN = 2.6;
// Sprite sheets (assets/level3/, keyed from AI art): heart 5 cols x 2 rows of 225x228 (frames 0-5 idle loop),
// door 7 cols x 2 rows of 326x342 (frame 0 closed .. 6 open, 6-13 swirling portal loop)
// The Forest Heart beating (8 frames, 149 x 143, roots' tips at row 141) on its carved stump shrine (300 x 267)
const HEART_ART = { src: 'assets/level3/forest_heart_beat.png', cw: 149, ch: 143, cols: 8, idle: 8, scale: 0.34, footY: 141 };
const SHRINE_ART = { src: 'assets/level3/heart_shrine.png', w: 300, h: 267, scale: 0.36, seatY: 82 };
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
    this.bgA = img('assets/level3/jungle_a2.jpg');
    this.bgB = img('assets/level3/jungle_b2.jpg');
    this.screens = [
      { img: this.bgA, mirror: false }, { img: this.bgB, mirror: false },
      { img: this.bgA, mirror: true }, { img: this.bgB, mirror: true }
    ];
    this.platformArt = new PlatformArt('jungle');
    this.pillarImgs = { tall: img(PILLAR_ART.tall.src) };
    this.spikeSheet = img(JSPIKE_ART.src);
    this.vineAImg = img(VINE_A.src);
    this.vineBImg = img(VINE_B.src);
    this.pathImg = img(PATH_ART.src);
    this.enemySprites = new EnemySpriteSheet();
    this.heartImg = img(HEART_ART.src);
    this.shrineImg = img(SHRINE_ART.src);
    this.doorImg = img(DOOR_ART.src);

    // ------------------------------------------------------------------ floors & pits
    // Short floor chunks with a pit between each pair (the same rhythm as Level 2)
    const END = 4300;
    this.floors = [
      { x1: 0, x2: 560 },                // home field
      { x1: 930, x2: 1400 },
      { x1: 1920, x2: 2370 },
      { x1: 3010, x2: 3440 },
      { x1: 3900, x2: END }              // final chunk, the door at its far end
    ];
    this.pits = [
      { x1: 560, x2: 930 },              // two pillars
      { x1: 1400, x2: 1920 },            // three crumbling platforms, spread out
      { x1: 2370, x2: 3010 },            // the wide chasm: Kali only
      { x1: 3440, x2: 3900 }             // three piers: low, rising and sinking, high
    ];
    this.pillars = [
      { art: 'tall', cx: 645, top: 335, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: 825, top: 305, scale: PIT_PILLAR_SCALE },
      // The last pit, hard: the first pier crumbles PIER_CRUMBLE s after she lands (no waiting on it), the
      // middle one rises and sinks fast, and the last, high one is only reachable near the top of that swing.
      { art: 'tall', cx: 3498, top: 330, scale: PIT_PILLAR_SCALE, crumble: true },
      { art: 'tall', cx: 3668, top: 298, base: 298, swing: 48, period: 2.2, phase: 0, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: 3842, top: 236, scale: PIT_PILLAR_SCALE }
    ];
    // High ledges: two over the chasm (solid for everybody, but only Kali can jump up to the first) and one
    // stepping stone in the middle of the second pit
    this.ledges = [
      { id: 'kali_ledge_a', x1: 2260, x2: 2420, y: LEDGE_Y },
      { id: 'kali_ledge_b', x1: 2980, x2: 3140, y: LEDGE_Y }
    ];
    // The pathway between the two Kali ledges: three floating jungle stones that open into platforms in Kali form
    const ax = this.ledges[0].x2, bx = this.ledges[1].x1, gap = (bx - ax - 3 * PATH_ART.half * 2) / 4;
    this.pathStones = [0, 1, 2].map((i) => ({
      cx: ax + gap * (i + 1) + PATH_ART.half * (2 * i + 1), y: LEDGE_Y - (i === 1 ? 12 : 0), m: 0, phase: i * 1.7, open: 0
    }));
    // The second pit is crossed on crumbling jungle platforms
    this.fallers = [1505, 1660, 1815].map((cx, i) => ({ cx, top: FLOOR_Y - [28, 52, 36][i], phase: i * 1.3, state: 'idle', t: 0, dy: 0, vy: 0, alpha: 1 }));

    // Jungle spikes: packs of two, x = left edge of the pack (none placed for now)
    this.spikes = [].map((x, i) => ({ x, phase: i * 1.3 }));
    // Jungle vines: always one at a time
    this.vines = [470, 1130, 1340, 2110, 3360].map((x, i) => ({ x, phase: i * 0.9, state: 'hidden', t: 0, wait: 0.6 + (i % 3) * 0.5, hp: VINE_HP, cool: 0, flash: 0, removed: false }));
    this.fx = [];

    this.checkpoints = [970, 1960, 2310, 3050, 3940];
    this.checkpointIndex = -1;

    this.betals = [
      new Betal(330, 260, 380),
      new Betal(1060, 1000, 1120),
      new Betal(1220, 1160, 1280),
      new Betal(1340, 1290, 1385),
      new Betal(2010, 1940, 2080),
      new Betal(2230, 2160, 2330),
      new Betal(3160, 3100, 3230),
      new Betal(3330, 3260, 3420),
      new Betal(3990, 3930, 4060),
      new Betal(4080, 4020, 4120)
    ];
    for (const b of this.betals) b.wave = 'first';
    // Touching the door brings two more in from the far right (the ambush). Once they fall, the Forest Heart
    // wakes at the start, and a fresh pack has crept in along the way back (each one steps out of the jungle
    // as Rakti comes near it from the right).
    const ambush = [new Betal(4235, 4175, 4290), new Betal(4275, 4190, 4295)];
    ambush.forEach((b, i) => { b.wave = 'ambush'; b.entryDelay = i * 0.55; });
    const back = [new Betal(3250, 3120, 3420), new Betal(2160, 1960, 2340), new Betal(1240, 1010, 1380),
      new Betal(1080, 960, 1200), new Betal(420, 280, 540)];
    for (const b of back) b.wave = 'return';
    this.betals.push(...ambush, ...back);

    // The Forest Heart awakens at the start of the map once the door's ambush has been beaten; the door is there from the beginning
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
  /** Level 3 keeps its progress through deaths (and [R]): Betal already slain stay dead, the heart stays awake or
   *  carried, and the door's ambush stays done. Only arriving from outside (freshStart) starts it all over.
   *  phase: 'first' (the first Betal) -> 'ambush' (door touched) -> 'return' (heart awake) -> 'carry' (heart taken) */
  reset() {
    const fresh = !this.phase;
    if (fresh) this.phase = 'first';
    this.pendingDialogue = null;
    if (fresh) {
      Object.assign(this.relic, { collected: false, fly: 0, spawned: false, spawnT: 0 });
      Object.assign(this.door, { opening: false, openT: 0 });
    } else {
      if (this.relic.spawned) this.relic.spawnT = Math.max(this.relic.spawnT, 2);
      if (this.relic.collected) this.relic.fly = 1;
    }
    this.clearTimer = 0;
    this.cameraShake = 0;
    this.killToastTimer = 0;
    this.screenFade = 0;
    this.isCompleted = false;
    this.animTime = 0;
    const spawn = this.getRespawnPoint();
    for (const b of this.betals) {
      const slain = !fresh && (b.dead || b.removed);
      b.reset();
      b.entry = null;
      if (slain) { b.dead = true; b.removed = true; continue; }
      if (b.wave === 'ambush') {
        // the ambush (re)starts from the far right once it has been triggered: never on top of her
        b.hidden = true;
        if (this.phase === 'ambush') this.startEntry(b, 1.4 + b.entryDelay);
      } else if (b.wave === 'return') {
        b.hidden = true;          // they step out when she comes near (see revealReturnWave)
        b.revealed = false;
      } else if (this.phase !== 'first') {
        b.dead = true; b.removed = true;     // the first Betal are gone once the door has been touched
      }
      // no spawn camping: a Betal waiting near where she comes back to life is gone
      if (!fresh && !b.hidden && !b.dead && !b.entry && Math.abs(b.x - spawn.x) < 450) { b.dead = true; b.removed = true; }
    }
    for (const p of this.pillars) if (p.crumble) Object.assign(p, { st: 'idle', t: 0, dy: 0, vy: 0 });
    for (const s of this.pathStones) Object.assign(s, { open: 0, m: 0 });
    for (const f of this.fallers) Object.assign(f, { state: 'idle', t: 0, dy: 0, vy: 0, alpha: 1 });
    for (const v of this.vines) Object.assign(v, { state: 'hidden', t: 0, wait: 0.6 + (v.phase % 3) * 0.5, hp: VINE_HP, cool: 0, flash: 0, removed: false });
    this.fx = [];
  }

  /** A Betal walks in from beyond the right edge of the map to his post. */
  startEntry(b, delay = 0) {
    b.hidden = false;
    b.fadeAlpha = 1;
    b.x = this.width + 40 + delay * 20;
    b.entry = { delay, toX: b.spawn.x };
    b.facing = 'left';
  }

  /** [E] at the door before Rakti has the heart: the forest answers, and two Betal come for her from the right. */
  triggerAmbush() {
    if (this.phase !== 'first') return;
    this.phase = 'ambush';
    this.cameraShake = 0.7;
    this.killToastText = '⚔ THE FOREST STIRS';
    this.killToastTimer = 2.2;
    // whoever of the first Betal is still about melts back into the jungle
    for (const b of this.betals) {
      if (b.wave !== 'first' || b.dead) continue;
      if (this.inView(b.x - 30, b.x + 30)) this.leafBurst(b.x, b.y - 30, 14);
      b.dead = true; b.removed = true;
    }
    for (const b of this.betals) if (b.wave === 'ambush') this.startEntry(b, 0.6 + b.entryDelay);
  }

  leafBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
      this.fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, life: 0.6 + Math.random() * 0.4, maxLife: 1, c: Math.random() > 0.4 ? '#4f9a2a' : '#9acd4a' });
    }
  }

  /** Called by the engine when Rakti arrives from another level (or the [O] test key), not on death or [R]:
   *  back to the very start, and she walks in from the edge of the forest. */
  freshStart() {
    this.checkpointIndex = -1;
    this.phase = null;          // the next reset() starts the level over completely
    this.kaliHintShown = false;
    this.introQueued = true;
    this.intro = null;
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

  get enemiesLeft() { return this.betals.some((b) => !b.dead && !b.hidden); }
  waveAlive(wave) { return this.betals.some((b) => b.wave === wave && !b.dead); }
  get doorOpenReady() { return this.door.opening && this.door.openT * DOOR_FPS >= DOOR_ART.openFrame + 0.5; }

  // ======================================================================== geometry
  pillarHalf(p) { return PILLAR_ART[p.art].w * p.scale * 0.42; }

  getPlatforms() {
    const list = [];
    for (const f of this.floors) list.push({ id: 'floor', x1: f.x1, x2: f.x2, y: FLOOR_Y, oneWay: false });
    for (const p of this.pillars) {
      if (p.crumble && (p.st === 'falling' || p.st === 'returning')) continue;
      const half = this.pillarHalf(p);
      list.push({ id: 'pillar', pierRef: p, x1: p.cx - half, x2: p.cx + half, y: Math.round(p.top), oneWay: false });
    }
    for (const l of this.ledges) list.push({ ...l, oneWay: true });
    for (const s of this.pathStones) {
      if (s.m >= 0.8) list.push({ id: 'jungle_path', stone: s, x1: s.cx - PATH_ART.half, x2: s.cx + PATH_ART.half, y: s.y, oneWay: true });
    }
    for (const f of this.fallers) {
      if (f.state === 'idle' || f.state === 'shaking') list.push({ id: 'faller', faller: f, x1: f.cx - PATH_ART.half, x2: f.cx + PATH_ART.half, y: f.top, oneWay: true });
    }
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
      if (p.crumble && (p.st === 'falling' || p.st === 'returning')) continue;
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
      if (this.phase === 'first') {
        return {
          type: 'inspection', x: this.door.x, y: FLOOR_Y, prompt: '[E] EXAMINE THE DOOR', speaker: 'kali', title: '⚜ THE SEALED DOOR ⚜',
          text: 'Living roots seal this door, Rakti, and only the Forest Heart will part them. But your touch has woken the jungle. Behind you, to the east: they are coming!',
          onInteract: () => this.triggerAmbush()
        };
      }
      return {
        type: 'inspection', x: this.door.x, y: FLOOR_Y, prompt: '[E] EXAMINE THE DOOR', speaker: 'stele', title: '⚜ THE SEALED DOOR ⚜',
        text: this.phase === 'ambush'
          ? 'The roots hold fast. The guardians the door has called must fall first.'
          : 'The door waits for the Forest Heart. It has awakened far to the west, where your journey began.'
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

  // ======================================================================== [Q] the jungle stones
  /** [Q]: the nearest closed stone ahead of Rakti opens into a platform for PATH_HOLD seconds. One at a time. */
  castQ(player) {
    if (!player || player.isDead || !player.hasPearl || player.isCasting || player.isClimbing) return;
    const dir = player.facing === 'left' ? -1 : 1;
    const cands = this.pathStones.filter((s) => s.open <= 0 && s.m < 0.5 && Math.abs(s.cx - player.x) < 300);
    if (!cands.length) {
      this.killToastText = '✧ NOTHING HERE ANSWERS ✧';
      this.killToastTimer = 1.2;
      return;
    }
    // prefer stones in front of her, nearest first
    // the path runs left to right: prefer the next stone onward (the way she faces, then to the right), nearest first
    const ahead = (q) => ((q.cx - player.x) * dir > 0 ? 0 : 1) + (q.cx > player.x ? 0 : 1);
    cands.sort((a, b) => ahead(a) - ahead(b) || Math.abs(a.cx - player.x) - Math.abs(b.cx - player.x));
    const s = cands[0];
    player.startCast(() => {
      s.open = PATH_HOLD;
      this.cameraShake = Math.max(this.cameraShake, 0.2);
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        this.fx.push({ x: s.cx, y: s.y - 10, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80 - 30, life: 0.5, maxLife: 0.5, c: i % 2 ? '#9ff6c8' : '#e6ffb0' });
      }
    }, s.cx);
  }

  /** The return pack steps out of the jungle when Rakti, heading back west, comes within reach of each one. */
  revealReturnWave(player) {
    if (!player || (this.phase !== 'return' && this.phase !== 'carry')) return;
    for (const b of this.betals) {
      if (b.wave !== 'return' || b.revealed || b.dead) continue;
      const dx = player.x - b.x;
      if (dx < 420 && dx > -60) {
        b.revealed = true;
        b.hidden = false;
        b.fadeAlpha = 0;          // Betal.update fades him in before he acts
        b.facing = dx < 0 ? 'left' : 'right';
        this.leafBurst(b.x, b.y - 30, 16);
        this.cameraShake = Math.max(this.cameraShake, 0.2);
      }
    }
  }

  updateFaller(f, dt, player) {
    f.t += dt;
    if (f.state === 'idle') {
      if (player && player.isGrounded && player.currentPlatform?.faller === f) { f.state = 'shaking'; f.t = 0; }
    } else if (f.state === 'shaking') {
      if (f.t >= JFALL_DELAY) {
        f.state = 'falling'; f.t = 0; f.vy = 40;
        this.cameraShake = Math.max(this.cameraShake, 0.15);
        if (player && player.currentPlatform?.faller === f) { player.isGrounded = false; player.currentPlatform = null; }
      }
    } else if (f.state === 'falling') {
      f.vy += 900 * dt; f.dy += f.vy * dt;
      f.alpha = Math.max(0, 1 - f.t / 0.8);
      if (f.t >= JFALL_RESPAWN) { f.state = 'returning'; f.t = 0; f.dy = 0; f.alpha = 0; }
    } else if (f.state === 'returning') {
      f.alpha = Math.min(1, f.t / 0.6);
      if (f.t >= 0.6) { f.state = 'idle'; f.t = 0; f.alpha = 1; }
    }
  }

  // ======================================================================== update
  update(playerX, playerY, dt, isDivine = false, player = null) {
    this.animTime += dt;
    // Arrival: the screen fades in as Rakti walks out of the trees at the left edge, then she takes over
    if (this.introQueued && player && !player.isDead) {
      this.introQueued = false;
      this.intro = { t: 0 };
      Object.assign(player, { x: -70, y: FLOOR_Y, vx: 0, vy: 0, isGrounded: true, facing: 'right', inputLocked: true,
        autoWalkX: null, spawnAlpha: 1 });
      this.screenFade = 1;
    }
    if (this.intro && player) {
      const it = this.intro;
      it.t += dt;
      // (the loading screen is still fading out for the first moments: she waits for it in the trees)
      this.screenFade = Math.max(0, Math.min(1, 1 - (it.t - 0.5) / 0.9));
      player.inputLocked = true;
      if (!it.walking && it.t >= 0.7) { it.walking = true; player.autoWalkX = 165; player.autoWalkSpeed = 120; }
      // leaves stir where she pushes through the undergrowth
      if (player.x < 40 && Math.random() < 0.5) {
        this.fx.push({ x: Math.max(4, player.x + 10), y: FLOOR_Y - 10 - Math.random() * 40, vx: 30 + Math.random() * 40, vy: -10 - Math.random() * 20,
          life: 0.7, maxLife: 0.7, c: Math.random() > 0.4 ? '#6fcf6a' : '#c9e88a' });
      }
      if (it.walking && player.autoWalkX == null) {
        player.inputLocked = false;
        this.intro = null;
        this.screenFade = 0;
      }
    }
    // [Q]-opened stones hold for PATH_HOLD seconds, then close back into rocks (dropping anyone on them)
    for (const s of this.pathStones) {
      // (the stone she is standing on does not run down while she casts the next one)
      if (s.open > 0 && !(player?.isCasting && player.currentPlatform?.stone === s)) s.open = Math.max(0, s.open - dt);
      const target = s.open > 0 ? 1 : 0;
      s.m = target > s.m ? Math.min(1, s.m + dt / PATH_MORPH_TIME) : Math.max(0, s.m - dt / PATH_MORPH_TIME);
      if (s.m < 0.8 && player?.currentPlatform?.stone === s) { player.isGrounded = false; player.currentPlatform = null; }
    }
    for (const f of this.fallers) this.updateFaller(f, dt, player);
    // crumbling piers: shake once stood on, drop into the pit, then rise back
    for (const p of this.pillars) {
      if (!p.crumble) continue;
      p.st ??= 'idle'; p.t = (p.t || 0) + dt; p.dy ??= 0;
      const on = player && player.isGrounded && player.currentPlatform?.pierRef === p;
      if (p.st === 'idle' && on) { p.st = 'shaking'; p.t = 0; }
      else if (p.st === 'shaking' && p.t >= PIER_CRUMBLE) {
        p.st = 'falling'; p.t = 0; p.vy = 30;
        this.cameraShake = Math.max(this.cameraShake, 0.2);
        if (on) { player.isGrounded = false; player.currentPlatform = null; }
        for (let i = 0; i < 10; i++) this.fx.push({ x: p.cx + (Math.random() - 0.5) * 50, y: p.top + Math.random() * 20, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 60, life: 0.7, maxLife: 0.7, c: Math.random() > 0.5 ? '#8a6a44' : '#4f9a2a' });
      } else if (p.st === 'falling') {
        p.vy += 700 * dt; p.dy += p.vy * dt;
        if (p.t >= PIER_RETURN) { p.st = 'returning'; p.t = 0; p.dy = 150; }   // it rises back from just below view
      } else if (p.st === 'returning') {
        p.dy = Math.max(0, p.dy - 260 * dt);
        if (p.dy <= 0) { p.st = 'idle'; p.t = 0; }
      }
    }
    // moving piers carry Rakti with them
    for (const p of this.pillars) {
      if (!p.swing) continue;
      const prev = p.top;
      p.top = p.base + Math.sin((this.animTime * Math.PI * 2) / p.period + p.phase) * p.swing;
      if (player && player.isGrounded && (player.currentPlatform?.pierRef === p ||
          (Math.abs(playerX - p.cx) <= this.pillarHalf(p) + 2 && Math.abs(playerY - prev) < 3))) {
        player.y = p.top;
        if (player.currentPlatform?.pierRef === p) player.currentPlatform.y = p.top;
      }
    }
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2.0);
    if (this.killToastTimer > 0) this.killToastTimer -= dt;

    this.px = playerX; this.py = playerY;
    this.updateGuideArrow(dt);
    if (this.relic.collected && this.relic.fly < 1) this.relic.fly = Math.min(1, this.relic.fly + dt * 1.4);
    if (this.relic.spawned) this.relic.spawnT += dt;
    if (this.door.opening) {
      this.door.openT += dt;
      if (this.doorOpenReady) this.cameraShake = Math.max(this.cameraShake, 0.1);
    }

    const talking = Boolean(player?.dialogueOpen);
    for (const b of this.betals) {
      if (b.entry) {
        if (talking) continue;
        const e = b.entry;
        if (e.delay > 0) { e.delay -= dt; continue; }
        b.animTime = (b.animTime || 0) + dt;
        b.isMoving = true;
        b.facing = 'left';
        b.x = Math.max(e.toX, b.x - 120 * dt);
        if (b.x <= e.toX) { b.entry = null; b.isMoving = false; }
        continue;
      }
      b.update(dt, player, this, !talking);
    }
    this.revealReturnWave(player);
    this.updateVines(dt, player);
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const q = this.fx[i];
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt;
      if (q.life <= 0) this.fx.splice(i, 1);
    }

    // The door's ambush beaten: the Forest Heart awakens at the start of the map, and a new pack waits on the way
    if (this.phase === 'ambush' && !this.waveAlive('ambush')) {
      this.clearTimer += dt;
      if (this.clearTimer > 1.2) {
        this.phase = 'return';
        this.relic.spawned = true;
        this.relic.spawnT = 0;
        this.cameraShake = 0.7;
        this.killToastText = '❤ THE FOREST HEART AWAKENS';
        this.killToastTimer = 2.6;
        this.pendingDialogue = {
          speaker: 'kali', title: '⚜ THE FOREST HEART ⚜',
          text: 'The door\'s guardians are fallen, Rakti, and the Forest Heart has awakened where your journey began. But the jungle is sending more of them. They are already on the path behind you. Follow the arrow back to the heart, then bring it here.'
        };
      }
    }
    if (this.phase === 'return' && this.relic.collected) this.phase = 'carry';

    if (!this.kaliHintShown && playerX >= this.kaliHintX) {
      this.kaliHintShown = true;
      this.pendingDialogue = {
        speaker: 'kali', title: '⚜ MAA KALI: BEYOND THE CHASM ⚜',
        text: 'No mortal leap crosses this chasm, Rakti. Take my form [X] to leap to the high ledge. Then call on the Pearl with [Q], stone by stone: each one opens into a path for a few breaths before it closes again.'
      };
    }

    if (!player || player.isDead) return;

    if (player.isGrounded && (this.phase === 'return' || this.phase === 'carry')) {
      // on the way back west the checkpoints follow her too
      for (let i = 0; i < this.checkpointIndex; i++) {
        if (playerX <= this.checkpoints[i] + 30) { this.checkpointIndex = i; break; }
      }
    }
    if (player.isGrounded) {
      for (let i = this.checkpointIndex + 1; i < this.checkpoints.length; i++) {
        if (playerX >= this.checkpoints[i]) {
          this.checkpointIndex = i;
          this.killToastText = '✦ CHECKPOINT ✦';
          this.killToastTimer = 1.6;
          Sfx.play('checkpoint');
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
          Sfx.at(v.hp <= 0 ? 'vine_cut' : 'sword_hit', v.x);
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
        Sfx.at('vine_spin', v.x);
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
    return this.cachedArt('scr:' + key, SCREEN_W, SCREEN_H + BG_EXT, ready, (g) => {
      g.save();
      if (mirror) { g.translate(SCREEN_W, 0); g.scale(-1, 1); }
      g.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
      g.translate(0, SCREEN_H * 2);
      g.scale(1, -1);
      g.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
      g.restore();
      // the reflected part is the deep forest floor: a little darker
      g.fillStyle = 'rgba(4, 12, 6, 0.35)';
      g.fillRect(0, SCREEN_H, SCREEN_W, BG_EXT);
      if (feather) {
        g.globalCompositeOperation = 'destination-in';
        const grad = g.createLinearGradient(0, 0, SCREEN_W, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(FEATHER / SCREEN_W, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,1)');
        g.fillStyle = grad;
        g.fillRect(0, 0, SCREEN_W, SCREEN_H + BG_EXT);
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
      ctx.drawImage(c, x, 0, SCREEN_W + 1, SCREEN_H + BG_EXT);
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
      g.addColorStop(1, 'rgba(3, 14, 8, 0.8)');   // deep green shade, not a black slab
      ctx.fillStyle = g;
      ctx.fillRect(pit.x1, FLOOR_Y - 6, pit.x2 - pit.x1, this.height - FLOOR_Y + 8);
    }
  }

  drawPillar(ctx, p) {
    const art = PILLAR_ART[p.art], im = this.pillarImgs[p.art];
    const w = art.w * p.scale, h = art.h * p.scale;   // tall enough to run past the bottom of the view
    if (!this.inView(p.cx - w / 2, p.cx + w / 2)) return;
    const c = this.cachedArt(`pillar:${p.art}:${p.scale}`, w, h, im.complete && im.naturalWidth > 0, (g) => g.drawImage(im, 0, 0, w, h));
    if (!c) return;
    let ox = 0, oy = p.dy || 0;
    if (p.st === 'shaking') { ox = Math.sin(p.t * 80) * 1.8; oy += Math.sin(p.t * 63) * 0.8; }
    ctx.drawImage(c, p.cx - w / 2 + ox, p.top - art.surface * p.scale + oy, w, h);
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

  /** Morphing jungle pathway: mossy rocks float over the chasm; in Kali form [X] they burst into flat stepping
   *  platforms (frames 0 -> 5), and when her form ends they close back into rocks and give way. */
  renderBridge(ctx, isDivine) {
    const im = this.pathImg, A = PATH_ART, k = 1;
    if (!im.complete || im.naturalWidth === 0) return;
    for (const s of this.pathStones) {
      if (!this.inView(s.cx - A.frameW, s.cx + A.frameW)) continue;
      const f = Math.max(0, Math.min(5, Math.round(s.m * 5)));
      const c = this.cachedArt('jpath:' + f, A.frameW, A.frameH, true,
        (g) => g.drawImage(im, f * A.frameW, 0, A.frameW, A.frameH, 0, 0, A.frameW, A.frameH));
      if (!c) continue;
      const bob = Math.sin(this.animTime * 1.6 + s.phase) * (s.m < 1 ? 2.5 : 1);
      // about to close: a quick flicker warns Rakti to move on
      const warn = s.open > 0 && s.open < 0.7 && Math.floor(this.animTime * 14) % 2 === 0;
      ctx.save();
      if (warn) ctx.globalAlpha = 0.55;
      ctx.drawImage(c, s.cx - A.anchorX * k, s.y - A.deckY * k + bob, A.frameW * k, A.frameH * k);
      ctx.restore();
    }
    // crumbling jungle platforms (final frame of the sheet)
    const c5 = this.cachedArt('jpath:5', A.frameW, A.frameH, true,
      (g) => g.drawImage(im, 5 * A.frameW, 0, A.frameW, A.frameH, 0, 0, A.frameW, A.frameH));
    for (const f of this.fallers) {
      if (f.alpha <= 0 || !this.inView(f.cx - A.frameW, f.cx + A.frameW)) continue;
      let ox = 0, oy = f.dy + (f.state === 'idle' ? Math.sin(this.animTime * 1.7 + f.phase) * 1.5 : 0), rot = 0;
      if (f.state === 'shaking') { ox = Math.sin(f.t * 90) * 1.6; oy += Math.sin(f.t * 70) * 0.8; }
      if (f.state === 'falling') rot = Math.min(0.5, f.t * 0.7) * (f.phase > 1 ? 1 : -1);
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.translate(f.cx + ox, f.top + oy);
      if (rot) ctx.rotate(rot);
      ctx.drawImage(c5, -A.anchorX, -A.deckY, A.frameW, A.frameH);
      ctx.restore();
    }
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
    // the carved stump shrine (drawn once the heart has woken there)
    const sk = SHRINE_ART.scale, sw = SHRINE_ART.w * sk, sh = SHRINE_ART.h * sk;
    const shrine = this.cachedArt('heartShrine', sw, sh, (this.shrineImg.complete && this.shrineImg.naturalWidth > 0), (g) => g.drawImage(this.shrineImg, 0, 0, sw, sh));
    if (!this.inView(r.x - 120, r.x + 120)) return;
    if (shrine) ctx.drawImage(shrine, r.x - sw / 2, FLOOR_Y + 4 - sh, sw, sh);
    const seat = FLOOR_Y + 4 - sh + SHRINE_ART.seatY * sk;      // the hollow on top of the stump
    // a slow heartbeat: two quick pulses, then rest
    const beat = Math.floor((this.animTime * 9) % 12);
    const f = this.sheetFrame('heart', this.heartImg, HEART_ART, Math.min(7, beat));
    if (!f) return;
    const cy = seat - f.h * 0.55;
    let alpha = Math.min(1, r.spawnT / 1.0);
    if (r.collected) alpha *= 1 - Math.min(1, r.fly * 1.6);
    const near = Math.abs(this.px - r.x) < 110 ? 1 : 0.45;
    if (alpha > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 3);
      const g = ctx.createRadialGradient(r.x, cy, 4, r.x, cy, 70);
      g.addColorStop(0, `rgba(90, 255, 170, ${(0.3 + 0.2 * pulse) * alpha * near})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(r.x - 72, cy - 72, 144, 144);
      if (r.spawnT < 1.4) {   // awakening ring
        ctx.strokeStyle = `rgba(140, 255, 190, ${1 - r.spawnT / 1.4})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(r.x, FLOOR_Y - 8, 20 + r.spawnT * 110, 5 + r.spawnT * 22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(f.c, r.x - f.w / 2, seat + 6 - HEART_ART.footY * HEART_ART.scale, f.w, f.h);
      ctx.restore();
    }
    if (r.collected && r.fly < 1) {       // a spark of the heart flies to Rakti
      const t = r.fly, e = t * t * (3 - 2 * t);
      const x = r.x + (r.toX - r.x) * e, y = cy + (r.toY - cy) * e - Math.sin(t * Math.PI) * 30;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 1, x, y, 20);
      g.addColorStop(0, `rgba(190, 255, 210, ${1 - t})`);
      g.addColorStop(1, 'rgba(40, 200, 110, 0)');
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

  /** Guide to the awakened Forest Heart (only the heart; the door needs no arrow).
   *  Off screen: an arrow circles Rakti's shoulders and points at the heart, eased so it glides instead of
   *  jumping with every hop. On screen: a marker bobs over the heart itself. */
  updateGuideArrow(dt) {
    const r = this.relic;
    const g = this.guide || (this.guide = { a: 0, x: this.px, y: this.py - 62, alpha: 0, init: false });
    const active = r.spawned && r.spawnT > 0.8 && !r.collected;
    const v = this.view;
    const heartOnScreen = v && r.x > v.x1 + 80 && r.x < v.x2 - 80;
    g.mode = heartOnScreen ? 'marker' : 'arrow';
    const want = active && !(g.mode === 'arrow' && Math.abs(r.x - this.px) < 120) ? 1 : 0;
    g.alpha += (want - g.alpha) * Math.min(1, dt * 6);
    if (!active && g.alpha < 0.02) { g.init = false; return; }
    // aim at the heart's glow, from Rakti's chest; mostly sideways (a steep arrow reads poorly)
    const cx = this.px, cy = this.py - 56;
    const ty = FLOOR_Y - 45;
    let a = Math.atan2(ty - cy, r.x - cx);
    const dir = Math.cos(a) >= 0 ? 1 : -1;
    const tilt = Math.max(-0.45, Math.min(0.45, Math.atan2(ty - cy, Math.abs(r.x - cx))));
    a = dir > 0 ? tilt : Math.PI - tilt;
    if (!g.init) { g.a = a; g.init = true; }
    let da = a - g.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    g.a += da * Math.min(1, dt * 7);
    const R = 46;
    const tx = cx + Math.cos(g.a) * R, tyy = cy + Math.sin(g.a) * R * 0.6;
    if (g.x === undefined || Math.abs(g.x - tx) > 200) { g.x = tx; g.y = tyy; }
    const k = Math.min(1, dt * 12);
    g.x += (tx - g.x) * k;
    g.y += (tyy - g.y) * Math.min(1, dt * 8);   // a softer vertical follow, so jumps do not yank it
  }

  /** Drawn over Rakti (engine hook). */
  renderForeground(ctx) { this.renderGuideArrow(ctx); }

  renderGuideArrow(ctx) {
    const g = this.guide, r = this.relic;
    if (!g || g.alpha < 0.02) return;
    ctx.save();
    ctx.globalAlpha = g.alpha;
    if (g.mode === 'marker') {
      // a gold chevron bobbing over the heart
      const bob = Math.sin(this.animTime * 4) * 4;
      const x = r.x, y = FLOOR_Y - 118 + bob;
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(255, 214, 110, 0.95)';
      ctx.strokeStyle = 'rgba(70, 30, 6, 0.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-9, -6); ctx.lineTo(0, 4); ctx.lineTo(9, -6); ctx.lineTo(9, 0); ctx.lineTo(0, 10); ctx.lineTo(-9, 0); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.font = 'bold 8px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(20, 8, 0, 0.9)';
      ctx.fillStyle = 'rgba(190, 255, 210, 0.95)';
      ctx.strokeText('FOREST HEART', 0, -11);
      ctx.fillText('FOREST HEART', 0, -11);
      ctx.restore();
      return;
    }
    const pulse = 1.35 + Math.sin(this.animTime * 6) * 0.08;
    ctx.translate(g.x, g.y);
    ctx.rotate(g.a);
    ctx.scale(pulse, pulse);
    // soft green glow behind, then the arrow
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
    glow.addColorStop(0, 'rgba(120, 255, 170, 0.35)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-18, -18, 36, 36);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255, 214, 110, 0.95)';
    ctx.strokeStyle = 'rgba(70, 30, 6, 0.95)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-10, -3.5); ctx.lineTo(1, -3.5); ctx.lineTo(1, -8); ctx.lineTo(11, 0);
    ctx.lineTo(1, 8); ctx.lineTo(1, 3.5); ctx.lineTo(-10, 3.5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
