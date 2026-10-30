/**
 * ==========================================================================
 * LEVEL 1: DROWNED DWARAKA (js/level1.js)
 * Five screens, left to right (each background is 1926x817, drawn at 368/655):
 *   0. Rift portal   - Rakti wakes up in her sari (prologue)
 *   1. Maa Kali idol - [E] at the idol: outfit change, HUD appears
 *   2. Ruins         - checkpoint, pit crossed on two pillars, one timed spike trap
 *   3. Ruins (mirrored) - checkpoint, double spike strip (must be timed), three-pillar pit
 *   4. Shrine        - checkpoint, Kali grants her form [X] near the lever tower. No floor between the
 *                      three towers: leap up to the lever tower as Kali, defeat its Betal, pull the
 *                      lever -> golden bridges spin out between the towers (walkable only as Kali)
 *                      -> relic tower (Betal) -> claim the relic -> door opens -> walk through
 * The old single-screen temple level is kept in js/level.js as a backup.
 * ==========================================================================
 */

import { PlatformArt } from './platformArt.js';
import { Betal } from './betal.js';
import { EnemySpriteSheet } from './enemySprites.js';

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
const PILLAR_SCALE = 0.21;     // floor pillars
const PIT_PILLAR_SCALE = 0.24; // pit pillars: tall enough that their base is always below the screen
const pillarScale = (p) => p.scale || PILLAR_SCALE;

