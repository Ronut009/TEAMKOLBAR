/**
 * ==========================================================================
 * LEVEL 1: DROWNED DWARAKA (js/level1.js)
 * Five screens, left to right (each background is 1926x817, drawn at 368/655):
 *   0. Rift portal   - Rakti wakes up in her sari (prologue)
 *   1. Maa Kali idol - [E] at the idol: outfit change, HUD appears
 *   2. Ruins         - checkpoint, pit crossed on two pillars, one timed spike trap
 *   3. Ruins (mirrored) - checkpoint, double spike strip (must be timed), three-pillar pit
 *   4. Shrine        - checkpoint, small pillar -> niche 1 lever -> raised pillar ->
 *                      niche 2 relic -> door opens -> walk through to finish the level
 * The old single-screen temple level is kept in js/level.js as a backup.
 * ==========================================================================
 */

import { PlatformArt } from './platformArt.js';

const BG_SCALE = 368 / 655;            // background image px -> world px (floor line at world y = 368)
const SCREEN_W = 1926 * BG_SCALE;      // ~1082 world px per screen
const SCREEN_H = 817 * BG_SCALE;       // ~459
const FLOOR_Y = 368;
const FEATHER_PX = 240;                 // image px faded in at the left edge of each screen
const FEATHER = FEATHER_PX * BG_SCALE;          // screens after the first overlap the previous one by this much (soft seam)
// Each screen overlaps the previous one by FEATHER (its faded left edge blends over it).
// X(screen) = world x of a screen's left edge; X(screen, imageX) = a point in that screen's art.
const X = (screen, imageX = 0) => screen * (SCREEN_W - FEATHER) + imageX * BG_SCALE;

// Pillar art (assets/level1/pillar_*.png, trimmed): image size and how far below the top edge feet stand
const PILLAR_ART = {
  tall:   { src: 'assets/level1/pillar_tall.png',   w: 329, h: 735, surface: 10 },
  medium: { src: 'assets/level1/pillar_medium.png', w: 267, h: 500, surface: 10 },
  small:  { src: 'assets/level1/pillar_small.png',  w: 254, h: 325, surface: 10 }
};
const PILLAR_SCALE = 0.21;

// Spike trap frames (assets/level1/spikes/spike_0..15.png, 420x264, block 360 px wide at x 30..390)
const SPIKE_ART = { frameW: 420, frameH: 264, blockLeft: 30, blockW: 360, surface: 176 };
const SPIKE_SCALE = 0.5;                       // one block = 180 world px (just jumpable with a running start)
const SPIKE_BLOCK_W = SPIKE_ART.blockW * SPIKE_SCALE;
const SPIKE_CYCLE = 6;                          // seconds: ~3 s down, ~3 s up
const SPIKE_DAMAGE = 4;
const PIT_DAMAGE = 3;

