/**
 * ==========================================================================
 * LEVEL 2: THE SUN WASTES (js/level2_v2.js)
 * js/level2.js is the previous desert-catacombs level, kept as a backup.
 *
 * Outside (five background screens, left to right):
 *   0 portal ruins  - Rakti steps out of the rift; Maa Kali speaks
 *   1 dunes         - tower 1: an archer Rakti cannot reach. Kali teaches [Q]: the boulder
 *                     becomes a sphere and is hurled onto the tower top
 *   1-2             - a chasm of floating rocks: [Q] turns them into stone platforms
 *   2 dunes (mirror)- tower 2: a second archer and a second boulder. When he falls a ladder
 *                     unfurls and the Sun Key floats over the tower top
 *   3 dunes         - a chasm crossed on tall pillars, then a Betal guards the way
 *   4 the sun door  - the key opens it (closed -> open art) and Rakti walks into the hall
 * The hall (two screens, in its own stretch of the world; the camera is limited to it):
 *   the shrine holds the Trishul -> an archer on the hall's tower (only the Trishul reaches him)
 *   -> a horde of 3 Betal and 2 archers -> the end door opens into a portal -> Level 3.
 *
 * Coordinates work like Level 1: X(screen, imageX) turns a pixel column of a 1672 x 941
 * background into world x. Screens are drawn so that image row 930 (the door sills) meets the
 * floor at world y = 368.
 * ==========================================================================
 */

import { PlatformArt } from './platformArt.js';
import { Betal } from './betal.js';
import { EnemySpriteSheet } from './enemySprites.js';
import { Archer } from './archer.js';

// ---------------------------------------------------------------- background screens
const BG_SCALE = 447 / 941;                 // a screen is exactly one view tall
const SCREEN_W = 1672 * BG_SCALE;           // ~794 world px
const SCREEN_H = 941 * BG_SCALE;            // 447
const FLOOR_Y = 368;
const BG_Y = FLOOR_Y - 930 * BG_SCALE;      // ~-74: lifted so the door sills (image row 930) sit on the floor
const FEATHER_PX = 240;
const FEATHER = FEATHER_PX * BG_SCALE;
const X = (screen, imageX = 0) => screen * (SCREEN_W - FEATHER) + imageX * BG_SCALE;
const OUT_W = Math.round(X(4) + SCREEN_W);  // outside ends at the right edge of the door screen
const ROOM_X = 3800;                        // the hall sits in its own stretch of the world
const RX = (screen, imageX = 0) => ROOM_X + X(screen, imageX);
const ROOM_END = Math.round(RX(1) + SCREEN_W);
const BGY = (imageY) => BG_Y + imageY * BG_SCALE;
const BG_EXT = 110;    // screens continue below the art (a mirrored strip) so chasms fade out instead of ending in a hard edge

// ---------------------------------------------------------------- sprites (assets/level2/sprites, measured)
// Tower: 474 x 744 (tower.png and tower_ladder.png share the canvas). roofY = where feet stand on the roof.
const TOWER = { w: 474, h: 744, cx: 235.2, roofY: 108, baseY: 729.6, roofL: 43, roofR: 427, ladderX: 339.3 };
const TOWER_SCALE = 0.325;
const TOWER_ROOF_Y = Math.round(FLOOR_Y + 4 - (TOWER.baseY - TOWER.roofY) * TOWER_SCALE);   // ~170
// Pillars: floor pillars stand on the floor, long pillars rise out of a chasm. surface = feet row from the top.
const PILLAR_ART = {
  small: { src: 'pillar_small.png', w: 168, h: 191, surface: 12, cap: 0.86 },
  medium: { src: 'pillar_medium.png', w: 184, h: 288, surface: 12, cap: 0.86 },
  tall: { src: 'pillar_tall.png', w: 212, h: 411, surface: 12, cap: 0.86 },
  long: { src: 'pillar_long.png', w: 217, h: 929, surface: 14, cap: 0.84 }
};
const FLOOR_PILLAR_SCALE = 0.29;
const PIT_PILLAR_SCALE = 0.24;
// Stone sheets: 6 frames each. Ball frames are centred; slab frames are aligned on the stone's top edge.
const BALL = { frameW: 196, frameH: 256, anchorX: 97.5, anchorY: 129, bottom: 254, scale: 0.25 };
const SLAB = { frameW: 202, frameH: 234, anchorX: 101, anchorY: 3, slabL: 24, slabR: 178, scale: 0.42 };
const ARCHER_ART = { frameW: 156, frameH: 130, anchorX: 79, anchorY: 128.5, scale: 0.5, handX: 14, handY: -33, barY: -70, height: 58 };
const KEY = { w: 200, h: 178, draw: 30 };
const SHRINE = { w: 360, h: 354, draw: 84 };
const TRISHUL_UP = { w: 77, h: 300, draw: 58 };

const PIT_DAMAGE = 3;

function img(src) {
  const i = new Image();
  i.src = src;
  return i;
}
const ready = (i) => i && i.complete && i.naturalWidth > 0;

function freshProgress() {
  return {
    introDone: false, qUnlocked: false,
    archerA: false, slabsRaised: false, archerB: false, keyTaken: false, door1Open: false,
    inRoom: false, trishulTaken: false, archerC: false, hordeStarted: false, hordeCleared: false,
    said: {}     // one-off Kali lines already spoken
  };
}