// Spike trap frames (assets/level1/spikes/spike_0..15.png, 420x200; slab 360 px wide at x 30..390,
// its top face at frame y ~161). 0-1 closed, 2-3 holes open (warning), 4-7 rising, 8-11 up, 12-15 retracting.
const SPIKE_ART = { frameW: 420, frameH: 200, blockLeft: 30, blockW: 360, surface: 161 };
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
    this.height = 447;                // view ends at the floor art's bottom edge (360 + 87.6) so the ground meets the screen bottom
    this.deathY = 500;      // falling below this in a pit = respawn at the last checkpoint
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
    this.columnImg = img('assets/level1/column.png');   // 300x1324, stands over every screen seam
    this.seamColumns = [1, 2, 3, 4].map((n) => X(n) + FEATHER / 2);
    this.enemySprites = new EnemySpriteSheet();
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
      { x1: X(3) + 960, x2: X(4, 505) }     // ends under the lever tower; nothing between the towers
    ];
    this.pits = [
      { x1: X(2) + 190, x2: X(2) + 560 },
      { x1: X(3) + 540, x2: X(3) + 960 }
    ];

    // Pillars: `top` is where feet stand. Pit pillars use the tall art and sink into the abyss.
    this.pillars = [
      { art: 'tall', cx: X(2) + 275, top: 335, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(2) + 455, top: 305, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(3) + 610, top: 322, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(3) + 760, top: 284, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(3) + 905, top: 318, scale: PIT_PILLAR_SCALE }
    ];

    // Spike traps: `blocks` side by side; `phase` offsets the 6 s cycle so traps don't all move together.
    this.spikes = [
      { x: X(2) + 700, blocks: 1, phase: 0 },
      { x: X(3) + 120, blocks: 2, phase: 1.5 }
    ];

    // Shrine room (screen 4). Positions come straight from the background art.
    this.ledgeY = Math.round(425 * BG_SCALE);           // niche ledges ~129 px above the floor: only Kali's leap reaches
    this.doorSillY = Math.round(498 * BG_SCALE);        // door sill ~88 px up: reachable with a jump
    this.ledges = [
      { id: 'niche1', x1: X(4, 215), x2: X(4, 498), y: this.ledgeY },
      { id: 'niche2', x1: X(4, 925), x2: X(4, 1235), y: this.ledgeY },
      { id: 'door_sill', x1: X(4, 1515), x2: X(4, 1890), y: this.doorSillY }
    ];
    this.door = { x1: X(4, 1600), x2: X(4, 1830), cx: X(4, 1715) };

    this.lever = { x: X(4, 360), y: this.ledgeY, activated: false, pullTime: 0 };
    this.leverMessage = "The lever locks into place and threads of gold spin out between the towers. These bridges are woven from my light, Rakti. Only in my form [X] will they bear your weight.";
    this.leverImgs = [0, 1, 2].map((i) => img(`assets/level1/lever_${i}.png`));   // idle, moving, pulled

    // Golden bridges between the towers: spun out by the lever, solid only in Kali form
    this.bridgeImg = img('assets/level1/golden_bridge.png');
    this.bridges = [
      { x1: X(4, 498) - 4, x2: X(4, 925) + 4, y: this.ledgeY },
      { x1: X(4, 1235) - 4, x2: X(4, 1515) + 6, y: this.doorSillY }
    ];
    this.bridgeGrow = 0;

    // Kali grants her form [X] when Rakti nears the lever tower (kept across deaths until a New Game)
    this.abilityGrantX = X(4) - 30;
    this.abilityGranted = false;
    this.pendingDialogue = null;

    this.relic = { x: X(4, 1088), baseY: this.ledgeY, collected: false, fly: 0, fromX: 0, fromY: 0 };
    this.shrineW = 60;
    this.relicW = 34;
    this.doorOpen = 0;          // 0 closed .. 1 open (background crossfade)
    this.doorOpenDelay = 0;

    // Checkpoints: pit falls and deaths after the prologue respawn here
    this.checkpoints = [X(1, 1330) + 100, X(3) + 20, X(3) + 970];

    // Betal: one right after Kali's blessing, two later. (spawn x, patrol min x, patrol max x)
    // The first stays hidden until Kali's blessing is complete, then steps out of the dark.
    this.betals = [
      new Betal(X(2) + 150, X(2) + 60, X(2) + 182),
      new Betal(X(2) + 640, X(2) + 572, X(2) + 690),
      new Betal(X(4, 440), X(4, 232), X(4, 488), this.ledgeY),      // lever tower
      new Betal(X(4, 1170), X(4, 940), X(4, 1226), this.ledgeY)     // relic tower
    ];
    this.firstBetalShown = false;
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
    this.lever.pullTime = 0;
    this.bridgeGrow = 0;
    this.pendingDialogue = null;
    this.firstBetalShown = false;
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
    for (const b of this.betals) b.reset();
  }

  /** Where Rakti appears after a pit fall, death or restart once the prologue is done. */
  getRespawnPoint() {
    if (this.checkpointIndex >= 0) return { x: this.checkpoints[this.checkpointIndex] + 30, y: FLOOR_Y };
    return { x: this.prologue.idolX + 70, y: FLOOR_Y };
  }

  pullLever() {
    if (this.lever.activated) return false;
    this.lever.activated = true;
    this.lever.pullTime = 0;
    this.cameraShake = 0.6;
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
    for (const l of this.ledges) list.push({ ...l, oneWay: true });
    if (this.bridgeGrow >= 1) {
      for (const b of this.bridges) list.push({ id: 'golden_bridge', x1: b.x1, x2: b.x2, y: b.y, oneWay: true, divineOnly: true });
    }
    return list;
  }

  pillarHalf(p) {
    return PILLAR_ART[p.art].w * pillarScale(p) * 0.4;   // the cap is a little narrower than the base
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

  /** Solid pillar sides, plus an invisible wall past the idol until Kali's blessing. */
  resolvePitWallCollision(x, y) {
    if (!this.idolBlessed) x = Math.min(x, this.prologue.idolX + 140);
    for (const p of this.pillars) {
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
        text: 'The lever is locked in place. The golden bridges hold only for Kali\'s form [X].'
      };
    }
    if (!this.relic.collected && !this.lever.activated && Math.abs(px - this.relic.x) < 48 && Math.abs(py - this.ledgeY) < 12) {
      return {
        type: 'inspection', x: this.relic.x, y: this.ledgeY, prompt: '[E] SEALED SHRINE', speaker: 'stele', title: '⚜ SEALED SHRINE ⚜',
        text: 'A ward of light closes over the relic. Somewhere in this temple, a mechanism holds it shut.'
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

    // Lever pull, then the golden bridges spin out from the towers
    if (this.lever.activated) {
      this.lever.pullTime += dt;
      if (this.lever.pullTime > 0.35 && this.bridgeGrow < 1) {
        this.bridgeGrow = Math.min(1, this.bridgeGrow + dt / 1.2);
        this.cameraShake = Math.max(this.cameraShake, 0.18);
        if (this.bridgeGrow >= 1) {
          this.killToastText = '⚜ THE GOLDEN BRIDGES AWAKEN ⚜';
          this.killToastTimer = 2.4;
        }
      }
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

    // Betal: the first one stays out of sight until Kali's blessing (outfit change) is complete
    const blessingDone = this.idolBlessed && player && !player.isCivilian;
    this.betals[0].hidden = !blessingDone;
    if (blessingDone && !this.firstBetalShown) {
      this.firstBetalShown = true;
      this.killToastText = '⚔ A BETAL STIRS';
      this.killToastTimer = 1.8;
    }
    for (const b of this.betals) b.update(dt, player, this, blessingDone);

    // Kali grants her form [X] as Rakti nears the lever tower
    if (blessingDone && playerX >= this.abilityGrantX && !this.abilityGranted) {
      this.abilityGranted = true;
      this.pendingDialogue = {
        speaker: 'kali', title: '⚜ MAA KALI: MY FORM ⚜', flash: true,
        text: 'These towers stand beyond a mortal leap, Rakti. Take my form for a few breaths: press [X] to become Kali. You will leap higher, strike harder, and walk on bridges of light.'
      };
    }
    if (this.abilityGranted && player && !player.hasDivineUnlocked) player.hasDivineUnlocked = true;

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

  /** Spike cycle (6 s): closed 2.3 s, holes open as a warning 0.4 s, rise 0.5 s, up 2.4 s, retract 0.4 s. */
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

  renderBackground(ctx, isDivine = false) {
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


    // 3. Floor (tiled platform art)
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (const f of this.floors) this.platformArt.draw(ctx, f.x1, f.x2, FLOOR_Y);
    ctx.restore();

    // 4. Pillars, seam columns and spike traps
    for (const p of this.pillars) this.drawPillar(ctx, p);
    this.renderSeamColumns(ctx);
    for (const trap of this.spikes) this.drawSpikeTrap(ctx, trap);

    // 5. Shrine room props
    this.renderBridges(ctx, isDivine);
    this.renderLever(ctx);
    this.renderShrineAndRelic(ctx);
    this.renderDoorGlow(ctx);

    // 6. Enemies
    for (const b of this.betals) b.render(ctx, this.enemySprites);
    ctx.restore();
  }

  /** Big carved columns standing on the floor over each background seam. */
  renderSeamColumns(ctx) {
    const im = this.columnImg;
    if (!im.complete || im.naturalWidth === 0) return;
    const w = 84, h = w * (1324 / 300);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (const cx of this.seamColumns) ctx.drawImage(im, cx - w / 2, FLOOR_Y + 3 - h, w, h);
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
    const sc = pillarScale(p);
    const w = art.w * sc, h = art.h * sc;
    const top = p.top - art.surface * sc;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (p.art === 'medium') {
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (let b = 0; b < trap.blocks; b++) {
      const bx = trap.x + b * SPIKE_BLOCK_W;
      ctx.drawImage(im, bx - SPIKE_ART.blockLeft * s, FLOOR_Y - SPIKE_ART.surface * s + 1, SPIKE_ART.frameW * s, SPIKE_ART.frameH * s);
    }
  }

  renderShrineAndRelic(ctx) {
    const sh = this.shrineImg, rl = this.relicImg;
    const shrineH = this.shrineW * (216 / 220);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (sh.complete && sh.naturalWidth > 0) {
      ctx.drawImage(sh, this.relic.x - this.shrineW / 2, this.ledgeY - shrineH + 2, this.shrineW, shrineH);
    }
    ctx.restore();
    if (!rl.complete || rl.naturalWidth === 0) return;
    const relicH = this.relicW * (181 / 176);
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
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

  /** Lever art: 0 idle (tilted left), 1 mid-pull (upright), 2 pulled (tilted right). Hub sits on the ledge. */
  renderLever(ctx) {
    const t = this.lever.pullTime;
    const frame = !this.lever.activated ? 0 : (t < 0.18 ? 1 : 2);
    const im = this.leverImgs[frame];
    if (!im.complete || im.naturalWidth === 0) return;
    const h = 30, w = h * (200 / 149);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (!this.lever.activated) {
      // soft pulse so the player spots it
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(this.lever.x, this.lever.y - 14, 2, this.lever.x, this.lever.y - 14, 26);
      g.addColorStop(0, `rgba(90, 240, 230, ${0.22 + Math.sin(this.animTime * 3) * 0.08})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(this.lever.x - 28, this.lever.y - 42, 56, 56);
      ctx.restore();
    }
    ctx.drawImage(im, this.lever.x - w * 0.4979, this.lever.y - h + 1, w, h);
    ctx.restore();
  }

  /** Golden bridges: 3-slice art (end caps kept, middle stretched), growing out after the lever is pulled.
   *  Faint and ghostly to mortal eyes; bright and solid in Kali form. */
  renderBridges(ctx, isDivine) {
    const im = this.bridgeImg;
    if (this.bridgeGrow <= 0 || !im.complete || im.naturalWidth === 0) return;
    const H = 26, s = H / 136, deck = 24.1 * s, capSrc = 48, capW = capSrc * s;
    const alpha = isDivine ? 1 : 0.32 + Math.sin(this.animTime * 2.4) * 0.06;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (const b of this.bridges) {
      const len = (b.x2 - b.x1) * this.bridgeGrow;
      const top = b.y - deck;
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x1 - 2, top - 20, len + 4, H + 40);
      ctx.clip();
      if (isDivine) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, top - 14, 0, top + H + 6);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.45, 'rgba(255, 210, 110, 0.22)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(b.x1, top - 14, b.x2 - b.x1, H + 20);
        ctx.restore();
      }
      ctx.globalAlpha = alpha;
      const midW = (b.x2 - b.x1) - 2 * capW;
      ctx.drawImage(im, 0, 0, capSrc, 136, b.x1, top, capW, H);
      ctx.drawImage(im, capSrc, 0, 540 - 2 * capSrc, 136, b.x1 + capW, top, midW, H);
      ctx.drawImage(im, 540 - capSrc, 0, capSrc, 136, b.x2 - capW, top, capW, H);
      ctx.restore();
    }
    ctx.restore();
  }
}
