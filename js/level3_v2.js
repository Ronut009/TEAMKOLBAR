/**
 * ==========================================================================
 * LEVEL 3: THE JUNGLE (js/level3_v2.js)  - rough playable pass
 * Built like Level 1: a row of wide background screens, a shared floor strip (PlatformArt 'jungle'),
 * data-driven floors / pits / pillars / spikes, Betal swordsmen and a relic + portal at the end.
 *   Home field -> pit crossed on two pillars -> spike trap + Betal -> second pit ->
 *   double spikes + Betal -> WIDE chasm: leap onto the high ledge as Kali [X], cross the golden bridge ->
 *   final stretch (spikes, two Betal). The sealed forest door waits at the end of the map from the start.
 *   Slay every Betal -> the Forest Heart awakens at the start (an arrow guides Rakti back) -> [E] take it ->
 *   carry it to the door -> [E] offer it -> the door opens -> walk through to Level 4.
 * The old horde level is kept in js/level3.js as a backup.
 * ==========================================================================
 */

import { PlatformArt } from './platformArt.js';
import { Betal } from './betal.js';
import { EnemySpriteSheet } from './enemySprites.js';

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

const SPIKE_ART = { frameW: 420, frameH: 200, blockLeft: 30, blockW: 360, surface: 161 };
const SPIKE_SHEET_COLUMNS = 4;
const SPIKE_SCALE = 0.5;
const SPIKE_BLOCK_W = SPIKE_ART.blockW * SPIKE_SCALE;
const SPIKE_CYCLE = 6;
const SPIKE_DAMAGE = 4;
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
      { img: this.bgA, mirror: true }, { img: this.bgB, mirror: true },
      { img: this.bgA, mirror: false }, { img: this.bgB, mirror: false }
    ];
    this.platformArt = new PlatformArt('jungle');
    this.pillarImgs = { tall: img(PILLAR_ART.tall.src) };
    this.spikeSheet = img('assets/level1/spikes/spike-trap-sheet.png');
    this.bridgeImg = img(BRIDGE_ART.src);
    this.enemySprites = new EnemySpriteSheet();
    this.heartImg = img(HEART_ART.src);
    this.doorImg = img(DOOR_ART.src);

    // ------------------------------------------------------------------ floors & pits
    this.floors = [
      { x1: 0, x2: X(1) + 500 },                 // home field
      { x1: X(1) + 870, x2: X(2) + 700 },
      { x1: X(2) + 1070, x2: X(3) + 800 },
      { x1: X(4) + 330, x2: X(5) + 1000 }        // final stretch
    ];
    this.pits = [
      { x1: X(1) + 500, x2: X(1) + 870 },
      { x1: X(2) + 700, x2: X(2) + 1070 },
      { x1: X(3) + 800, x2: X(4) + 330 }         // the wide chasm: Kali only
    ];
    this.pillars = [
      { art: 'tall', cx: X(1) + 585, top: 335, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(1) + 765, top: 305, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(2) + 785, top: 335, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(2) + 965, top: 305, scale: PIT_PILLAR_SCALE }
    ];
    // High ledges over the chasm (solid for everybody, but only Kali can jump up to the first)
    this.ledges = [
      { id: 'kali_ledge_a', x1: X(3) + 690, x2: X(3) + 850, y: LEDGE_Y },
      { id: 'kali_ledge_b', x1: X(4) + 300, x2: X(4) + 460, y: LEDGE_Y }
    ];
    // The golden bridge joining them exists (and is drawn) only in Kali form
    this.bridge = { x1: this.ledges[0].x2 - 4, x2: this.ledges[1].x1 + 4, y: LEDGE_Y };

    this.spikes = [
      { x: X(2) + 250, blocks: 1, phase: 0 },
      { x: X(3) + 150, blocks: 2, phase: 1.5 },
      { x: X(4) + 950, blocks: 1, phase: 3 }
    ];

    this.checkpoints = [X(1) + 950, X(2) + 1110, X(3) + 740, X(4) + 440];
    this.checkpointIndex = -1;

    this.betals = [
      new Betal(X(1) + 1100, X(1) + 1000, X(1) + 1230),
      new Betal(X(2) + 540, X(2) + 440, X(2) + 650),
      new Betal(X(3) + 620, X(3) + 570, X(3) + 740),
      new Betal(X(4) + 700, X(4) + 600, X(4) + 820),
      new Betal(X(5) + 150, X(5) + 40, X(5) + 300)
    ];

    // The Forest Heart awakens at the start of the map once every Betal is dead; the door is there from the beginning
    this.relic = { x: 150, collected: false, fly: 0, spawned: false, spawnT: 0 };
    this.clearTimer = 0;
    this.door = { x: X(5) + 860, opening: false, openT: 0 };
    this.px = 0; this.py = FLOOR_Y;
    this.width = Math.round(X(5) + 1100);

    this.kaliHintX = X(3) + 520;
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
        text: "The Forest Heart, Rakti: the second relic beats with the jungle's own pulse. Carry it to the sealed door at the far end of the forest. Only it will open the way."
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
      const x1 = trap.x + 6, x2 = trap.x + trap.blocks * SPIKE_BLOCK_W - 6;
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
    if (t < 2.3) return { frame: Math.floor(t / 0.6) % 2, harmful: false, reach: 0 };
    if (t < 2.7) return { frame: 2 + Math.min(1, Math.floor((t - 2.3) / 0.2)), harmful: false, reach: 0 };
    if (t < 3.2) {
      const f = Math.min(3, Math.floor((t - 2.7) / 0.125));
      return { frame: 4 + f, harmful: f >= 2, reach: f >= 3 ? 46 : 30 };
    }
    if (t < 5.6) return { frame: 8 + (Math.floor((t - 3.2) / 0.12) % 4), harmful: true, reach: 52 };
    const f = Math.min(3, Math.floor((t - 5.6) / 0.1));
    return { frame: 12 + f, harmful: f <= 1, reach: f === 0 ? 40 : 24 };
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
    this.renderBridge(ctx, isDivine);
    this.renderDoor(ctx);
    this.renderHeart(ctx);

    // 4. Enemies
    for (const b of this.betals) b.render(ctx, this.enemySprites);
    this.renderGuideArrow(ctx);
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
    const im = this.spikeSheet, s = SPIKE_SCALE;
    const w = SPIKE_ART.frameW * s, h = SPIKE_ART.frameH * s;
    if (!this.inView(trap.x - w, trap.x + trap.blocks * SPIKE_BLOCK_W + w)) return;
    const sx = (frame % SPIKE_SHEET_COLUMNS) * SPIKE_ART.frameW;
    const sy = Math.floor(frame / SPIKE_SHEET_COLUMNS) * SPIKE_ART.frameH;
    const c = this.cachedArt('spike:' + frame, w, h, im.complete && im.naturalWidth > 0,
      (g) => g.drawImage(im, sx, sy, SPIKE_ART.frameW, SPIKE_ART.frameH, 0, 0, w, h));
    if (!c) return;
    for (let b = 0; b < trap.blocks; b++) {
      ctx.drawImage(c, trap.x + b * SPIKE_BLOCK_W - SPIKE_ART.blockLeft * s, FLOOR_Y - SPIKE_ART.surface * s + 1, w, h);
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