export class Level2 {
  constructor() {
    this.levelIndex = 2;
    this.minX = 0;
    this.width = OUT_W;
    this.height = SCREEN_H;
    this.deathY = 500;
    this.pitDamage = PIT_DAMAGE;

    // ------------------------------------------------------------ art
    const B = 'assets/level2/bg/', S = 'assets/level2/sprites/';
    this.bg = {
      portal: img(B + 'portal.jpg'), filler: img(B + 'filler.jpg'),
      doorClosed: img(B + 'door_closed.jpg'), doorOpen: img(B + 'door_open.jpg'),
      roomEntrance: img(B + 'room_entrance.jpg'),
      roomEndClosed: img(B + 'room_end_closed.jpg'), roomEndOpen: img(B + 'room_end_open.jpg')
    };
    this.towerImg = img(S + 'tower.png');
    this.towerLadderImg = img(S + 'tower_ladder.png');
    this.pillarImgs = Object.fromEntries(Object.entries(PILLAR_ART).map(([k, v]) => [k, img(S + v.src)]));
    this.ballSheet = img(S + 'stone_ball_sheet.png');
    this.slabSheet = img(S + 'stone_slab_sheet.png');
    this.keyImg = img(S + 'key.png');
    this.shrineImg = img(S + 'shrine.png');
    this.trishulImg = img('assets/weapons/trishul_upright.png');
    this.platformArt = new PlatformArt('desert');
    this.enemySprites = new EnemySpriteSheet();
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

    // ------------------------------------------------------------ outside geometry
    this.portal = { x: X(0, 270), y: BGY(475), spawnX: 205 };
    this.floors = [
      { x1: 0, x2: 1420, area: 'out' },
      { x1: 1795, x2: 2330, area: 'out' },
      { x1: 2650, x2: OUT_W, area: 'out' },
      { x1: ROOM_X, x2: ROOM_END, area: 'room' }
    ];
    this.pits = [{ x1: 1420, x2: 1795 }, { x1: 2330, x2: 2650 }];
    this.pillars = [
      { art: 'small', cx: 470 },
      { art: 'medium', cx: 600 },
      { art: 'long', cx: 2405, top: 330 },
      { art: 'long', cx: 2495, top: 302 },
      { art: 'long', cx: 2582, top: 322 },
      { art: 'medium', cx: ROOM_X + 380 },
      { art: 'medium', cx: ROOM_X + 1190 }
    ];
    for (const p of this.pillars) {
      const a = PILLAR_ART[p.art];
      p.scale = p.art === 'long' ? PIT_PILLAR_SCALE : FLOOR_PILLAR_SCALE;
      if (p.top === undefined) p.top = Math.round(FLOOR_Y + 3 - (a.h - a.surface) * p.scale);
      p.half = (a.w * p.scale * a.cap) / 2;
      p.area = p.cx >= ROOM_X ? 'room' : 'out';
    }

    // Towers: two outside, one in the hall. Archers stand on their roofs.
    this.towers = [
      { id: 'T1', cx: 1185, area: 'out' },
      { id: 'T2', cx: 2085, area: 'out' },
      { id: 'T3', cx: ROOM_X + 905, area: 'room' }
    ];
    const roofHalf = ((TOWER.roofR - TOWER.roofL) / 2) * TOWER_SCALE - 8;
    for (const t of this.towers) {
      t.roof = { x1: t.cx - roofHalf, x2: t.cx + roofHalf, y: TOWER_ROOF_Y };
      t.ladderX = t.cx + (TOWER.ladderX - TOWER.cx) * TOWER_SCALE;
    }
    this.ladderShown = 0;   // tower 2's ladder (0 hidden .. 1 fully drawn)
    this.ladders = [];

    // Archers
    const archer = (id, x, y) => new Archer(x, y, id, ARCHER_ART);
    this.archers = {
      A: archer('A', this.towers[0].cx, TOWER_ROOF_Y),
      B: archer('B', this.towers[1].cx, TOWER_ROOF_Y),
      C: archer('C', this.towers[2].cx, TOWER_ROOF_Y),
      H1: archer('H1', ROOM_X + 380, this.pillars[5].top),
      H2: archer('H2', ROOM_X + 1190, this.pillars[6].top)
    };
    this.archers.H1.shootCooldown = 3.4;   // two at once: give Rakti room to breathe
    this.archers.H2.shootCooldown = 3.4;
    this.archers.A.crushOnly = true;    // only Kali's stone reaches them
    this.archers.B.crushOnly = true;

    // [Q] stones: boulders that become spheres hurled at an archer, and floating rocks that become platforms
    const ballCY = FLOOR_Y + 2 - (BALL.bottom - BALL.anchorY) * BALL.scale;
    this.balls = [
      { id: 'ball1', x: 1005, y: ballCY, target: 'A', state: 'idle', t: 0 },
      { id: 'ball2', x: 1905, y: ballCY, target: 'B', state: 'idle', t: 0 }
    ];
    this.slabs = [
      { cx: 1490, top: 336 },
      { cx: 1608, top: 306 },
      { cx: 1722, top: 326 }
    ].map((s, i) => ({ ...s, state: 'raw', t: 0, delay: 0, phase: i * 1.7 }));

    // Sun Key over tower 2, the sun door, the hall door
    this.key = { x: this.towers[1].cx, y: TOWER_ROOF_Y - 32, shown: 0, taken: false, fly: 0, fromX: 0, fromY: 0 };
    this.door1 = { cx: X(4, 1457), x1: X(4, 1390), x2: X(4, 1525), midY: BGY(620), anim: 0 };
    this.door2 = { cx: RX(1, 1450), x1: RX(1, 1345), x2: RX(1, 1555), midY: BGY(610), anim: 0 };

    // The hall: shrine with the Trishul
    this.shrine = { x: ROOM_X + 560, y: FLOOR_Y + 2 };
    this.trishulFly = 0;

    // Betal: one before the sun door, three in the hall's horde
    this.betals = [
      new Betal(3010, 2760, 3220, FLOOR_Y),
      new Betal(ROOM_X + 250, ROOM_X + 120, ROOM_X + 335, FLOOR_Y),
      new Betal(ROOM_X + 1060, ROOM_X + 440, ROOM_X + 1140, FLOOR_Y),
      new Betal(ROOM_X + 1330, ROOM_X + 1240, ROOM_X + 1440, FLOOR_Y)
    ];
    this.betals[0].area = 'out';
    for (const b of this.betals.slice(1)) { b.area = 'room'; b.horde = true; }

    // Checkpoints: 0 portal, 1 past tower 1, 2 past tower 2, 3 hall entrance, 4 at the shrine
    this.checkpoints = [
      { x: this.portal.spawnX, area: 'out' },
      { x: 1300, area: 'out' },
      { x: 2235, area: 'out' },
      { x: ROOM_X + 150, area: 'room' },
      { x: ROOM_X + 560, area: 'room' }
    ];
    this.checkpointIndex = 0;
    this.saved = freshProgress();
    this.progress = freshProgress();

    this.artCache = new Map();
    this.artScale = 0;
    this.animTime = 0;
    this.cameraShake = 0;
    this.killToastText = '';
    this.killToastTimer = 0;
    this.pendingDialogue = null;
    this.screenFade = 0;
    this.isCompleted = false;
    this.reset();
  }

  // ======================================================================== state
  /** Called by the engine when Rakti arrives from another level (not on death or [R]). */
  freshStart() {
    this.checkpointIndex = 0;
    this.saved = freshProgress();
  }

  saveCheckpoint(i, toast = true) {
    this.checkpointIndex = i;
    this.saved = JSON.parse(JSON.stringify(this.progress));
    if (toast) {
      this.killToastText = '✦ CHECKPOINT ✦';
      this.killToastTimer = 1.6;
    }
  }

  getRespawnPoint() {
    const cp = this.checkpoints[this.checkpointIndex] || this.checkpoints[0];
    return { x: cp.x, y: FLOOR_Y };
  }

  playerHasTrishul() {
    return this.progress.trishulTaken;
  }

  /** The intro (Rakti stepping out of the portal) is still to play; the engine hides her until then. */
  get introPending() {
    return !this.progress.introDone;
  }

