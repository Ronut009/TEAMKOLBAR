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

// Shrine towers (screen 4): free-standing tower sprites (1024x1536, transparent) on an open-water background.
// Image coordinates: arm = the stone ledge either side (Rakti stands on its top), niche = the arched alcove.
const TOWER_SCALE = 0.30;
const TOWER_ART = {
  shrine:     { src: 'assets/level1/tower_shrine.png',      cx: 512, armY: 753, armL: 73, armR: 950, nicheSill: 700, nicheTop: 410 },
  doorClosed: { src: 'assets/level1/tower_door_closed.png', cx: 512, armY: 720, armL: 69, armR: 955, doorSill: 670, doorTop: 330, doorL: 390, doorR: 633 },
  doorOpen:   { src: 'assets/level1/tower_door_open.png',   cx: 512, armY: 720, armL: 69, armR: 955, doorSill: 670, doorTop: 330, doorL: 390, doorR: 633 }
};
const TOWER_W = 1024, TOWER_H = 1536;
const TOWER_GAP = 170;          // open water between arm tips, spanned by the golden bridges

// Spike trap frames are a 4x4 sheet of 420x200 transparent spike art. The floor
// remains the shared temple platform tile, so the trap has no mismatched slab.
// 0-1 closed, 2-3 warning, 4-7 rising, 8-11 up, 12-15 retracting.
const SPIKE_ART = { frameW: 420, frameH: 200, blockLeft: 30, blockW: 360, surface: 161 };
const SPIKE_SHEET_COLUMNS = 4;
const SPIKE_SCALE = 0.5;                       // one block = 180 world px (just jumpable with a running start)
const SPIKE_BLOCK_W = SPIKE_ART.blockW * SPIKE_SCALE;
const SPIKE_CYCLE = 6;                          // seconds: ~3 s down, ~3 s up
const SPIKE_DAMAGE = 4;
const PIT_DAMAGE = 3;