export class Level {
  constructor() {
    this.levelIndex = 1;
    this.minX = 0;
    this.width = Math.round(X(4) + SCREEN_W);
    this.height = Math.round(SCREEN_H);
    this.deathY = SCREEN_H + 50;      // falling below this in a pit = respawn at the last checkpoint
    this.pitDamage = PIT_DAMAGE;

    const img = (src) => { const i = new Image(); i.src = src; return i; };

    // ------------------------------------------------------------------ backgrounds
    this.bg = {
      portal: img('assets/level1/prologue_portal.jpg'),
      idol: img('assets/level1/prologue_idol.jpg'),
      ruins: img('assets/level1/filler_ruins.jpg'),
      doorClosed: img('assets/level1/shrine_door_closed.jpg'),
      doorOpen: img('assets/level1/shrine_door_open.jpg')
    };
    this.bgCache = new Map();   // feathered / mirrored versions, built once the images load

    this.platformArt = new PlatformArt('temple');
    this.pillarImgs = Object.fromEntries(Object.entries(PILLAR_ART).map(([k, v]) => [k, img(v.src)]));
    this.spikeFrames = Array.from({ length: 16 }, (_, i) => img(`assets/level1/spikes/spike_${i}.png`));
    this.relicImg = img('assets/level1/relic.png');
    this.shrineImg = img('assets/level1/shrine.png');

    // ------------------------------------------------------------------ prologue (screens 0-1)
    this.prologue = {
      wakeX: X(0, 430),
      idolX: X(1, 1330),
      idolFaceY: 150 * BG_SCALE,
      idolRange: 95
    };
    this.idolBlessed = false;
    this.idolGlow = 0;
    this.screenFade = 0;

    // ------------------------------------------------------------------ floor & pits
    this.floors = [
      { x1: 0, x2: X(2) + 190 },
      { x1: X(2) + 560, x2: X(3) + 540 },
      { x1: X(3) + 960, x2: this.width }
    ];
    this.pits = [
      { x1: X(2) + 190, x2: X(2) + 560 },
      { x1: X(3) + 540, x2: X(3) + 960 }
    ];

    // Pillars: `top` is where feet stand. Pit pillars use the tall art and sink into the abyss.
    this.pillars = [
      { art: 'tall', cx: X(2) + 275, top: 335 },
      { art: 'tall', cx: X(2) + 455, top: 305 },
      { art: 'tall', cx: X(3) + 610, top: 322 },
      { art: 'tall', cx: X(3) + 760, top: 284 },
      { art: 'tall', cx: X(3) + 905, top: 318 },
      { art: 'small', cx: X(4, 215) - 24, top: FLOOR_Y + 4 - PILLAR_ART.small.h * PILLAR_SCALE + 2 }   // step up to niche 1
    ];

    // Spike traps: `blocks` side by side; `phase` offsets the 6 s cycle so traps don't all move together.
    this.spikes = [
      { x: X(2) + 700, blocks: 1, phase: 0 },
      { x: X(3) + 100, blocks: 2, phase: 1.5 },
      { x: X(4) + 440, blocks: 2, phase: 4.0 }
    ];

    // Shrine room (screen 4). Positions come straight from the background art.
    this.ledgeY = Math.round(425 * BG_SCALE);           // niche ledges ~129 px above the floor: too high to jump
    this.doorSillY = Math.round(498 * BG_SCALE);        // door sill ~88 px up: reachable with a jump
    this.ledges = [
      { id: 'niche1', x1: X(4, 215), x2: X(4, 498), y: this.ledgeY },
      { id: 'niche2', x1: X(4, 925), x2: X(4, 1235), y: this.ledgeY },
      { id: 'door_sill', x1: X(4, 1515), x2: X(4, 1890), y: this.doorSillY }
    ];
    this.door = { x1: X(4, 1600), x2: X(4, 1830), cx: X(4, 1715) };

    this.lever = {
      x: X(4, 360), y: this.ledgeY,
      activated: false, handleAngle: -0.55, targetAngle: -0.55
    };
    // Raised by the lever between the two niches (medium pillar rising through the floor)
    const rh = PILLAR_ART.medium.h * PILLAR_SCALE;
    this.risingPillar = { art: 'medium', cx: X(4, 714), raisedTop: FLOOR_Y + 4 - rh + 2, sink: rh + 6, offset: rh + 6 };

    this.relic = { x: X(4, 1088), baseY: this.ledgeY, collected: false, fly: 0, fromX: 0, fromY: 0 };
    this.shrineW = 56;
    this.relicW = 28;
    this.doorOpen = 0;          // 0 closed .. 1 open (background crossfade)
    this.doorOpenDelay = 0;

    // Checkpoints: pit falls and deaths after the prologue respawn here
    this.checkpoints = [X(2) + 30, X(3) + 20, X(3) + 970];
    this.checkpointIndex = -1;

    this.animTime = 0;
    this.cameraShake = 0;
    this.killToastText = '';
    this.killToastTimer = 0;
    this.isCompleted = false;
    this.lastHurtBy = null;
  }

  // ======================================================================== state
  reset() {
    this.lever.activated = false;
    this.lever.handleAngle = this.lever.targetAngle = -0.55;
    this.risingPillar.offset = this.risingPillar.sink;
    this.relic.collected = false;
    this.relic.fly = 0;
    this.doorOpen = 0;
    this.doorOpenDelay = 0;
    this.cameraShake = 0;
    this.killToastTimer = 0;
    this.idolGlow = 0;
    this.screenFade = 0;
    this.isCompleted = false;
    this.animTime = 0;      // spike traps restart their cycle
  }

  /** Where Rakti appears after a pit fall, death or restart once the prologue is done. */
  getRespawnPoint() {
    if (this.checkpointIndex >= 0) return { x: this.checkpoints[this.checkpointIndex] + 30, y: FLOOR_Y };
    return { x: this.prologue.idolX + 70, y: FLOOR_Y };
  }

  pullLever() {
    if (this.lever.activated) return false;
    this.lever.activated = true;
    this.lever.targetAngle = 0.55;
    this.cameraShake = 0.6;
    this.killToastText = '⚜ A PILLAR RISES BETWEEN THE NICHES ⚜';
    this.killToastTimer = 2.6;
    return true;
  }

  collectRelic(player) {
    if (this.relic.collected) return false;
    this.relic.collected = true;
    this.relic.fly = 0.0001;
    this.relic.toX = player ? player.x : this.relic.x;
    this.relic.toY = player ? player.y - 40 : this.ledgeY - 40;
    this.doorOpenDelay = 0.6;
    this.cameraShake = 0.5;
    return true;
  }