  /** Back to the last checkpoint: everything Rakti had done by then stays done. */
  reset() {
    const p = this.progress = JSON.parse(JSON.stringify(this.saved));
    this.animTime = 0;
    this.cameraShake = 0;
    this.killToastTimer = 0;
    this.pendingDialogue = null;
    this.screenFade = 0;
    this.isCompleted = false;
    this.transition = null;
    this.intro = p.introDone ? null : { t: 0 };
    this.particles = [];
    this.setArea(p.inRoom ? 'room' : 'out');

    for (const [id, a] of Object.entries(this.archers)) {
      a.reset();
      a.dormant = true;
      a.hidden = false;
      a.gone = false;
      a.appear = 1;
      const dead = (id === 'A' && p.archerA) || (id === 'B' && p.archerB) || (id === 'C' && p.archerC)
        || ((id === 'H1' || id === 'H2') && p.hordeCleared);
      if (dead) { a.alive = false; a.gone = true; a.arrows = []; a.attachedArrow = null; }
      if ((id === 'H1' || id === 'H2') && !p.hordeCleared) a.hidden = true;   // they arrive with the horde
    }
    this.balls[0].state = p.archerA ? 'gone' : 'idle';
    this.balls[1].state = p.archerB ? 'gone' : 'idle';
    for (const b of this.balls) { b.t = 0; b.trail = []; }
    for (const s of this.slabs) { s.state = p.slabsRaised ? 'solid' : 'raw'; s.t = 0; s.delay = 0; }
    this.ladderShown = p.archerB ? 1 : 0;
    this.key.shown = p.archerB && !p.keyTaken ? 1 : 0;
    this.key.taken = p.keyTaken;
    this.key.fly = p.keyTaken ? 1 : 0;
    this.door1.anim = p.door1Open ? 1 : 0;
    this.door1.keyFly = p.door1Open ? 1 : 0;
    this.door2.anim = p.hordeCleared ? 1 : 0;
    this.trishulFly = p.trishulTaken ? 1 : 0;
    this.hordeTimer = -1;
    for (const b of this.betals) {
      b.reset();
      if (b.horde) {
        b.hidden = true;
        if (p.hordeCleared) { b.dead = true; b.removed = true; b.hidden = false; }
      }
    }
    this.updateLadders();
  }

  setArea(area) {
    this.area = area;
    if (area === 'room') { this.minX = ROOM_X; this.width = ROOM_END; }
    else { this.minX = 0; this.width = OUT_W; }
  }

  updateLadders() {
    const t = this.towers[1];
    this.ladders = this.ladderShown >= 1 ? [{ x: t.ladderX, y1: TOWER_ROOF_Y, y2: FLOOR_Y }] : [];
  }

  // ======================================================================== geometry
  getPlatforms() {
    const list = [];
    for (const f of this.floors) if (f.area === this.area) list.push({ id: 'floor', x1: f.x1, x2: f.x2, y: FLOOR_Y, oneWay: false });
    for (const p of this.pillars) if (p.area === this.area) list.push({ id: 'pillar', x1: p.cx - p.half, x2: p.cx + p.half, y: p.top, oneWay: false });
    for (const t of this.towers) if (t.area === this.area) list.push({ id: 'roof', x1: t.roof.x1, x2: t.roof.x2, y: t.roof.y, oneWay: true });
    if (this.area === 'out') {
      for (const s of this.slabs) if (s.state === 'solid') list.push({ id: 'slab', ...this.slabBox(s), oneWay: true });
    }
    return list;
  }

  slabBox(s) {
    const k = SLAB.scale;
    return { x1: s.cx - (SLAB.anchorX - SLAB.slabL) * k + 5, x2: s.cx + (SLAB.slabR - SLAB.anchorX) * k - 5, y: s.top + 5 };
  }

  checkPlatformLanding(prevY, currY, x, droppingThrough = false, isDivine = false) {
    for (const plat of this.getPlatforms()) {
      if (x < plat.x1 || x > plat.x2) continue;
      if (plat.oneWay && droppingThrough) continue;
      if (prevY <= plat.y + 6 && currY >= plat.y - 2) return plat;
    }
    return null;
  }

  isOnPlatform(x, y, isDivine = false) {
    for (const plat of this.getPlatforms()) {
      if (x >= plat.x1 - 2 && x <= plat.x2 + 2 && Math.abs(y - plat.y) <= 4) return plat;
    }
    return null;
  }

  /** Pillar sides are solid; the hall's entrance arch is a wall behind her. */
  resolvePitWallCollision(x, y) {
    for (const p of this.pillars) {
      if (p.area !== this.area) continue;
      const half = p.half + 7;
      if (y > p.top + 5 && Math.abs(x - p.cx) < half) x = x < p.cx ? p.cx - half : p.cx + half;
    }
    return x;
  }

  // ======================================================================== interactions
  getNearbyInteractable(px, py) {
    const p = this.progress;
    if (this.transition || this.intro) return null;
    if (this.area === 'out') {
      // Sun Key over tower 2's roof
      const t2 = this.towers[1];
      if (this.key.shown >= 1 && !this.key.taken && Math.abs(px - this.key.x) < 44 && Math.abs(py - t2.roof.y) < 8) {
        return {
          type: 'l2_key', x: this.key.x, y: this.key.y, prompt: '[E] TAKE THE SUN KEY', speaker: 'kali', title: '⚜ THE SUN KEY ⚜',
          text: 'The Sun Key. The archers guarded it with their lives. The great door at the end of these sands has waited a long time for it, Rakti.',
          onInteract: () => this.takeKey()
        };
      }
      // The sun door
      if (Math.abs(px - this.door1.cx) < 80 && Math.abs(py - FLOOR_Y) < 6 && !p.door1Open) {
        if (p.keyTaken) {
          return {
            type: 'l2_door', x: this.door1.cx, y: FLOOR_Y, prompt: '[E] UNLOCK THE SUN DOOR', speaker: 'kali', title: '⚜ THE SUN DOOR ⚜',
            text: 'The key turns, and the sun-seals answer. Go in, Rakti. Whatever waits inside has been waiting for you.',
            onInteract: () => this.openSunDoor()
          };
        }
        return {
          type: 'inspection', x: this.door1.cx, y: FLOOR_Y, prompt: '[E] SEALED DOOR', speaker: 'stele', title: '⚜ THE SUN DOOR ⚜',
          text: 'A sun-shaped lock holds the great doors shut. Its key must lie somewhere in these sands, where the archers keep watch.'
        };
      }
      // [Q] hints once Kali has taught it
      if (p.qUnlocked) {
        const ball = this.balls.find((b) => b.state === 'idle' && Math.abs(px - b.x) < 170 && Math.abs(py - FLOOR_Y) < 8);
        if (ball) {
          return {
            type: 'inspection', x: ball.x, y: FLOOR_Y, prompt: '[Q] HURL THE BOULDER', speaker: 'kali', title: '⚜ MAA KALI ⚜',
            text: 'Stand by the stone and press [Q]. I will shape it, and send it where your enemy stands.'
          };
        }
        if (this.slabs.some((s) => s.state === 'raw') && px > 1260 && px < 1440) {
          return {
            type: 'inspection', x: 1420, y: FLOOR_Y, prompt: '[Q] RAISE THE STONES', speaker: 'kali', title: '⚜ MAA KALI ⚜',
            text: 'The floating rocks are rough and will not hold you. Press [Q] and I will press them flat into a path.'
          };
        }
      }
      return null;
    }
    // The hall
    if (!p.trishulTaken && Math.abs(px - this.shrine.x) < 52 && Math.abs(py - FLOOR_Y) < 8) {
      return {
        type: 'l2_trishul', x: this.shrine.x, y: FLOOR_Y, prompt: '[E] TAKE THE TRISHUL', speaker: 'kali', title: '⚜ THE TRISHUL ⚜',
        text: 'My Trishul, Rakti. Press [2] to take it up and [1] to return to your talwar. Strike to throw it: it flies to the enemy before you and always comes back to your hand. Now - that archer on the tower.',
        onInteract: () => this.takeTrishul()
      };
    }
    if (this.door2.anim < 1 && Math.abs(px - this.door2.cx) < 70 && Math.abs(py - FLOOR_Y) < 6) {
      return {
        type: 'inspection', x: this.door2.cx, y: FLOOR_Y, prompt: '[E] SEALED DOOR', speaker: 'stele', title: '⚜ THE HALL DOOR ⚜',
        text: 'Sun-sigils burn across the doors. They will not open while the guardians of this hall still stand.'
      };
    }
    return null;
  }