export class Level {
  constructor() {
    this.levelIndex = 1;
    this.minX = 0;
    this.height = 447;                // view ends at the floor art's bottom edge (360 + 87.6) so the ground meets the screen bottom
    this.deathY = 500;      // falling below this in a pit = respawn at the last checkpoint
    this.pitDamage = PIT_DAMAGE;

    const img = (src) => { const i = new Image(); i.src = src; return i; };

    // ------------------------------------------------------------------ backgrounds
    this.bg = {
      portal: img('assets/level1/prologue_portal.jpg'),
      idol: img('assets/level1/prologue_idol.jpg'),
      ruins: img('assets/level1/filler_ruins.jpg'),
      towers: img('assets/level1/towers_bg.jpg')      // open water behind the shrine towers (screens 4-5)
    };
    this.towerImgs = Object.fromEntries(Object.entries(TOWER_ART).map(([k, v]) => [k, img(v.src)]));

    this.platformArt = new PlatformArt('temple');
    this.pillarImgs = Object.fromEntries(Object.entries(PILLAR_ART).map(([k, v]) => [k, img(v.src)]));
    this.spikeSheet = img('assets/level1/spikes/spike-trap-sheet.png');
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
      { x1: X(3) + 960, x2: X(4) + 300 }    // ends at the lever tower; beyond it only the towers rise from the deep
    ];
    this.pits = [
      { x1: X(2) + 190, x2: X(2) + 560 },
      { x1: X(3) + 540, x2: X(3) + 960 },
      { x1: X(4) + 300, x2: X(6) }           // the abyss under the towers
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

    // Shrine room (screen 4): lever tower -> bridge -> relic tower -> bridge -> door tower.
    // All three arms are ~129 px above the floor, so only Kali's leap reaches the first one.
    this.ledgeY = 239;
    const s = TOWER_SCALE, A = TOWER_ART.shrine, D = TOWER_ART.doorClosed;
    const armHalf = (art) => ({ l: (art.cx - art.armL) * s, r: (art.armR - art.cx) * s });
    const cx1 = X(4) + 380;            // its left arm overhangs the floor's end, so Kali can leap straight up onto it
    const cx2 = cx1 + armHalf(A).r + TOWER_GAP + armHalf(A).l;
    const cx3 = cx2 + armHalf(A).r + TOWER_GAP + armHalf(D).l;
    this.towers = [
      { id: 'lever', art: 'shrine', cx: cx1 },
      { id: 'relic', art: 'shrine', cx: cx2 },
      { id: 'door', art: 'doorClosed', cx: cx3 }
    ];
    // world y of an image row of a tower (arm tops line up at ledgeY)
    this.towerY = (art, imgY) => this.ledgeY - (art.armY - imgY) * s;
    this.ledges = this.towers.map((t) => {
      const h = armHalf(TOWER_ART[t.art]);
      return { id: 'tower_' + t.id, x1: t.cx - h.l + 6, x2: t.cx + h.r - 6, y: this.ledgeY };
    });
    this.doorSillY = this.ledgeY;
    this.door = { x1: cx3 + (D.doorL - D.cx) * s, x2: cx3 + (D.doorR - D.cx) * s, cx: cx3,
      midY: this.towerY(D, (D.doorTop + D.doorSill) / 2) };
    this.width = Math.round(cx3 + armHalf(D).r + 150);

    // the lever stands in the lever tower's niche, at Rakti's chest height
    this.lever = { x: cx1, y: this.towerY(A, A.nicheSill), activated: false, pullTime: 0 };
    this.leverMessage = "The lever locks into place and threads of gold spin out between the towers. These bridges are woven from my light, Rakti. Only in my form [X] will they bear your weight.";
    this.leverImgs = [0, 1, 2].map((i) => img(`assets/level1/lever_${i}.png`));   // idle, moving, pulled

    // Golden bridges between the towers: spun out by the lever, solid only in Kali form
    // Each bridge art is drawn at its true proportions, scaled to span its gap (deckY = walking rail, image px)
    this.bridgeArt = [
      { img: img('assets/level1/golden_bridge_a.png'), w: 1200, h: 193, deckY: 40.6 },
      { img: img('assets/level1/golden_bridge_b.png'), w: 1200, h: 197, deckY: 45.8 }
    ];
    // bridges run arm tip to arm tip, overlapping each tip a little so they look anchored
    this.bridges = [
      { x1: this.ledges[0].x2 - 4, x2: this.ledges[1].x1 + 4, y: this.ledgeY },
      { x1: this.ledges[1].x2 - 4, x2: this.ledges[2].x1 + 4, y: this.ledgeY }
    ];
    this.bridgeGrow = 0;
    // Golden orbs that sweep along the bridges: they exist only in Kali form, like the bridges themselves.
    // They float at chest height, so Rakti has to hop over them. Touching one costs 2 HP and knocks her back.
    this.bridgeSentries = [
      { bridge: 0, t: 0.25, dir: 1, speed: 105, phase: 0 },
      { bridge: 0, t: 0.8, dir: -1, speed: 135, phase: 2.4 },
      { bridge: 1, t: 0.5, dir: 1, speed: 95, phase: 1.1 }
    ];
    this.sentryStart = this.bridgeSentries.map(o => ({ ...o }));

    // Art is pre-scaled once to the size it appears on screen (see cachedArt), so each frame is a cheap 1:1 copy
    this.artCache = new Map();
    this.artScale = 0;

    // Kali grants her form [X] when Rakti nears the lever tower (kept across deaths until a New Game)
    this.abilityGrantX = X(4) - 30;
    this.abilityGranted = false;
    this.pendingDialogue = null;

    // The shrine sits on the relic tower's niche sill, centred in the arch; the relic floats above it
    this.relic = { x: cx2, baseY: this.ledgeY, collected: false, fly: 0, fromX: 0, fromY: 0 };
    this.shrineSillY = this.towerY(A, A.nicheSill);
    this.shrineW = 40;
    this.relicW = 26;
    this.relicFloatY = this.shrineSillY - this.shrineW * (216 / 220) - 19;
    this.doorOpen = 0;          // 0 closed .. 1 open (door tower crossfade)
    this.doorOpenDelay = 0;

    // Checkpoints: pit falls and deaths after the prologue respawn here
    this.checkpoints = [X(1, 1330) + 100, X(3) + 20, X(3) + 970];

    // Betal: one right after Kali's blessing, two later. (spawn x, patrol min x, patrol max x)
    // The first stays hidden until Kali's blessing is complete, then steps out of the dark.
    this.betals = [
      new Betal(X(2) + 150, X(2) + 60, X(2) + 182),
      new Betal(X(2) + 640, X(2) + 572, X(2) + 690),
      new Betal(cx1 + 70, this.ledges[0].x1 + 12, this.ledges[0].x2 - 12, this.ledgeY),   // lever tower
      new Betal(cx2 + 50, this.ledges[1].x1 + 12, this.ledges[1].x2 - 12, this.ledgeY)    // relic tower
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
    this.bridgeSentries.forEach((o, i) => Object.assign(o, this.sentryStart[i]));
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
    if (Math.abs(px - this.lever.x) < 40 && Math.abs(py - this.ledgeY) < 12) {
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
    if (Math.abs(px - this.door.cx) < 26 && Math.abs(py - this.doorSillY) < 6) {
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

    // Bridge orbs patrol while the bridges are out and Rakti is in Kali form
    if (this.bridgeGrow >= 1 && isDivine) {
      for (const o of this.bridgeSentries) {
        const b = this.bridges[o.bridge], margin = 14 / (b.x2 - b.x1);
        o.t += (o.speed * o.dir * dt) / (b.x2 - b.x1);
        if (o.t > 1 - margin) { o.t = 1 - margin; o.dir = -1; }
        if (o.t < margin) { o.t = margin; o.dir = 1; }
        o.phase += dt * 4.5;
        if (player && !player.isDead) {
          const p = this.sentryPos(o);
          if (Math.abs(playerX - p.x) < 15 && Math.abs((playerY - 28) - p.y) < 18) {
            player.takeDamage(2, Math.sign(playerX - p.x || 1) * 125, -165);
          }
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
  /** World px -> device px of the current camera, rounded to 1/4 steps. When it changes, cached art is rebuilt. */
  updateArtScale(ctx) {
    const a = ctx.getTransform().a || 1;
    const k = Math.max(1, Math.min(4, Math.ceil(a * 4) / 4));
    if (k !== this.artScale) { this.artScale = k; this.artCache.clear(); }
  }

  /** Returns a canvas holding `paint` drawn at w x h world px, rendered once at device resolution.
   *  Big sources (2x backgrounds, 735 px pillars, the 1324 px column) would otherwise be shrunk with
   *  high-quality filtering on every frame, which is what made the pit before the shrine stutter. */
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

  /** Background screen with the left FEATHER world px faded in, so neighbouring screens blend instead of hard seams. */
  screenCanvas(key, image, { mirror = false, feather = true } = {}) {
    const ready = image.complete && image.naturalWidth > 0;
    return this.cachedArt('scr:' + key, SCREEN_W, SCREEN_H, ready, (g) => {
      g.save();
      if (mirror) { g.translate(SCREEN_W, 0); g.scale(-1, 1); }
      g.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
      g.restore();
      if (feather) {
        // One full-size fill: destination-in clears everything the fill does not cover.
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

  drawScreen(ctx, canvas, screen, alpha = 1, atX = null) {
    if (!canvas) return;
    const x = atX ?? X(screen);
    if (!this.inView(x, x + SCREEN_W + 1)) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';   // the cache is already at screen resolution
    ctx.drawImage(canvas, x, 0, SCREEN_W + 1, SCREEN_H);
    ctx.restore();
  }

  /** True when world span [x1, x2] overlaps the camera view (skips art that is off screen). */
  inView(x1, x2) {
    const v = this.view;
    return !v || (x2 >= v.x1 && x1 <= v.x2);
  }

  renderBackground(ctx, isDivine = false) {
    this.updateArtScale(ctx);
    // visible world span (inverse of the camera transform), with a margin
    const t = ctx.getTransform(), cw = ctx.canvas.width;
    this.view = t.a ? { x1: -t.e / t.a - 60, x2: (cw - t.e) / t.a + 60 } : null;
    ctx.save();
    // 1. Screens
    this.drawScreen(ctx, this.screenCanvas('portal', this.bg.portal, { feather: false }), 0);
    this.drawScreen(ctx, this.screenCanvas('idol', this.bg.idol), 1);
    this.drawScreen(ctx, this.screenCanvas('ruins', this.bg.ruins), 2);
    this.drawScreen(ctx, this.screenCanvas('ruins_m', this.bg.ruins, { mirror: true }), 3);
    this.drawScreen(ctx, this.screenCanvas('towers', this.bg.towers), 4);
    // mirrored copy butted edge to edge: the seam is a perfect reflection, so it needs no feather
    this.drawScreen(ctx, this.screenCanvas('towers_m', this.bg.towers, { mirror: true, feather: false }), 4, 1, X(4) + SCREEN_W - 1);

    this.renderIdolGlow(ctx);
    this.renderTowers(ctx);
    this.renderPits(ctx);


    // 3. Floor (tiled platform art)
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (const f of this.floors) if (this.inView(f.x1, f.x2)) this.platformArt.draw(ctx, f.x1, f.x2, FLOOR_Y);
    ctx.restore();

    // 4. Pillars, seam columns and spike traps
    for (const p of this.pillars) this.drawPillar(ctx, p);
    this.renderSeamColumns(ctx);
    for (const trap of this.spikes) this.drawSpikeTrap(ctx, trap);

    // 5. Shrine room props
    this.renderBridges(ctx, isDivine);
    this.renderBridgeSentries(ctx, isDivine);
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
    // Tall enough that the capital runs off the top of the screen: the column holds up the "ceiling"
    const h = FLOOR_Y + 3 + 14, w = h * (300 / 1324);
    const c = this.cachedArt('column', w, h, im.complete && im.naturalWidth > 0, (g) => g.drawImage(im, 0, 0, w, h));
    if (!c) return;
    for (const cx of this.seamColumns) if (this.inView(cx - w / 2, cx + w / 2)) ctx.drawImage(c, cx - w / 2, FLOOR_Y + 3 - h, w, h);
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
    const sc = pillarScale(p);
    const w = art.w * sc, h = art.h * sc;
    if (!this.inView(p.cx - w / 2, p.cx + w / 2)) return;
    const c = this.cachedArt(`pillar:${p.art}:${sc}`, w, h, im.complete && im.naturalWidth > 0, (g) => g.drawImage(im, 0, 0, w, h));
    if (!c) return;
    const top = p.top - art.surface * sc;
    ctx.save();
    if (p.art === 'medium') {
      // only the part above the floor's bottom edge is visible while it rises
      ctx.beginPath();
      ctx.rect(p.cx - w, 0, w * 2, FLOOR_Y + 2);
      ctx.clip();
    }
    ctx.drawImage(c, p.cx - w / 2, top, w, h);
    ctx.restore();
  }

  drawSpikeTrap(ctx, trap) {
    const { frame } = this.spikeState(trap);
    const im = this.spikeSheet;
    const s = SPIKE_SCALE;
    const w = SPIKE_ART.frameW * s, h = SPIKE_ART.frameH * s;
    if (!this.inView(trap.x - w, trap.x + trap.blocks * SPIKE_BLOCK_W + w)) return;
    const sx = (frame % SPIKE_SHEET_COLUMNS) * SPIKE_ART.frameW;
    const sy = Math.floor(frame / SPIKE_SHEET_COLUMNS) * SPIKE_ART.frameH;
    const c = this.cachedArt('spike:' + frame, w, h, im.complete && im.naturalWidth > 0,
      (g) => g.drawImage(im, sx, sy, SPIKE_ART.frameW, SPIKE_ART.frameH, 0, 0, w, h));
    if (!c) return;
    for (let b = 0; b < trap.blocks; b++) {
      const bx = trap.x + b * SPIKE_BLOCK_W;
      ctx.drawImage(c, bx - SPIKE_ART.blockLeft * s, FLOOR_Y - SPIKE_ART.surface * s + 1, w, h);
    }
  }

  renderShrineAndRelic(ctx) {
    const sh = this.shrineImg, rl = this.relicImg;
    const shrineH = this.shrineW * (216 / 220);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (sh.complete && sh.naturalWidth > 0) {
      const c = this.cachedArt('shrine', this.shrineW, shrineH, true, (g) => g.drawImage(sh, 0, 0, this.shrineW, shrineH));
      ctx.drawImage(c, this.relic.x - this.shrineW / 2, this.shrineSillY - shrineH + 1, this.shrineW, shrineH);
    }
    ctx.restore();
    if (!rl.complete || rl.naturalWidth === 0) return;
    const relicH = this.relicW * (181 / 176);
    let rx = this.relic.x;
    let ry = this.relicFloatY + Math.sin(this.animTime * 2.4) * 2;
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

  /** The three free-standing towers. Their bases sink into the dark abyss (renderPits draws over them).
   *  The door tower crossfades from its closed to its open art as the door opens. */
  renderTowers(ctx) {
    const s = TOWER_SCALE, w = TOWER_W * s, h = TOWER_H * s;
    for (const t of this.towers) {
      if (!this.inView(t.cx - w / 2, t.cx + w / 2)) continue;
      const draw = (key, alpha) => {
        const art = TOWER_ART[key], im = this.towerImgs[key];
        const c = this.cachedArt('tower:' + key, w, h, im.complete && im.naturalWidth > 0, (g) => g.drawImage(im, 0, 0, w, h));
        if (!c) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(c, t.cx - art.cx * s, this.ledgeY - art.armY * s, w, h);
        ctx.restore();
      };
      if (t.art === 'doorClosed') {
        if (this.doorOpen < 1) draw('doorClosed', 1);
        if (this.doorOpen > 0) draw('doorOpen', this.doorOpen);
      } else {
        draw(t.art, 1);
      }
    }
  }

  renderDoorGlow(ctx) {
    const cx = this.door.cx, cy = this.door.midY;
    const D = TOWER_ART.doorClosed, s = TOWER_SCALE;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (this.doorOpen <= 0) {
      // sealed: the sun-seals breathe faintly, brighter once the relic is free to claim
      const p = (this.lever.activated ? 0.16 : 0.08) + Math.sin(this.animTime * 2) * 0.04;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 50);
      g.addColorStop(0, `rgba(255, 210, 120, ${p})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 52, cy - 52, 104, 104);
      ctx.restore();
      return;
    }
    const o = this.doorOpen;
    const pulse = 0.3 + Math.sin(this.animTime * 3) * 0.08;
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 95);
    g.addColorStop(0, `rgba(120, 255, 250, ${pulse * o})`);
    g.addColorStop(0.5, `rgba(60, 170, 255, ${0.12 * o})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 100, cy - 100, 200, 200);
    // motes drawn into the portal
    const top = this.towerY(D, D.doorTop + 30), bottom = this.towerY(D, D.doorSill);
    for (let i = 0; i < 14; i++) {
      const k = (this.animTime * 0.35 + i / 14) % 1;
      const a = i * 2.39 + this.animTime * 0.6;
      const r = (1 - k) * 44;
      const x = cx + Math.cos(a) * r * 0.8, y = cy + Math.sin(a) * r * 0.9;
      if (y < top - 20 || y > bottom + 10) continue;
      ctx.fillStyle = `rgba(190, 255, 255, ${0.7 * o * Math.sin(k * Math.PI)})`;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.restore();
  }

  /** Lever art: 0 idle (tilted left), 1 mid-pull (upright), 2 pulled (tilted right). Hub sits on the ledge.
   *  Until it is pulled it pulses with a golden halo, a light shaft and orbiting sparks so it is easy to spot. */
  renderLever(ctx) {
    const t = this.lever.pullTime;
    const frame = !this.lever.activated ? 0 : (t < 0.18 ? 1 : 2);
    const im = this.leverImgs[frame];
    if (!im.complete || im.naturalWidth === 0) return;
    const h = 38, w = h * (200 / 149);     // fits the niche (~53 px wide)
    const lx = this.lever.x, ly = this.lever.y, cy = ly - h * 0.45;
    if (!this.inView(lx - 60, lx + 60)) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 3.2);
    const leverArt = this.cachedArt('lever:' + frame, w, h, true, (g) => g.drawImage(im, 0, 0, w, h));
    const dx = lx - w * 0.4979, dy = ly - h + 1;
    ctx.save();
    if (!this.lever.activated) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // light shaft from above
      const shaft = ctx.createLinearGradient(0, ly - 120, 0, ly);
      shaft.addColorStop(0, 'rgba(255, 220, 120, 0)');
      shaft.addColorStop(1, `rgba(255, 220, 120, ${0.18 + 0.1 * pulse})`);
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(lx - 8, ly - 120); ctx.lineTo(lx + 8, ly - 120); ctx.lineTo(lx + 26, ly); ctx.lineTo(lx - 26, ly);
      ctx.fill();
      // halo
      const g = ctx.createRadialGradient(lx, cy, 2, lx, cy, 44);
      g.addColorStop(0, `rgba(255, 215, 110, ${0.6 + 0.3 * pulse})`);
      g.addColorStop(0.5, `rgba(90, 240, 230, ${0.18 + 0.1 * pulse})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 46, cy - 46, 92, 92);
      // orbiting sparks
      for (let i = 0; i < 6; i++) {
        const a = this.animTime * 1.8 + (i * Math.PI * 2) / 6;
        const sx = lx + Math.cos(a) * 24, sy = cy + Math.sin(a) * 12;
        ctx.fillStyle = i % 2 ? 'rgba(255, 230, 140, 0.9)' : 'rgba(140, 255, 245, 0.9)';
        ctx.fillRect(sx - 1, sy - 1, 2.2, 2.2);
      }
      // golden outline glow (blurred once into the cache, faded in and out here)
      const pad = 10;
      const glow = this.cachedArt('leverGlow', w + pad * 2, h + pad * 2, true, (gg) => {
        gg.shadowColor = 'rgba(255, 210, 100, 1)';
        gg.shadowBlur = 12;
        gg.drawImage(im, pad, pad, w, h);
        gg.drawImage(im, pad, pad, w, h);
      });
      ctx.globalAlpha = 0.45 + 0.55 * pulse;
      ctx.drawImage(glow, dx - pad, dy - pad, w + pad * 2, h + pad * 2);
      ctx.restore();
    }
    ctx.drawImage(leverArt, dx, dy, w, h);
    if (!this.lever.activated) {
      // bobbing golden marker above the lever
      const my = ly - h - 16 + Math.sin(this.animTime * 4) * 3;
      ctx.fillStyle = `rgba(255, 214, 110, ${0.75 + 0.25 * pulse})`;
      ctx.strokeStyle = 'rgba(90, 50, 10, 0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx - 6, my - 5); ctx.lineTo(lx + 6, my - 5); ctx.lineTo(lx, my + 3); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  /** Golden bridges grow out after the lever is pulled; each art is scaled uniformly to its gap
   *  (no squashing). They can only be seen - and stood on - in Kali form. */
  renderBridges(ctx, isDivine) {
    if (this.bridgeGrow <= 0 || !isDivine) return;
    this.bridges.forEach((b, i) => {
      const art = this.bridgeArt[i % this.bridgeArt.length];
      const span = b.x2 - b.x1;
      if (!this.inView(b.x1, b.x2)) return;
      const s = span / art.w, H = art.h * s;
      const c = this.cachedArt('bridge:' + i, span, H, art.img.complete && art.img.naturalWidth > 0,
        (g) => g.drawImage(art.img, 0, 0, span, H));
      if (!c) return;
      const top = b.y - art.deckY * s;
      const len = span * this.bridgeGrow;
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x1 - 2, top - 30, len + 4, H + 60);
      ctx.clip();
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
      ctx.restore();
    });
  }

  sentryPos(o) {
    const b = this.bridges[o.bridge];
    return { x: b.x1 + (b.x2 - b.x1) * o.t, y: b.y - 26 + Math.sin(o.phase) * 5 };
  }

  /** The bridge orbs from the original temple level: a hot golden core with a spinning ring. */
  renderBridgeSentries(ctx, isDivine) {
    if (!isDivine || this.bridgeGrow < 1) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const o of this.bridgeSentries) {
      const { x, y } = this.sentryPos(o);
      if (!this.inView(x - 20, x + 20)) continue;
      const pulse = 0.72 + Math.sin(o.phase * 1.7) * 0.18;
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 20);
      glow.addColorStop(0, `rgba(255, 247, 202, ${0.9 * pulse})`);
      glow.addColorStop(0.32, `rgba(255, 190, 61, ${0.65 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 122, 34, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 230, 145, ${0.72 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 9, o.phase, o.phase + Math.PI * 1.55);
      ctx.stroke();
      ctx.fillStyle = '#fff5d1';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