  // ======================================================================== geometry
  getPlatforms() {
    const list = [];
    for (const f of this.floors) list.push({ id: 'floor', x1: f.x1, x2: f.x2, y: FLOOR_Y, oneWay: false });
    for (const p of this.pillars) {
      const half = this.pillarHalf(p);
      list.push({ id: 'pillar', x1: p.cx - half, x2: p.cx + half, y: Math.round(p.top), oneWay: false });
    }
    const rp = this.risingPillar;
    if (rp.offset < 12) {
      const half = this.pillarHalf(rp);
      list.push({ id: 'rising_pillar', x1: rp.cx - half, x2: rp.cx + half, y: Math.round(rp.raisedTop + rp.offset), oneWay: false });
    }
    for (const l of this.ledges) list.push({ ...l, oneWay: true });
    return list;
  }

  pillarHalf(p) {
    return PILLAR_ART[p.art].w * PILLAR_SCALE * 0.4;   // the cap is a little narrower than the base
  }

  checkPlatformLanding(prevY, currY, x, droppingThrough = false) {
    for (const plat of this.getPlatforms()) {
      if (x < plat.x1 || x > plat.x2) continue;
      if (plat.oneWay && droppingThrough) continue;
      if (prevY <= plat.y + 6 && currY >= plat.y - 2) return plat;
    }
    return null;
  }

  isOnPlatform(x, y) {
    for (const plat of this.getPlatforms()) {
      if (x >= plat.x1 - 2 && x <= plat.x2 + 2 && Math.abs(y - plat.y) <= 4) return plat;
    }
    return null;
  }

  /** Solid pillar sides, plus an invisible wall past the idol until Kali's blessing. */
  resolvePitWallCollision(x, y) {
    if (!this.idolBlessed) x = Math.min(x, this.prologue.idolX + 140);
    const solids = [...this.pillars];
    if (this.risingPillar.offset < this.risingPillar.sink - 4) {
      solids.push({ ...this.risingPillar, top: this.risingPillar.raisedTop + this.risingPillar.offset });
    }
    for (const p of solids) {
      const half = this.pillarHalf(p) + 7;
      if (y > p.top + 5 && Math.abs(x - p.cx) < half) {
        x = x < p.cx ? p.cx - half : p.cx + half;
      }
    }
    return x;
  }

  // ======================================================================== interactions
  getNearbyInteractable(px, py) {
    if (!this.idolBlessed && Math.abs(px - this.prologue.idolX) <= this.prologue.idolRange && py > 300) {
      return { type: 'kali_idol', x: this.prologue.idolX, y: FLOOR_Y, prompt: '[E] TOUCH THE IDOL', text: '' };
    }
    if (Math.abs(px - this.lever.x) < 40 && Math.abs(py - this.lever.y) < 12) {
      return {
        type: 'lever', x: this.lever.x, y: this.lever.y, activated: this.lever.activated,
        prompt: this.lever.activated ? '[E] LEVER (ENGAGED)' : '[E] PULL LEVER',
        text: 'The lever is locked in place. A stone pillar now stands between the two shrines.'
      };
    }
    if (!this.relic.collected && Math.abs(px - this.relic.x) < 48 && Math.abs(py - this.ledgeY) < 12) {
      return {
        type: 'relic', x: this.relic.x, y: this.ledgeY, prompt: '[E] CLAIM THE RELIC',
        text: "The Pearl of the Tide, Rakti. The first of the four relics. It has waited for your bloodline, and it answers to you alone. The gate is open. Your father's trail goes on beyond it."
      };
    }
    if (!this.relic.collected && px > this.door.x1 - 40 && px < this.door.x2 + 40 && Math.abs(py - this.doorSillY) < 12) {
      return {
        type: 'doorway_locked', x: this.door.cx, y: this.doorSillY, prompt: '[E] SEALED DOOR',
        text: 'The great door will not move. Its sun-seals glow faintly, waiting for the relic resting in the shrine.'
      };
    }
    return null;
  }

  checkLevelComplete(px, py) {
    if (this.isCompleted || this.doorOpen < 0.95) return false;
    if (px > this.door.cx - 40 && px < this.door.cx + 40 && Math.abs(py - this.doorSillY) < 6) {
      this.isCompleted = true;
      return true;
    }
    return false;
  }

  // ======================================================================== update
  update(playerX, playerY, dt, isDivine = false, player = null) {
    this.animTime += dt;
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2.0);
    if (this.killToastTimer > 0) this.killToastTimer -= dt;
    if (this.idolGlow > 0) this.idolGlow = Math.max(0, this.idolGlow - dt * 0.5);
    if (this.screenFade > 0) this.screenFade = Math.max(0, this.screenFade - dt * 0.55);