  takeKey() {
    if (this.key.taken) return;
    this.key.taken = true;
    this.key.fly = 0;
    this.key.fromX = this.key.x;
    this.key.fromY = this.key.y;
    this.progress.keyTaken = true;
    this.cameraShake = 0.3;
    this.killToastText = '⚜ SUN KEY ⚜';
    this.killToastTimer = 2;
  }

  openSunDoor() {
    if (this.progress.door1Open) return;
    this.progress.door1Open = true;
    this.door1.keyFly = 0;
    this.cameraShake = 0.5;
  }

  takeTrishul() {
    if (this.progress.trishulTaken) return;
    this.progress.trishulTaken = true;
    this.trishulFly = 0;
    this.cameraShake = 0.5;
    if (this.player) {
      this.player.hasTrishul = true;
      this.player.weapon = 'trishul';
      this.player.hp = this.player.maxHp;   // Kali's blessing comes with the weapon
    }
    const flash = typeof document !== 'undefined' && document.getElementById('divineFlash');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 250);
    }
    this.saveCheckpoint(4, false);
  }

  checkLevelComplete(px, py) {
    if (this.isCompleted || this.area !== 'room' || this.door2.anim < 0.95) return false;
    if (Math.abs(px - this.door2.cx) < 26 && Math.abs(py - FLOOR_Y) < 6) {
      this.isCompleted = true;
      return true;
    }
    return false;
  }

  // ======================================================================== [Q] Kali's earth power
  castQ(player) {
    const p = this.progress;
    if (!p.qUnlocked || this.transition || this.intro || !player || player.isDead) return;
    if (!player.isGrounded || player.isCasting || player.isClimbing) return;
    if (this.area !== 'out') {
      this.toast('✧ NOTHING HERE ANSWERS ✧', 1.2);
      return;
    }
    const px = player.x;
    const ball = this.balls
      .filter((b) => b.state === 'idle' && Math.abs(px - b.x) < 170)
      .sort((a, b) => Math.abs(px - a.x) - Math.abs(px - b.x))[0];
    const raw = this.slabs.filter((s) => s.state === 'raw' && Math.abs(px - s.cx) < 340);
    if (ball && (!raw.length || Math.abs(px - ball.x) < Math.abs(px - raw[0].cx))) {
      player.startCast(() => this.hurlBall(ball), ball.x);
    } else if (raw.length) {
      player.startCast(() => this.raiseSlabs(), raw[0].cx);
    } else {
      this.toast('✧ NOTHING HERE ANSWERS ✧', 1.2);
    }
  }

  hurlBall(ball) {
    if (ball.state !== 'idle') return;
    ball.state = 'forming';
    ball.t = 0;
    this.cameraShake = Math.max(this.cameraShake, 0.25);
    this.burst(ball.x, ball.y, 18, ['#b8ffcf', '#ffe9a0', '#c8955a']);
  }

  raiseSlabs() {
    let i = 0;
    for (const s of this.slabs) {
      if (s.state !== 'raw') continue;
      s.state = 'forming';
      s.t = 0;
      s.delay = i++ * 0.18;
    }
    this.progress.slabsRaised = true;
    this.cameraShake = Math.max(this.cameraShake, 0.3);
  }

  toast(text, time = 1.8) {
    this.killToastText = text;
    this.killToastTimer = time;
  }

  say(id, title, text, flash = false) {
    if (this.progress.said[id]) return;
    this.progress.said[id] = true;
    this.pendingDialogue = { speaker: 'kali', title, text, flash };
  }

  burst(x, y, n, colors, speed = 90, life = 0.6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life, maxLife: life,
        size: 1.5 + Math.random() * 2.5, color: colors[i % colors.length], g: 120
      });
    }
  }

  registerKill(enemy) {
    if (enemy instanceof Archer) this.toast('⚔ ARCHER SLAIN', 1.6);
    const p = this.progress;
    if (enemy === this.archers.C && !p.archerC) {
      p.archerC = true;
      this.hordeTimer = 1.2;
    }
  }

  /** Enemies the Trishul can hit (only in the area Rakti is in). */
  getDamageables() {
    const list = [];
    for (const a of Object.values(this.archers)) {
      if (!a.alive || a.hidden || a.crushOnly) continue;
      if (this.isRoomX(a.x) !== (this.area === 'room')) continue;
      list.push(a);
    }
    for (const b of this.betals) if (!b.dead && !b.hidden && b.area === this.area) list.push(b);
    return list;
  }

  isRoomX(x) {
    return x >= ROOM_X;
  }

  // ======================================================================== update
  update(playerX, playerY, dt, isDivine = false, player = null) {
    this.player = player;
    this.animTime += dt;
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2.0);
    if (this.killToastTimer > 0) this.killToastTimer -= dt;
    const p = this.progress;
    const talking = Boolean(player?.dialogueOpen);

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += (q.g || 0) * dt;
      if (q.life <= 0) this.particles.splice(i, 1);
    }

    // ---------------------------------------------------- arriving through the portal
    if (this.intro && player) {
      const it = this.intro;
      it.t += dt;
      player.inputLocked = true;
      player.facing = 'right';
      player.spawnAlpha = Math.max(0, Math.min(1, (it.t - 0.7) / 0.45));
      if (it.t > 0.55 && it.t < 1.1 && Math.random() < 0.8) {
        // light streams from the rift to where she appears
        const k = Math.random();
        this.particles.push({
          x: this.portal.x + (this.portal.spawnX - this.portal.x) * k, y: this.portal.y + (FLOOR_Y - 34 - this.portal.y) * k,
          vx: 60, vy: 10, life: 0.4, maxLife: 0.4, size: 2 + Math.random() * 2, color: Math.random() > 0.4 ? '#9ff6ff' : '#ffffff'
        });
      }
      if (it.t >= 0.7 && !it.flashed) {
        it.flashed = true;
        this.burst(player.x, player.y - 30, 26, ['#9ff6ff', '#ffffff', '#ffe39a'], 110, 0.7);
        this.cameraShake = 0.3;
      }
      if (it.t >= 1.5) {
        this.intro = null;
        player.inputLocked = false;
        player.spawnAlpha = 1;
        p.introDone = true;
        this.saveCheckpoint(0, false);
        this.say('intro', '⚜ MAA KALI ⚜',
          'You came through, Rakti. These are the Sun Wastes. The Sun Disc lies beyond a great sealed door to the east, and the Asura keep watch from their towers. Keep moving, and listen for me.');
      }
      return;
    }

    // ---------------------------------------------------- walking through a door into the hall
    if (this.transition && player) {
      const tr = this.transition;
      tr.t += dt;
      player.inputLocked = true;
      if (tr.t < 0.5) {
        this.screenFade = tr.t / 0.5;
        player.spawnAlpha = 1 - tr.t / 0.5;
      } else if (!tr.moved) {
        tr.moved = true;
        p.inRoom = true;
        this.setArea('room');
        player.x = ROOM_X + 150;
        player.y = FLOOR_Y;
        player.vx = 0;
        player.vy = 0;
        player.isGrounded = true;
        player.currentPlatform = null;
        player.facing = 'right';
        player.trishul = null;
        this.requestCameraSnap = true;
        this.saveCheckpoint(3, false);
        this.toast('⚜ HALL OF THE SUN ⚜', 2.4);
      } else {
        const k = (tr.t - 0.5) / 0.5;
        this.screenFade = Math.max(0, 1 - k);
        player.spawnAlpha = Math.min(1, k);
        if (k >= 1) {
          this.transition = null;
          this.screenFade = 0;
          player.inputLocked = false;
          player.spawnAlpha = 1;
          this.say('hall', '⚜ MAA KALI ⚜',
            'A hall of the sun-kings. Something in here still burns with my light. Find it, Rakti, before its guardians find you.');
        }
      }
      return;
    }

    // ---------------------------------------------------- outside
    if (this.area === 'out') {
      // Kali teaches [Q] as Rakti nears the first tower
      if (!p.qUnlocked && playerX >= 790) {
        p.qUnlocked = true;
        this.say('q', '⚜ MAA KALI: THE EARTH REMEMBERS ⚜',
          'That archer stands where no leap can reach, Rakti. But this earth remembers me. Stand by the boulder and press [Q]: I will shape the stone and hurl it at him.', true);
      }
      if (p.qUnlocked && !p.slabsRaised && playerX >= 1270 && playerX < 1440) {
        this.say('slabs', '⚜ MAA KALI ⚜', 'Rocks float over the chasm, too rough to stand on. Press [Q] here and I will flatten them into a path.');
      }

      // archers on the two towers: they shoot once Rakti comes near
      const A = this.archers.A, Bq = this.archers.B;
      A.dormant = !(playerX > 700 && playerX < A.x + 560);
      Bq.dormant = !(playerX > 1640 && playerX < Bq.x + 560);
      if (!talking) for (const id of ['A', 'B']) this.updateArcher(this.archers[id], dt, player);

      // boulders: forming -> flying in an arc onto the tower top -> falling away
      for (const b of this.balls) this.updateBall(b, dt);
      // floating rocks: bob until [Q], then flatten into slabs
      for (const s of this.slabs) {
        if (s.state === 'forming') {
          if (s.delay > 0) { s.delay -= dt; continue; }
          s.t += dt;
          if (Math.random() < 0.5) this.burst(s.cx + (Math.random() - 0.5) * 30, s.top + 20, 1, ['#9ff6e8', '#ffe39a'], 40, 0.5);
          if (s.t >= 0.6) {
            s.state = 'solid';
            this.burst(s.cx, s.top + 10, 12, ['#c8955a', '#9ff6e8', '#ffe39a'], 70, 0.5);
            this.cameraShake = Math.max(this.cameraShake, 0.15);
          }
        }
      }

      // tower 2: the ladder unfurls and the key appears once its archer has fallen
      if (p.archerB) {
        if (this.ladderShown < 1) {
          this.ladderShown = Math.min(1, this.ladderShown + dt / 0.9);
          if (Math.random() < 0.9) {
            const t2 = this.towers[1];
            this.burst(t2.ladderX + (Math.random() - 0.5) * 10, TOWER_ROOF_Y + Math.random() * (FLOOR_Y - TOWER_ROOF_Y), 1, ['#ffe39a', '#ffffff'], 30, 0.6);
          }
          if (this.ladderShown >= 1) this.updateLadders();
        }
        if (!this.key.taken && this.key.shown < 1) this.key.shown = Math.min(1, this.key.shown + dt / 1.0);
      }
      if (this.key.taken && this.key.fly < 1) this.key.fly = Math.min(1, this.key.fly + dt * 1.5);

      // the sun door: the key flies into the lock, then the doors swing open
      if (p.door1Open && this.door1.anim < 1) {
        this.door1.keyFly = Math.min(1, (this.door1.keyFly ?? 0) + dt * 1.6);
        if (this.door1.keyFly >= 1) {
          this.door1.anim = Math.min(1, this.door1.anim + dt / 1.4);
          this.cameraShake = Math.max(this.cameraShake, 0.2);
          if (this.door1.anim >= 1) this.toast('⚜ THE SUN DOOR OPENS ⚜', 2.2);
        }
      }

      // Betal before the door
      this.betals[0].update(dt, player, this, !talking);

      if (player && !player.isDead && player.isGrounded) {
        // checkpoints past each tower
        for (let i = this.checkpointIndex + 1; i <= 2; i++) {
          if (playerX >= this.checkpoints[i].x) this.saveCheckpoint(i);
        }
        // into the hall
        if (this.door1.anim >= 1 && Math.abs(playerX - this.door1.cx) < 22 && Math.abs(playerY - FLOOR_Y) < 4) {
          this.transition = { t: 0, moved: false };
          player.inputLocked = true;
        }
      }
      return;
    }

    // ---------------------------------------------------- the hall
    if (this.trishulFly < 1 && p.trishulTaken) this.trishulFly = Math.min(1, this.trishulFly + dt * 1.6);
    const C = this.archers.C;
    C.dormant = !p.trishulTaken;
    if (!talking) this.updateArcher(C, dt, player);

    // the horde wakes when the tower archer falls
    if (this.hordeTimer > 0) {
      this.hordeTimer -= dt;
      if (this.hordeTimer <= 0) this.startHorde();
    }
    for (const id of ['H1', 'H2']) {
      const a = this.archers[id];
      if (a.hidden) continue;
      if (a.appear < 1) a.appear = Math.min(1, a.appear + dt * 2);
      a.dormant = a.appear < 1;
      if (!talking) this.updateArcher(a, dt, player);
    }
    for (const b of this.betals) if (b.horde) b.update(dt, player, this, !talking);

    if (p.hordeStarted && !p.hordeCleared) {
      const alive = this.betals.some((b) => b.horde && !b.dead) || this.archers.H1.alive || this.archers.H2.alive;
      if (!alive) {
        p.hordeCleared = true;
        this.cameraShake = 0.6;
        this.say('cleared', '⚜ MAA KALI ⚜', 'The hall is quiet. Look - the sun-door wakes. It will carry you onward, Rakti. Go.');
      }
    }
    if (p.hordeCleared && this.door2.anim < 1) {
      this.door2.anim = Math.min(1, this.door2.anim + dt / 1.6);
      if (this.door2.anim >= 1) this.toast('⚜ THE PORTAL IS OPEN ⚜', 2.8);
    }
  }

  startHorde() {
    const p = this.progress;
    if (p.hordeStarted) return;
    p.hordeStarted = true;
    this.cameraShake = 0.8;
    for (const b of this.betals) if (b.horde) { b.hidden = false; b.fadeAlpha = 0; }
    for (const id of ['H1', 'H2']) {
      const a = this.archers[id];
      a.hidden = false;
      a.appear = 0;
      a.cooldownTimer = 1.6 + (id === 'H2' ? 0.8 : 0);
      this.burst(a.x, a.y - 30, 18, ['#ff6a4a', '#ffd27a', '#3a2a20'], 90, 0.6);
    }
    this.toast('⚜ THE HALL AWAKENS ⚜', 2.4);
    this.pendingDialogue = {
      speaker: 'kali', title: '⚜ MAA KALI ⚜',
      text: 'It was a trap - the hall wakes! Betal at your sides, archers on the pillars. Keep the Trishul flying, Rakti, and do not stand still.'
    };
  }

  updateArcher(a, dt, player) {
    if (a.gone || a.hidden) return;
    a.update(dt, player, this);
    // the flying Trishul shatters any arrow it passes through
    const tr = player?.trishul;
    if (tr) {
      for (let i = a.arrows.length - 1; i >= 0; i--) {
        const ar = a.arrows[i];
        if (Math.hypot(ar.x - tr.x, ar.y - tr.y) < 20) {
          this.burst(ar.x, ar.y, 8, ['#ffd700', '#885533', '#9ff6ff'], 80, 0.35);
          a.arrows.splice(i, 1);
        }
      }
    }
    if (!a.alive) {
      // after the death frames he fades away completely
      a.goneT = (a.goneT || 0) + dt;
      if (a.goneT > 1.6) a.fadeAlpha = Math.max(0, 0.6 - (a.goneT - 1.6) * 1.2);
      if (a.goneT > 2.1 && a.arrows.length === 0) a.gone = true;
    } else {
      a.goneT = 0;
    }
  }

  updateBall(b, dt) {
    if (b.state === 'idle' || b.state === 'gone') return;
    b.t += dt;
    if (b.state === 'forming') {
      if (Math.random() < 0.6) this.burst(b.x + (Math.random() - 0.5) * 40, b.y + (Math.random() - 0.5) * 40, 1, ['#9ff6e8', '#ffe39a'], 30, 0.5);
      if (b.t >= 0.6) {
        b.state = 'flying';
        b.t = 0;
        const target = this.archers[b.target];
        b.from = { x: b.x, y: b.y };
        b.to = { x: target.x, y: target.y - 22 };
        b.spin = 0;
        this.cameraShake = Math.max(this.cameraShake, 0.3);
      }
      return;
    }
    if (b.state === 'flying') {
      const dur = 0.85, u = Math.min(1, b.t / dur);
      b.x = b.from.x + (b.to.x - b.from.x) * u;
      b.y = b.from.y + (b.to.y - b.from.y) * u - Math.sin(u * Math.PI) * 110;
      b.spin += dt * 9;
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 12) b.trail.shift();
      if (u >= 1) {
        const target = this.archers[b.target];
        target.die('crushed');
        this.registerKill(target);
        if (b.target === 'A') this.progress.archerA = true;
        if (b.target === 'B') {
          this.progress.archerB = true;
          this.say('ladder', '⚜ MAA KALI ⚜', 'He was guarding something. A ladder has unfurled on his tower - climb it, Rakti, and see what waits on top.');
        }
        this.cameraShake = 0.9;
        this.burst(b.x, b.y, 30, ['#c8955a', '#ffe39a', '#9ff6e8', '#7a4f2a'], 150, 0.8);
        b.state = 'falling';
        b.t = 0;
        b.vx = 150;
        b.vy = -160;
      }
      return;
    }
    if (b.state === 'falling') {
      b.vy += 900 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 6;
      b.trail.shift();
      if (b.y > FLOOR_Y - 12 && !b.landed) {
        b.landed = true;
        b.vy = -b.vy * 0.25;
        this.burst(b.x, FLOOR_Y - 6, 20, ['#c8955a', '#7a4f2a', '#ffe39a'], 110, 0.7);
        this.cameraShake = Math.max(this.cameraShake, 0.4);
      }
      if (b.t > 1.4) b.state = 'gone';
    }
  }

  // ======================================================================== rendering
  updateArtScale(ctx) {
    const a = ctx.getTransform().a || 1;
    const k = Math.max(1, Math.min(4, Math.ceil(a * 4) / 4));
    if (k !== this.artScale) { this.artScale = k; this.artCache.clear(); }
  }

  /** `paint` drawn once at w x h world px and device resolution; each frame is then a cheap copy. */
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

  screenCanvas(key, image, { mirror = false, feather = true } = {}) {
    return this.cachedArt('scr:' + key, SCREEN_W, SCREEN_H + BG_EXT, ready(image), (g) => {
      g.save();
      if (mirror) { g.translate(SCREEN_W, 0); g.scale(-1, 1); }
      g.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
      // the ground continues below the art as a reflection of its bottom rows
      g.translate(0, SCREEN_H * 2);
      g.scale(1, -1);
      g.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
      g.restore();
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

  drawScreen(ctx, canvas, x, alpha = 1) {
    if (!canvas || alpha <= 0) return;
    if (!this.inView(x, x + SCREEN_W + 1)) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(canvas, x, BG_Y, SCREEN_W + 1, SCREEN_H + BG_EXT);
    ctx.restore();
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
    // deep sand under everything (shows only in the chasms)
    ctx.fillStyle = '#1a0c05';
    ctx.fillRect(this.minX - 20, -20, this.width - this.minX + 40, SCREEN_H + 60);

    if (this.area === 'out') {
      this.drawScreen(ctx, this.screenCanvas('portal', this.bg.portal, { feather: false }), X(0));
      this.drawScreen(ctx, this.screenCanvas('filler', this.bg.filler), X(1));
      this.drawScreen(ctx, this.screenCanvas('filler_m', this.bg.filler, { mirror: true }), X(2));
      this.drawScreen(ctx, this.screenCanvas('filler', this.bg.filler), X(3));
      this.drawScreen(ctx, this.screenCanvas('door_closed', this.bg.doorClosed), X(4));
      if (this.door1.anim > 0) this.drawScreen(ctx, this.screenCanvas('door_open', this.bg.doorOpen), X(4), this.door1.anim);
      this.renderPortalGlow(ctx);
      this.renderDoorGlow(ctx, this.door1, this.progress.keyTaken, false);
    } else {
      this.drawScreen(ctx, this.screenCanvas('room_entrance', this.bg.roomEntrance, { feather: false }), RX(0));
      this.drawScreen(ctx, this.screenCanvas('room_end_closed', this.bg.roomEndClosed), RX(1));
      if (this.door2.anim > 0) this.drawScreen(ctx, this.screenCanvas('room_end_open', this.bg.roomEndOpen), RX(1), this.door2.anim);
      this.renderDoorGlow(ctx, this.door2, this.progress.archerC, true);
    }

    this.renderTowers(ctx);
    this.renderPits(ctx);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (const f of this.floors) if (f.area === this.area && this.inView(f.x1, f.x2)) this.platformArt.draw(ctx, f.x1, f.x2, FLOOR_Y);
    ctx.restore();
    for (const p of this.pillars) if (p.area === this.area) this.drawPillar(ctx, p);

    if (this.area === 'out') {
      for (const s of this.slabs) this.drawSlab(ctx, s);
      this.renderKey(ctx);
      for (const id of ['A', 'B']) this.renderArcher(ctx, this.archers[id]);
      for (const b of this.balls) this.drawBall(ctx, b);
      this.renderDoorKey(ctx);
      this.betals[0].render(ctx, this.enemySprites);
    } else {
      this.renderShrine(ctx);
      for (const id of ['C', 'H1', 'H2']) this.renderArcher(ctx, this.archers[id]);
      for (const b of this.betals) if (b.horde) b.render(ctx, this.enemySprites);
    }
    this.renderParticles(ctx);
    ctx.restore();
  }

  renderParticles(ctx) {
    ctx.save();
    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.maxLife);
      ctx.fillStyle = q.color;
      const s = q.size;
      ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
    }
    ctx.restore();
  }

  renderPits(ctx) {
    if (this.area !== 'out') return;
    for (const pit of this.pits) {
      if (!this.inView(pit.x1, pit.x2)) continue;
      // the chasm: sand darkening into a deep shadow, a little wider than the gap so its walls fall into it
      const top = FLOOR_Y - 46;
      const g = ctx.createLinearGradient(0, top, 0, SCREEN_H);
      g.addColorStop(0, 'rgba(40, 16, 6, 0)');
      g.addColorStop(0.35, 'rgba(34, 13, 5, 0.55)');
      g.addColorStop(0.62, 'rgba(18, 7, 3, 0.9)');
      g.addColorStop(1, 'rgba(8, 3, 1, 1)');
      ctx.fillStyle = g;
      ctx.fillRect(pit.x1 - 6, top, pit.x2 - pit.x1 + 12, SCREEN_H - top + 30);
    }
  }

  /** The rift in the portal ruins: a slow pulse, brighter while Rakti steps out of it. */
  renderPortalGlow(ctx) {
    const P = this.portal;
    if (!this.inView(P.x - 120, P.x + 120)) return;
    const boost = this.intro ? Math.max(0, 1 - Math.abs(this.intro.t - 0.7) / 0.7) : 0;
    const a = 0.16 + Math.sin(this.animTime * 1.8) * 0.05 + boost * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(P.x, P.y, 6, P.x, P.y, 110 + boost * 40);
    g.addColorStop(0, `rgba(140, 250, 255, ${a})`);
    g.addColorStop(0.5, `rgba(60, 170, 255, ${a * 0.35})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(P.x - 160, P.y - 160, 320, 320);
    for (let i = 0; i < 10; i++) {
      const k = (this.animTime * 0.3 + i / 10) % 1;
      const ang = i * 2.39 + this.animTime * 0.7;
      const r = (1 - k) * 48;
      ctx.fillStyle = `rgba(200, 255, 255, ${0.6 * Math.sin(k * Math.PI)})`;
      ctx.fillRect(P.x + Math.cos(ang) * r * 0.55 - 1, P.y + Math.sin(ang) * r - 1, 2, 2);
    }
    ctx.restore();
  }

  /** Sealed: faint golden breathing (brighter once it can be opened). Open: cyan glow and motes drawn inside. */
  renderDoorGlow(ctx, door, primed, portal) {
    const cx = door.cx, cy = door.midY;
    if (!this.inView(cx - 120, cx + 120)) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (door.anim <= 0) {
      const p = (primed ? 0.2 : 0.08) + Math.sin(this.animTime * 2) * 0.05;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70);
      g.addColorStop(0, `rgba(255, 210, 120, ${p})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 72, cy - 72, 144, 144);
      ctx.restore();
      return;
    }
    const o = door.anim;
    const col = portal ? '120, 255, 250' : '255, 200, 120';
    const pulse = 0.28 + Math.sin(this.animTime * 3) * 0.08;
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 110);
    g.addColorStop(0, `rgba(${col}, ${pulse * o})`);
    g.addColorStop(0.5, `rgba(${portal ? '60, 170, 255' : '255, 140, 60'}, ${0.12 * o})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 115, cy - 115, 230, 230);
    for (let i = 0; i < 14; i++) {
      const k = (this.animTime * 0.35 + i / 14) % 1;
      const a = i * 2.39 + this.animTime * 0.6;
      const r = (1 - k) * 46;
      const x = cx + Math.cos(a) * r * 0.7, y = cy + Math.sin(a) * r * 1.4;
      if (y > FLOOR_Y - 2) continue;
      ctx.fillStyle = `rgba(${portal ? '190, 255, 255' : '255, 235, 180'}, ${0.7 * o * Math.sin(k * Math.PI)})`;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.restore();
  }

  renderTowers(ctx) {
    const s = TOWER_SCALE, w = TOWER.w * s, h = TOWER.h * s;
    for (const t of this.towers) {
      if (t.area !== this.area) continue;
      const x = t.cx - TOWER.cx * s, y = FLOOR_Y + 4 - TOWER.baseY * s;
      if (!this.inView(x, x + w)) continue;
      const plain = this.cachedArt('tower', w, h, ready(this.towerImg), (g) => g.drawImage(this.towerImg, 0, 0, w, h));
      const ladderAlpha = t.id === 'T2' ? this.ladderShown : 0;
      if (plain && ladderAlpha < 1) ctx.drawImage(plain, x, y, w, h);
      if (ladderAlpha > 0) {
        const lad = this.cachedArt('tower_ladder', w, h, ready(this.towerLadderImg), (g) => g.drawImage(this.towerLadderImg, 0, 0, w, h));
        if (lad) {
          ctx.save();
          ctx.globalAlpha = ladderAlpha;
          ctx.drawImage(lad, x, y, w, h);
          ctx.restore();
        }
      }
    }
  }

  drawPillar(ctx, p) {
    const art = PILLAR_ART[p.art], im = this.pillarImgs[p.art];
    const w = art.w * p.scale, h = art.h * p.scale;
    if (!this.inView(p.cx - w / 2, p.cx + w / 2)) return;
    const c = this.cachedArt(`pillar:${p.art}:${p.scale}`, w, h, ready(im), (g) => g.drawImage(im, 0, 0, w, h));
    if (!c) return;
    ctx.drawImage(c, p.cx - w / 2, p.top - art.surface * p.scale, w, h);
  }

  /** Floating rock -> (cracks glow, it breaks apart) -> a flat slab of carved stone. */
  drawSlab(ctx, s) {
    const k = SLAB.scale, w = SLAB.frameW * k, h = SLAB.frameH * k;
    if (!this.inView(s.cx - w, s.cx + w)) return;
    let frame = 0, bob = 0, glow = 0;
    if (s.state === 'raw') {
      bob = Math.sin(this.animTime * 1.6 + s.phase) * 3;
      glow = this.progress.qUnlocked ? 0.35 + 0.35 * Math.sin(this.animTime * 3 + s.phase) : 0;
    } else if (s.state === 'forming') {
      frame = Math.min(5, Math.floor(Math.max(0, s.t) / 0.1));
    } else {
      frame = 5;
    }
    const draw = (f, alpha) => {
      const c = this.cachedArt('slab:' + f, w, h, ready(this.slabSheet),
        (g) => g.drawImage(this.slabSheet, f * SLAB.frameW, 0, SLAB.frameW, SLAB.frameH, 0, 0, w, h));
      if (!c) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(c, s.cx - SLAB.anchorX * k, s.top - SLAB.anchorY * k + bob, w, h);
      ctx.restore();
    };
    draw(frame, 1);
    if (glow > 0) draw(1, glow);   // the cracks breathe green once [Q] has been taught
  }

  drawBall(ctx, b) {
    if (b.state === 'gone') return;
    const k = BALL.scale, w = BALL.frameW * k, h = BALL.frameH * k;
    if (!this.inView(b.x - w, b.x + w)) return;
    let frame = 0, glow = 0;
    if (b.state === 'idle') glow = this.progress.qUnlocked ? 0.3 + 0.35 * Math.sin(this.animTime * 3) : 0;
    else if (b.state === 'forming') frame = Math.min(5, Math.floor(b.t / 0.1));
    else frame = 5;
    const cache = (f) => this.cachedArt('ball:' + f, w, h, ready(this.ballSheet),
      (g) => g.drawImage(this.ballSheet, f * BALL.frameW, 0, BALL.frameW, BALL.frameH, 0, 0, w, h));
    // green streak behind the flying sphere
    if (b.trail?.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      b.trail.forEach((p, i) => {
        const a = (i + 1) / b.trail.length;
        ctx.fillStyle = `rgba(150, 255, 200, ${0.35 * a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + 10 * a, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
    const c = cache(frame);
    if (!c) return;
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.spin) ctx.rotate(b.spin);
    if (b.state === 'falling') ctx.globalAlpha = Math.max(0, 1 - Math.max(0, b.t - 0.9) / 0.5);
    ctx.drawImage(c, -BALL.anchorX * k, -BALL.anchorY * k, w, h);
    if (glow > 0) {
      const c1 = cache(1);
      if (c1) { ctx.globalAlpha = glow; ctx.drawImage(c1, -BALL.anchorX * k, -BALL.anchorY * k, w, h); }
    }
    ctx.restore();
    if (b.state === 'idle' && this.progress.qUnlocked) this.drawMarker(ctx, b.x, b.y - h * 0.5 - 6, '150, 255, 200');
  }

  /** Bobbing triangle that points at the next thing to use. */
  drawMarker(ctx, x, y, rgb = '255, 214, 110') {
    const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 3.2);
    const my = y + Math.sin(this.animTime * 4) * 3;
    ctx.save();
    ctx.fillStyle = `rgba(${rgb}, ${0.75 + 0.25 * pulse})`;
    ctx.strokeStyle = 'rgba(60, 30, 10, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 6, my - 5); ctx.lineTo(x + 6, my - 5); ctx.lineTo(x, my + 3); ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  renderArcher(ctx, a) {
    if (a.gone || a.hidden) return;
    if (!this.inView(a.x - 60, a.x + 60) && !a.arrows.length) return;
    if (a.appear < 1) {
      ctx.save();
      ctx.globalAlpha = a.appear;
      a.render(ctx, this.archerSprites);
      ctx.restore();
      return;
    }
    a.render(ctx, this.archerSprites);
  }

  /** The Sun Key floats over tower 2's roof once its archer has fallen, then flies to Rakti. */
  renderKey(ctx) {
    const K = this.key;
    if (K.shown <= 0 || (K.taken && K.fly >= 1)) return;
    if (!ready(this.keyImg)) return;
    const w = KEY.draw, h = w * (KEY.h / KEY.w);
    let x = K.x, y = K.y + Math.sin(this.animTime * 2.4) * 3, alpha = K.shown, size = 1;
    if (K.taken && this.player) {
      const t = K.fly, e = t * t * (3 - 2 * t);
      x = K.fromX + (this.player.x - K.fromX) * e;
      y = K.fromY + (this.player.y - 40 - K.fromY) * e - Math.sin(t * Math.PI) * 26;
      alpha = 1 - Math.max(0, (t - 0.7) / 0.3);
      size = 1 - 0.4 * t;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 2, x, y, 34);
    g.addColorStop(0, `rgba(255, 220, 120, ${0.55 * alpha})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 36, y - 36, 72, 72);
    ctx.restore();
    const c = this.cachedArt('key', w, h, true, (gg) => gg.drawImage(this.keyImg, 0, 0, w, h));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(Math.cos(this.animTime * 1.6) * size, size);   // a slow turn in the air
    ctx.drawImage(c, -w / 2, -h / 2, w, h);
    ctx.restore();
    if (!K.taken) this.drawMarker(ctx, x, y - h / 2 - 10);
  }

  /** When the sun door is unlocked the key flies from Rakti into the lock and dissolves into light. */
  renderDoorKey(ctx) {
    const d = this.door1;
    if (!this.progress.door1Open || d.keyFly >= 1 || !ready(this.keyImg) || !this.player) return;
    const t = d.keyFly ?? 0, e = t * t * (3 - 2 * t);
    const w = KEY.draw * (1 - 0.3 * t), h = w * (KEY.h / KEY.w);
    const x = this.player.x + (d.cx - this.player.x) * e, y = this.player.y - 40 + (d.midY - this.player.y + 40) * e - Math.sin(t * Math.PI) * 30;
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(0, (t - 0.75) / 0.25);
    ctx.drawImage(this.keyImg, x - w / 2, y - h / 2, w, h);
    ctx.restore();
  }

  renderShrine(ctx) {
    const s = this.shrine;
    if (!this.inView(s.x - 60, s.x + 60)) return;
    const w = SHRINE.draw, h = w * (SHRINE.h / SHRINE.w);
    if (ready(this.shrineImg)) {
      const c = this.cachedArt('shrine', w, h, true, (g) => g.drawImage(this.shrineImg, 0, 0, w, h));
      ctx.drawImage(c, s.x - w / 2, s.y - h, w, h);
    }
    if (this.trishulFly >= 1 || !ready(this.trishulImg)) return;
    const th = TRISHUL_UP.draw, tw = th * (TRISHUL_UP.w / TRISHUL_UP.h);
    let x = s.x, y = s.y - h - th / 2 - 4 + Math.sin(this.animTime * 2.2) * 3, alpha = 1, size = 1;
    if (this.progress.trishulTaken && this.player) {
      const t = this.trishulFly, e = t * t * (3 - 2 * t);
      x = x + (this.player.x - x) * e;
      y = y + (this.player.y - 40 - y) * e - Math.sin(t * Math.PI) * 30;
      alpha = 1 - Math.max(0, (t - 0.7) / 0.3);
      size = 1 - 0.4 * t;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 2.6);
    const g = ctx.createRadialGradient(x, y, 2, x, y, 46);
    g.addColorStop(0, `rgba(160, 255, 240, ${(0.35 + 0.2 * pulse) * alpha})`);
    g.addColorStop(0.5, `rgba(255, 215, 120, ${0.12 * alpha})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 48, y - 48, 96, 96);
    // light rising from the shrine bowl
    if (!this.progress.trishulTaken) {
      const shaft = ctx.createLinearGradient(0, s.y - h - 80, 0, s.y - h + 6);
      shaft.addColorStop(0, 'rgba(255, 230, 150, 0)');
      shaft.addColorStop(1, `rgba(255, 230, 150, ${0.18 + 0.08 * pulse})`);
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(s.x - 6, s.y - h - 80); ctx.lineTo(s.x + 6, s.y - h - 80); ctx.lineTo(s.x + 22, s.y - h + 6); ctx.lineTo(s.x - 22, s.y - h + 6);
      ctx.fill();
    }
    ctx.restore();
    const c = this.cachedArt('trishul_up', tw, th, true, (gg) => gg.drawImage(this.trishulImg, 0, 0, tw, th));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(c, x - (tw * size) / 2, y - (th * size) / 2, tw * size, th * size);
    ctx.restore();
    if (!this.progress.trishulTaken) this.drawMarker(ctx, s.x, s.y - h - th - 14);
  }
}