    // Lever handle + rising pillar
    this.lever.handleAngle += (this.lever.targetAngle - this.lever.handleAngle) * Math.min(1, dt * 8);
    const rp = this.risingPillar;
    if (this.lever.activated && rp.offset > 0) {
      rp.offset = Math.max(0, rp.offset - dt * 55);
      this.cameraShake = Math.max(this.cameraShake, 0.25);
    }

    // Relic flies into Rakti's hands, then the door opens
    if (this.relic.collected && this.relic.fly < 1) this.relic.fly = Math.min(1, this.relic.fly + dt * 1.4);
    if (this.relic.collected) {
      if (this.doorOpenDelay > 0) {
        this.doorOpenDelay -= dt;
      } else if (this.doorOpen < 1) {
        this.doorOpen = Math.min(1, this.doorOpen + dt / 1.4);
        this.cameraShake = Math.max(this.cameraShake, 0.2);
        if (this.doorOpen >= 1) {
          this.killToastText = '⚜ THE PORTAL IS OPEN ⚜';
          this.killToastTimer = 2.8;
        }
      }
    }

    if (!player || player.isDead) return;

    // Checkpoints (only after Kali's blessing)
    if (this.idolBlessed && player.isGrounded) {
      for (let i = this.checkpointIndex + 1; i < this.checkpoints.length; i++) {
        if (playerX >= this.checkpoints[i]) {
          this.checkpointIndex = i;
          this.killToastText = '✦ CHECKPOINT ✦';
          this.killToastTimer = 1.6;
        }
      }
    }

    // Spike traps
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

  /** Spike cycle: down ~2.7 s, rise 0.6 s, up 2.4 s, retract 0.3 s. */
  spikeState(trap) {
    const t = (this.animTime + trap.phase) % SPIKE_CYCLE;
    if (t < 2.7) return { frame: 0, harmful: false, reach: 0 };
    if (t < 3.3) {
      const f = Math.min(3, Math.floor((t - 2.7) / 0.15));
      return { frame: 4 + f, harmful: f >= 2, reach: f >= 3 ? 40 : 26 };
    }
    if (t < 5.7) return { frame: 8 + (Math.floor((t - 3.3) / 0.12) % 4), harmful: true, reach: 46 };
    const f = Math.min(3, Math.floor((t - 5.7) / 0.075));
    return { frame: 12 + f, harmful: f <= 1, reach: f === 0 ? 40 : 24 };
  }

  // ======================================================================== rendering
  /** Background with the left FEATHER_PX image-px faded in, so neighbouring screens blend instead of hard seams. */
  screenCanvas(key, image, { mirror = false, feather = true } = {}) {
    if (this.bgCache.has(key)) return this.bgCache.get(key);
    if (!image.complete || image.naturalWidth === 0) return null;
    const c = document.createElement('canvas');
    c.width = image.naturalWidth;
    c.height = image.naturalHeight;
    const g = c.getContext('2d');
    if (mirror) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(image, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (feather) {
      // One full-size fill: destination-in clears everything the fill does not cover.
      g.globalCompositeOperation = 'destination-in';
      const grad = g.createLinearGradient(0, 0, c.width, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(FEATHER_PX / c.width, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = grad;
      g.fillRect(0, 0, c.width, c.height);
    }
    this.bgCache.set(key, c);
    return c;
  }

  drawScreen(ctx, canvas, screen, alpha = 1) {
    if (!canvas) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(canvas, X(screen), 0, SCREEN_W + 1, SCREEN_H);
    ctx.restore();
  }

  renderBackground(ctx) {
    ctx.save();
    // 1. Screens
    this.drawScreen(ctx, this.screenCanvas('portal', this.bg.portal, { feather: false }), 0);
    this.drawScreen(ctx, this.screenCanvas('idol', this.bg.idol), 1);
    this.drawScreen(ctx, this.screenCanvas('ruins', this.bg.ruins), 2);
    this.drawScreen(ctx, this.screenCanvas('ruins_m', this.bg.ruins, { mirror: true }), 3);
    this.drawScreen(ctx, this.screenCanvas('door_closed', this.bg.doorClosed), 4);
    if (this.doorOpen > 0) this.drawScreen(ctx, this.screenCanvas('door_open', this.bg.doorOpen), 4, this.doorOpen);

    this.renderIdolGlow(ctx);
    this.renderPits(ctx);

    // 2. Lever-raised pillar comes up from behind the floor
    if (this.risingPillar.offset < this.risingPillar.sink) {
      this.drawPillar(ctx, { ...this.risingPillar, top: this.risingPillar.raisedTop + this.risingPillar.offset });
    }

    // 3. Floor (tiled platform art)
    for (const f of this.floors) this.platformArt.draw(ctx, f.x1, f.x2, FLOOR_Y);

    // 4. Pillars and spike traps
    for (const p of this.pillars) this.drawPillar(ctx, p);
    for (const trap of this.spikes) this.drawSpikeTrap(ctx, trap);

    // 5. Shrine room props
    this.renderLever(ctx);
    this.renderShrineAndRelic(ctx);
    this.renderDoorGlow(ctx);
    ctx.restore();
  }

  renderIdolGlow(ctx) {
    const p = this.prologue;
    const pulse = this.idolBlessed ? 0 : 0.18 + Math.sin(this.animTime * 2.2) * 0.08;
    const glow = Math.max(pulse, Math.min(1, this.idolGlow));
    if (glow <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.idolX, p.idolFaceY, 4, p.idolX, p.idolFaceY, 120);
    g.addColorStop(0, `rgba(255, 214, 120, ${0.55 * glow})`);
    g.addColorStop(0.45, `rgba(120, 200, 255, ${0.22 * glow})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.idolX - 130, p.idolFaceY - 130, 260, 260);
    ctx.restore();
  }

  renderPits(ctx) {
    for (const pit of this.pits) {
      const g = ctx.createLinearGradient(0, FLOOR_Y - 6, 0, FLOOR_Y + 70);
      g.addColorStop(0, 'rgba(2, 8, 24, 0)');
      g.addColorStop(1, 'rgba(1, 4, 14, 0.95)');
      ctx.fillStyle = g;
      ctx.fillRect(pit.x1, FLOOR_Y - 6, pit.x2 - pit.x1, SCREEN_H - FLOOR_Y + 8);
    }
  }

  drawPillar(ctx, p) {
    const art = PILLAR_ART[p.art];
    const im = this.pillarImgs[p.art];
    if (!im.complete || im.naturalWidth === 0) return;
    const w = art.w * PILLAR_SCALE, h = art.h * PILLAR_SCALE;
    const top = p.top - art.surface * PILLAR_SCALE;
    ctx.save();
    if (p === this.risingPillar || p.art === 'medium') {
      // only the part above the floor's bottom edge is visible while it rises
      ctx.beginPath();
      ctx.rect(p.cx - w, 0, w * 2, FLOOR_Y + 2);
      ctx.clip();
    }
    ctx.drawImage(im, p.cx - w / 2, top, w, h);
    ctx.restore();
  }

  drawSpikeTrap(ctx, trap) {
    const { frame } = this.spikeState(trap);
    const im = this.spikeFrames[frame];
    if (!im.complete || im.naturalWidth === 0) return;
    const s = SPIKE_SCALE;
    for (let b = 0; b < trap.blocks; b++) {
      const bx = trap.x + b * SPIKE_BLOCK_W;
      ctx.drawImage(im, bx - SPIKE_ART.blockLeft * s, FLOOR_Y - SPIKE_ART.surface * s, SPIKE_ART.frameW * s, SPIKE_ART.frameH * s);
    }
  }

  renderShrineAndRelic(ctx) {
    const sh = this.shrineImg, rl = this.relicImg;
    const shrineH = this.shrineW * (946 / 962);
    if (sh.complete && sh.naturalWidth > 0) {
      ctx.drawImage(sh, this.relic.x - this.shrineW / 2, this.ledgeY - shrineH + 2, this.shrineW, shrineH);
    }
    if (!rl.complete || rl.naturalWidth === 0) return;
    const relicH = this.relicW * (793 / 770);
    let rx = this.relic.x;
    let ry = this.ledgeY - shrineH - relicH / 2 - 6 + Math.sin(this.animTime * 2.4) * 2.5;
    let alpha = 1, size = 1;
    if (this.relic.collected) {
      const t = this.relic.fly;
      const e = t * t * (3 - 2 * t);
      rx = rx + (this.relic.toX - rx) * e;
      ry = ry + (this.relic.toY - ry) * e - Math.sin(t * Math.PI) * 30;
      alpha = 1 - Math.max(0, (t - 0.7) / 0.3);
      size = 1 - 0.4 * t;
      if (alpha <= 0) return;
    }
    // soft halo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(rx, ry, 2, rx, ry, 30);
    halo.addColorStop(0, `rgba(160, 255, 240, ${0.45 * alpha})`);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(rx - 32, ry - 32, 64, 64);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(rl, rx - (this.relicW * size) / 2, ry - (relicH * size) / 2, this.relicW * size, relicH * size);
    ctx.restore();
  }

  renderDoorGlow(ctx) {
    if (this.doorOpen <= 0) return;
    const cx = this.door.cx, cy = this.doorSillY - 50;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.25 + Math.sin(this.animTime * 3) * 0.08;
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 90);
    g.addColorStop(0, `rgba(120, 255, 250, ${pulse * this.doorOpen})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 95, cy - 95, 190, 190);
    ctx.restore();
  }

  renderLever(ctx) {
    ctx.save();

    const lx = this.lever.x;
    const ly = this.lever.y;

    // ------------------------------------------------------------------------
    // 1. Ancient Temple Pedestal Base (Stepped Sandstone & Bronze Housing)
    // ------------------------------------------------------------------------
    const baseW = 22;
    const baseH = 14;
    const pivotY = ly - baseH + 1; // Pivot at y=159

    // Ambient drop shadow beneath pedestal
    ctx.fillStyle = 'rgba(8, 6, 14, 0.7)';
    ctx.fillRect(lx - baseW / 2 - 2, ly - 2, baseW + 4, 5);

    // Stepped Sandstone Plinth (Adhisthana)
    // Tier 1 (Lower step)
    const plinthGrad = ctx.createLinearGradient(lx - baseW / 2, ly - 4, lx + baseW / 2, ly);
    plinthGrad.addColorStop(0, '#563d26');
    plinthGrad.addColorStop(0.5, '#8c6440');
    plinthGrad.addColorStop(1, '#442d1a');
    ctx.fillStyle = plinthGrad;
    ctx.fillRect(lx - baseW / 2, ly - 4, baseW, 4);
    ctx.fillStyle = '#caa375';
    ctx.fillRect(lx - baseW / 2 + 1, ly - 4, baseW - 2, 1); // Sunlit rim

    // Tier 2 (Carved Lotus Moulding / Padmapitha, ly - 8 to ly - 4)
    ctx.fillStyle = '#22140a';
    ctx.fillRect(lx - baseW / 2 + 2, ly - 8, baseW - 4, 4);
    for (let px = lx - baseW / 2 + 3; px <= lx + baseW / 2 - 5; px += 4) {
      // Carved upward lotus petal
      ctx.fillStyle = '#aa7e52';
      ctx.fillRect(px, ly - 7.5, 3, 3.5);
      ctx.fillStyle = '#edd1aa';
      ctx.fillRect(px + 1, ly - 7.5, 1, 1); // Petal tip highlight
      ctx.fillStyle = '#1c1007';
      ctx.fillRect(px + 3, ly - 8, 1, 4);   // Shadow slit
    }

    // Heavy Antique Cast-Bronze Gear Housing (ly - 14 to ly - 8)
    const housingW = 14;
    const housingGrad = ctx.createLinearGradient(lx - housingW / 2, ly - 14, lx + housingW / 2, ly - 8);
    housingGrad.addColorStop(0, '#42371e');
    housingGrad.addColorStop(0.3, '#7d6a3b');
    housingGrad.addColorStop(0.7, '#a89358');
    housingGrad.addColorStop(1, '#3b311a');
    ctx.fillStyle = housingGrad;
    ctx.fillRect(lx - housingW / 2, ly - 14, housingW, 6);

    // Weathered bronze rivets & border moulding
    ctx.fillStyle = '#dfcb91';
    ctx.fillRect(lx - housingW / 2 + 1, ly - 14, housingW - 2, 1);
    ctx.fillStyle = '#1f1a0e';
    ctx.fillRect(lx - housingW / 2, ly - 9, housingW, 1);
    ctx.fillStyle = '#e8d9a4';
    ctx.fillRect(lx - housingW / 2 + 1, ly - 12.5, 1.2, 1.2); // Left rivet
    ctx.fillRect(lx + housingW / 2 - 2.2, ly - 12.5, 1.2, 1.2); // Right rivet

    // Verdigris patina touches on bronze base
    ctx.fillStyle = 'rgba(74, 115, 95, 0.45)';
    ctx.fillRect(lx - 5, ly - 11, 2, 2);
    ctx.fillRect(lx + 3, ly - 10, 2, 1.5);

    // Central Circular Pivot Gear Hub (Radius 4.5px around pivotY)
    ctx.fillStyle = '#1c160b';
    ctx.beginPath();
    ctx.arc(lx, pivotY, 4.6, 0, Math.PI * 2);
    ctx.fill();

    const gearGrad = ctx.createRadialGradient(lx, pivotY, 1, lx, pivotY, 4.5);
    gearGrad.addColorStop(0, '#d1bf82');
    gearGrad.addColorStop(0.7, '#8f7e4a');
    gearGrad.addColorStop(1, '#3d341b');
    ctx.fillStyle = gearGrad;
    ctx.beginPath();
    ctx.arc(lx, pivotY, 4.0, 0, Math.PI * 2);
    ctx.fill();

    // Radiating chiseled gear notches
    ctx.strokeStyle = '#221b0e';
    ctx.lineWidth = 0.8;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(lx + Math.cos(a) * 2.5, pivotY + Math.sin(a) * 2.5);
      ctx.lineTo(lx + Math.cos(a) * 4.2, pivotY + Math.sin(a) * 4.2);
      ctx.stroke();
    }

    // Central Gemstone / Sacred Pivot Core
    ctx.save();
    if (this.lever.activated) {
      ctx.globalCompositeOperation = 'lighter';
      const gemPulse = 0.7 + 0.3 * Math.sin(this.animTime * 4.0);
      ctx.fillStyle = `rgba(255, 215, 0, ${gemPulse})`;
      ctx.beginPath();
      ctx.arc(lx, pivotY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lx - 0.7, pivotY - 0.7, 1.4, 1.4);
    } else {
      // Deep sacred ruby / amber core when inactive
      ctx.fillStyle = '#8f2334';
      ctx.beginPath();
      ctx.arc(lx, pivotY, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7b92';
      ctx.fillRect(lx - 0.6, pivotY - 0.6, 1.2, 1.2);
    }
    ctx.restore();

    // ------------------------------------------------------------------------
    // 2. Ancient Indian Curved Stylus / Blade Lever Arm (Image 3)
    // ------------------------------------------------------------------------
    ctx.save();
    ctx.translate(lx, pivotY);
    ctx.rotate(this.lever.handleAngle);

    // --- A. Tapering Faceted Bronze Shank (y = 0 to y = -17) ---
    // Shaft shadow facet (right side)
    ctx.fillStyle = '#4a3f23';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1.3, 0);
    ctx.lineTo(2.0, -17);
    ctx.lineTo(0, -17);
    ctx.closePath();
    ctx.fill();

    // Shaft sunlit facet (left side)
    const shankGrad = ctx.createLinearGradient(-1.8, 0, 0, 0);
    shankGrad.addColorStop(0, '#a5925a');
    shankGrad.addColorStop(0.5, '#d8c48a');
    shankGrad.addColorStop(1, '#f5e9bd');
    ctx.fillStyle = shankGrad;
    ctx.beginPath();
    ctx.moveTo(-1.3, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, -17);
    ctx.lineTo(-2.0, -17);
    ctx.closePath();
    ctx.fill();

    // Sharp central ridge highlight along shank
    ctx.strokeStyle = '#fff5cf';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(0, -16.5);
    ctx.stroke();

    // --- B. Raised Collar Moulding Ring (y = -17 to y = -18.5) ---
    ctx.fillStyle = '#2b2311';
    ctx.fillRect(-2.5, -18.5, 5.0, 1.5);
    ctx.fillStyle = '#ecdba2';
    ctx.fillRect(-2.3, -18.5, 4.6, 0.8);
    ctx.fillStyle = '#8f7e4a';
    ctx.fillRect(-2.3, -17.7, 4.6, 0.7);

    // --- C. Stamped Floral Rosette / Star Cluster (y = -19.5) ---
    // Cluster of 6 embossed dots seen at the base of the blade in Image 3
    ctx.fillStyle = '#2b2311';
    ctx.fillRect(-1.5, -20.5, 3.0, 2.0); // Recessed background
    ctx.fillStyle = '#f7ebc2';
    // Center dot
    ctx.fillRect(-0.4, -19.6, 0.8, 0.8);
    // Surrounding petal dots
    ctx.fillRect(-1.2, -19.6, 0.6, 0.6);
    ctx.fillRect(0.6, -19.6, 0.6, 0.6);
    ctx.fillRect(-0.4, -20.4, 0.6, 0.6);
    ctx.fillRect(-0.4, -18.8, 0.6, 0.6);

    // --- D. Broad Curved Blade Finial (y = -18.5 to y = -31) ---
    // The iconic forward-curving broad blade with pointed beak tip from Image 3
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-2.4, -18.5);                          // Base left
    ctx.bezierCurveTo(-4.2, -22, -4.8, -26, -3.2, -29); // Outer curved spine sweep
    ctx.quadraticCurveTo(-1.5, -31.5, 2.5, -31.0);    // Curved top crest rounding to beak tip
    ctx.lineTo(2.8, -30.2);                           // Sharp beaked hook point
    ctx.quadraticCurveTo(0.6, -26, 1.2, -21.5);       // Inner concave sweep
    ctx.lineTo(2.2, -18.5);                           // Base right
    ctx.closePath();

    // Blade metallic gradient
    const bladeGrad = ctx.createLinearGradient(-4.5, -25, 2.5, -25);
    bladeGrad.addColorStop(0, '#594a28');  // Outer spine shadow
    bladeGrad.addColorStop(0.2, '#9a8752');
    bladeGrad.addColorStop(0.5, '#cebc83'); // Mid-blade body
    bladeGrad.addColorStop(0.85, '#faedc3'); // Inner cutting edge highlight
    bladeGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = bladeGrad;
    ctx.fill();

    // Blade border stroke
    ctx.strokeStyle = '#2b2311';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // --- E. Embossed Bead Dots along the Outer Curved Spine ---
    // Tiny decorative beads following the outer curve from Image 3
    const spineDots = [
      { x: -2.3, y: -19.2 },
      { x: -2.9, y: -20.8 },
      { x: -3.5, y: -22.5 },
      { x: -4.0, y: -24.4 },
      { x: -4.1, y: -26.3 },
      { x: -3.7, y: -28.0 },
      { x: -2.6, y: -29.6 },
      { x: -1.0, y: -30.7 },
      { x: 0.8,  y: -31.1 }
    ];
    for (const d of spineDots) {
      // Dark bead socket
      ctx.fillStyle = '#221b0b';
      ctx.fillRect(d.x - 0.6, d.y - 0.6, 1.2, 1.2);
      // Sunlit raised metallic bead
      ctx.fillStyle = '#fff4ce';
      ctx.fillRect(d.x - 0.4, d.y - 0.4, 0.8, 0.8);
    }

    // --- F. Ancient Sacred Glyphs / Inscriptions (Image 3) ---
    // 3 Brahmi / Grantha characters engraved down the blade face
    const glyphGlow = this.lever.activated;
    ctx.save();
    if (glyphGlow) {
      ctx.globalCompositeOperation = 'lighter';
      const gPulse = 0.6 + 0.4 * Math.sin(this.animTime * 4.5);
      ctx.strokeStyle = `rgba(255, 225, 100, ${gPulse})`;
      ctx.fillStyle = `rgba(255, 240, 160, ${gPulse})`;
      ctx.lineWidth = 0.9;
    } else {
      ctx.strokeStyle = '#29210e'; // Dark etched engraving
      ctx.lineWidth = 0.8;
    }

    // Glyph 1 (Top hook/bow glyph, y ≈ -27.5)
    ctx.beginPath();
    ctx.arc(-0.8, -27.2, 1.1, Math.PI * 0.2, Math.PI * 1.8);
    ctx.stroke();

    // Glyph 2 (Middle stepped glyph / swastika-key variant, y ≈ -24.5)
    ctx.beginPath();
    ctx.moveTo(-1.6, -25.2);
    ctx.lineTo(-0.2, -25.2);
    ctx.lineTo(-0.2, -23.6);
    ctx.lineTo(-1.4, -23.6);
    ctx.stroke();

    // Glyph 3 (Lower spiral/omega Grantha glyph, y ≈ -21.8)
    ctx.beginPath();
    ctx.arc(-0.8, -21.8, 1.0, 0, Math.PI * 1.6);
    ctx.stroke();

    ctx.restore();

    // Polished beaked tip glint
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2.0, -30.6, 0.8, 0.8);

    ctx.restore(); // End blade clipping / rotation

    ctx.restore(); // End lever arm translation

    // ------------------------------------------------------------------------
    // 3. Divine Celestial Aura & Sparks When Activated
    // ------------------------------------------------------------------------
    if (this.lever.activated) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const auraPulse = 0.5 + 0.5 * Math.sin(this.animTime * 3.2);

      // Warm radial golden light illuminating the balcony stones
      const glowGrad = ctx.createRadialGradient(lx, pivotY - 10, 2, lx, pivotY - 10, 26);
      glowGrad.addColorStop(0, `rgba(255, 215, 80, ${0.45 * auraPulse})`);
      glowGrad.addColorStop(0.5, `rgba(255, 170, 30, ${0.2 * auraPulse})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(lx, pivotY - 10, 26, 0, Math.PI * 2);
      ctx.fill();

      // Delicate floating mystic sparks around the lever head
      for (let i = 0; i < 3; i++) {
        const sa = this.animTime * 2.0 + (i * Math.PI * 2 / 3);
        const sx = lx + Math.cos(sa) * (8 + i * 4);
        const sy = (pivotY - 20) + Math.sin(sa * 1.5) * 6;
        ctx.fillStyle = i % 2 === 0 ? '#ffd700' : '#4eedff';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
