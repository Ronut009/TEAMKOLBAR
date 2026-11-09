/**
 * ==========================================================================
 * LEVEL 2: SURYA MANDIR (js/levels/level2.js)
 * (The previous desert-catacombs level is archived in unused_assets/old_code/js/level2.js.)
 *
 * Outside (five background screens, left to right):
 *   0 portal ruins  - Rakti steps out of the rift; Maa Kali speaks
 *   1 dunes         - tower 1: an archer Rakti cannot reach. Kali teaches [Q]: the boulder
 *                     becomes a sphere and is hurled onto the tower top
 *   1-2             - a chasm of floating rocks: [Q] turns them into stone platforms
 *   2 dunes (mirror)- tower 2: a second archer and a second boulder. When he falls a ladder
 *                     unfurls and the SANDS OF TIME (an hourglass, power [F]) float over the tower top
 *   3-4 dunes       - a long run past the tower, then a quicksand pit crossed on three crumbling slabs;
 *                     three Betal guard the sun door
 *   5 the sun door  - locked, and there is no key: the Sun Key lies back at the FIRST tower. The desert quickens
 *                     (traps and arrows HASTE x faster). The way back (RETURN_WAVES):
 *                       door: 2 Betal + 2 archers walk in from the door side
 *                       chasm 2: the slabs rise and sink in a wave too fast to ride - only with the Sands [F]
 *                       tower 2's floor: 2 archers;  chasm 1: the [Q] slabs now crumble
 *                       tower 1's floor: 2 Betal + 1 archer, and a new archer on tower 1
 *                     Every enemy of the way back slain fills the hourglass; full (all 9), [F] by tower 1's
 *                     broken boulder rewinds time ONCE: it flies back together, [Q] crushes the tower archer, a
 *                     ladder unfurls, the key waits on top. Enemies left behind leap the quicksand after her.
 *                     With the key the desert calms; the key opens the sun door and Rakti walks into the hall
 * The hall (two screens, in its own stretch of the world; the camera is limited to it):
 *   the shrine holds the Trishul -> an archer on the hall's tower (only the Trishul reaches him)
 *   -> a horde of 3 Betal and 2 archers -> the end door opens into a portal -> Level 3.
 *
 * Coordinates work like Level 1: X(screen, imageX) turns a pixel column of a 1672 x 941
 * background into world x. Screens are drawn so that image row 930 (the door sills) meets the
 * floor at world y = 368.
 * ==========================================================================
 */

import { PlatformArt } from '../render/platformArt.js';
import { Betal } from '../entities/betal.js';
import { EnemySpriteSheet } from '../entities/enemySprites.js';
import { Archer } from '../entities/archer.js';
import { Sfx } from '../core/audio.js';

// ---------------------------------------------------------------- background screens
const BG_SCALE = 447 / 941;                 // a screen is exactly one view tall
const SCREEN_W = 1672 * BG_SCALE;           // ~794 world px
const SCREEN_H = 941 * BG_SCALE;            // 447
const FLOOR_Y = 368;
const BG_Y = FLOOR_Y - 930 * BG_SCALE;      // ~-74: lifted so the door sills (image row 930) sit on the floor
const FEATHER_PX = 240;
const FEATHER = FEATHER_PX * BG_SCALE;
const X = (screen, imageX = 0) => screen * (SCREEN_W - FEATHER) + imageX * BG_SCALE;
const OUT_W = Math.round(X(5) + SCREEN_W);  // outside ends at the right edge of the door screen
const ROOM_X = 4500;                        // the hall sits in its own stretch of the world
const RX = (screen, imageX = 0) => ROOM_X + X(screen, imageX);
const ROOM_END = Math.round(RX(1) + SCREEN_W);
const BGY = (imageY) => BG_Y + imageY * BG_SCALE;
const BG_EXT = 110;
// The start screen's portal stands on its own ground line (image row ~800), so that screen is drawn lower
const PORTAL_DY = 54;    // screens continue below the art (a mirrored strip) so chasms fade out instead of ending in a hard edge

// ---------------------------------------------------------------- sprites (assets/level2/sprites, measured)
// Tower: 474 x 744 (tower.png and tower_ladder.png share the canvas). roofY = where feet stand on the roof.
const TOWER = { w: 474, h: 744, cx: 235.2, roofY: 108, baseY: 729.6, roofL: 43, roofR: 427, ladderX: 339.3 };
// The first tower (the Sun Key's) has its own art with the sun painted in its window: tower_sun.png and
// tower_sun_ladder.png, fitted onto the same 474 x 744 canvas (same roof, base and centre); its ladder is a little
// further in.
const TOWER1 = { ladderX: 329.8 };
const TOWER_SCALE = 0.325;
// The sun mark on the first tower: the golden sun painted in its window (tower_sun.png), the same sun as the sun
// door's lock. ix / iy = its centre on the tower canvas, r = the half size of the square holding it and its rays.
// It is quiet from the start; when Rakti finds the lock without a key, the camera pans to it and it ignites: the
// painted sun itself glows (its gold pixels, drawn again in 'lighter'), with a light shaft into the sky, until she
// has the Sun Key.
const SUN_MARK = { ix: 237.5, iy: 404.7, r: 30, glowR: 11.3 };
const SUN_PAN = { there: 1.6, back: 1.1 };   // s for the camera to glide to the mark, and back to Rakti
const TOWER_ROOF_Y = Math.round(FLOOR_Y + 4 - (TOWER.baseY - TOWER.roofY) * TOWER_SCALE);   // ~170
// Pillars: floor pillars stand on the floor, long pillars rise out of a chasm. surface = feet row from the top.
// Pillars stand on their stepped bases, half buried in the quicksand.
const PILLAR_ART = {
  small: { src: 'pillar2_small.png', w: 168, h: 192, surface: 12, cap: 0.86 },
  medium: { src: 'pillar2_medium.png', w: 184, h: 306, surface: 12, cap: 0.86 },
  tall: { src: 'pillar2_tall.png', w: 212, h: 414, surface: 12, cap: 0.86 },
  long: { src: 'pillar_long.png', w: 217, h: 929, surface: 14, cap: 0.84 }   // scenery only (seam columns)
};
// Crumbling slabs (the floating-platform art): they give way FALL_DELAY s after Rakti lands on them
const FALL_DELAY = 0.5;
const FALL_RESPAWN = 2.6;
const FLOOR_PILLAR_SCALE = 0.29;
const PIT_PILLAR_SCALE = 0.24;
const CHASM_PILLAR_SCALE = 0.33;   // full pillar art, its stepped base standing in the sand pit
// Every gap is a sunken sand pit: its surface sits below the floor, pillar bases stand in it, and
// whoever drops in sinks (pit damage, back to the last checkpoint).
const SAND_Y = 404;
// Quicksand fills every pit except those marked sand: false. Rakti wades at QS_SLOW of her speed and sinks:
// QS_SINK px/s standing still, QS_SINK_MOVING while wading. She cannot jump out of it: at QS_MAX she is
// swallowed (back to the checkpoint with the health she had). Kali's form floats on it.
const QS_SLOW = 0.3;
const QS_SINK = 120;          // swallowed in about half a second
const QS_SINK_MOVING = 95;
const QS_MAX = 62;
const QS = { src: 'quicksand.png', w: 1178, h: 187, surface: 13, scale: 0.5 };
// Stone sheets: 6 frames each. Ball frames are centred; slab frames are aligned on the stone's top edge.
const BALL = { frameW: 196, frameH: 256, anchorX: 97.5, anchorY: 129, bottom: 254, scale: 0.25 };
const SLAB = { frameW: 202, frameH: 234, anchorX: 101, anchorY: 3, slabL: 24, slabR: 178, scale: 0.42 };
const PIER_SINK_SPEED = 34;     // hall piers sink this fast (px/s) while Rakti stands on them
const PIER_RISE_SPEED = 18;     // and rise back this fast once she leaves
const PIER_SINK_MAX = 70;       // by then the top is under the sand
const SLAB_ROCK_BOTTOM = 232;   // lowest row of the raw rock (frame 0)
const SLAB_REST_SINK = 4;       // the raw rocks rest ON the quicksand, only their very bottom pressed into it (was 30: a third sunk)
// center / upCenter: where the drawn arrow sits in the full-draw frames (aim_3 / aimup_3), in world px from
// the feet when facing right; the released arrow starts there, pointing the way the bow points.
const ARCHER_ART = {
  frameW: 156, frameH: 130, anchorX: 79, anchorY: 128.5, scale: 0.5, handX: 14, handY: -33, barY: -70, height: 58,
  arrowW: 34, arrowH: 7, center: [16, -38.5], upCenter: [9.5, -43], upAngle: -0.73
};
const KEY = { w: 200, h: 178, draw: 30 };
const SHRINE = { w: 360, h: 354, draw: 84 };
const TRISHUL_UP = { w: 77, h: 300, draw: 58 };

const PIT_DAMAGE = 3;
// The way back for the key: traps, arrows and enemies outside run this much faster (the Sands of Time slow them)
const HASTE = 1.6;
const HOURGLASS = { w: 294, h: 240, draw: 34 };
// The rewind at tower 1 (seconds): the shards gather on the roof, the sphere flies back down its arc, the stone re-forms
const REWIND = { gather: 1.1, fly: 2.1, unform: 2.7, end: 3.2 };
// The way back for the key. floor: 3 the door's floor, 2 tower 2's, 1 tower 1's. wave 1 walks in from the door side
// when the desert quickens; waves 2 and 3 already wait on their floors.
const RETURN_FLOORS = { 1: [700, 1470], 2: [2060, 2845], 3: [3425, 4185] };
const RETURN_WAVES = [
  { id: 'R1', kind: 'betal', wave: 1, floor: 3, post: 4110, delay: 0.2 },
  { id: 'R2', kind: 'betal', wave: 1, floor: 3, post: 4160, delay: 0.9 },
  { id: 'R3', kind: 'archer', wave: 1, floor: 3, post: 4146, delay: 1.6 },
  { id: 'R4', kind: 'archer', wave: 1, floor: 3, post: 4178, delay: 2.3 },
  { id: 'R5', kind: 'archer', wave: 2, floor: 2, post: 2620 },
  { id: 'R6', kind: 'archer', wave: 2, floor: 2, post: 2290 },
  { id: 'R7', kind: 'betal', wave: 3, floor: 1, post: 1330 },
  { id: 'R8', kind: 'betal', wave: 3, floor: 1, post: 1080 },
  { id: 'R9', kind: 'archer', wave: 3, floor: 1, post: 1430 }
];
// Chasm 2 on the way back: the slabs rise out of the quicksand one after another (westward) and sink again. Each is up
// for `window` (wave time), the next rises `step` later, the pattern repeats every `period`, and wave time runs `rush` x
// the (already quickened) world time. Hasted, no jump between two slabs is quick enough to land inside the next window;
// slowed by the Sands every normal jump is.
// Way back, chasm 2: with the Sands slowing time a stepped-on slab holds this long (world s, ~0.7 s real) before it
// drops; without them it drops the instant she lands.
const RETURN_FALL_SANDS = 0.25;
const SLAB_WAVE = { rush: 1.7, step: 0.45, window: 0.65, period: 3.4, rise: 0.12, sunk: 78 };

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
    // the Sands of Time and the way back for the key
    sandsTaken: false, doorTried: false, rewound: false, archerA2: false, herdDead: {},
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
    this.deathY = SAND_Y + QS_MAX + 30;   // never reached: the quicksand swallows her first
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
    this.tower1Img = img(S + 'tower_sun.png');
    this.tower1LadderImg = img(S + 'tower_sun_ladder.png');
    this.pillarImgs = Object.fromEntries(Object.entries(PILLAR_ART).map(([k, v]) => [k, img(S + v.src)]));
    this.ballSheet = img(S + 'stone_ball_sheet.png');
    this.slabSheet = img(S + 'stone_slab_sheet.png');
    this.keyImg = img(S + 'key.png');
    this.hourglassImg = img(S + 'sands_hourglass.png');
    this.quicksandImg = img(S + QS.src);
    this.pierImg = img(S + 'pier.png');
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
    // walking archers (the way back's enemies walking in): the 6 walk frames in the idle slot
    const walk = frames('walk', 6);
    this.archerWalkSprites = { ...this.archerSprites, idle: walk[0], idleFrames: walk };

    // ------------------------------------------------------------ outside geometry
    // the rift in the start screen (measured: blue swirl at image x 107-263, rows 217-792)
    this.portal = { x: X(0, 185), y: BGY(505) + PORTAL_DY, top: BGY(217) + PORTAL_DY, spawnX: 112 };
    this.floors = [
      { x1: 0, x2: 250, area: 'out' },
      { x1: 690, x2: 1480, area: 'out' },     // starts under the seam column's base, never inside the pit
      { x1: 2045, x2: 2856, area: 'out' },
      { x1: 3411, x2: OUT_W, area: 'out' },
      { x1: ROOM_X, x2: ROOM_X + 250, area: 'room' },
      { x1: ROOM_X + 690, x2: ROOM_END, area: 'room' }
    ];
    this.pits = [
      { x1: 250, x2: 690, area: 'out' },                     // first steps: small -> medium -> tall
      { x1: 1480, x2: 2045, area: 'out' },                   // floating rocks ([Q] platforms) over quicksand
      { x1: 2856, x2: 3411, area: 'out' },                   // three crumbling slabs
      { x1: ROOM_X + 250, x2: ROOM_X + 690, area: 'room' }   // the hall's broken floor
    ];
    // Every pillar stands in a chasm with gaps between, so it is a jump, never a speed bump.
    // `top` is where feet stand; the bases sink into the chasm's shadow.
    // Stepping piers: stacked courses of the same carved mudbrick as the floor, rising out of the quicksand
    // like broken pieces of the old causeway. w = width, top = where feet stand.
    this.pillars = [
      // two piers that rise and sink in turn (base = middle height, swing = +/- px, period s)
      { pier: true, cx: 380, top: 330, w: 72, base: 330, swing: 26, period: 3.2, phase: 0 },
      { pier: true, cx: 560, top: 310, w: 72, base: 312, swing: 26, period: 3.2, phase: Math.PI },
      // the hall's piers stand in quicksand: they sink while Rakti stands on them, so she cannot wait
      // (harder: wider gaps, the middle one also rises and falls, and the last one stands high)
      { pier: true, cx: ROOM_X + 340, top: 338, w: 72, sinks: true },
      { pier: true, cx: ROOM_X + 502, top: 300, w: 72, sinks: true, base: 300, swing: 34, period: 2.6, phase: 0 },
      { pier: true, cx: ROOM_X + 656, top: 280, w: 72, sinks: true }
    ];
    for (const p of this.pillars) {
      p.top0 = p.top;
      p.sinkD = 0;
      p.half = p.w / 2 - 4;
      p.area = p.cx >= ROOM_X ? 'room' : 'out';
    }
    // Tall carved columns over every seam between two background screens, so the join can't be seen
    this.seamColumns = [X(1), X(2), X(3), X(4), X(5)].map((x) => ({ cx: x + FEATHER / 2, area: 'out' }))
      .concat([{ cx: RX(1) + FEATHER / 2, area: 'room' }]);
    // Loose boulders lying around the towers: only one at each tower answers to [Q]
    // (sheet: 'ball' or 'slab' rock art, s = scale, flip = mirrored, dim = further back)
    // A pile of boulders at each tower; only one stone in each pile answers to [Q] (the `balls` below).
    // back = drawn behind that stone, the rest in front of it but beside it, so it stays visible.
    const pile = (x) => [
      { sheet: 'ball', x: x - 40, s: 0.3, dim: 0.32, back: true },
      { sheet: 'ball', x: x + 42, s: 0.27, dim: 0.28, flip: true, back: true },
      { sheet: 'ball', x: x + 6, s: 0.21, dim: 0.42, back: true },
      { sheet: 'ball', x: x - 48, s: 0.18, flip: true },
      { sheet: 'ball', x: x + 50, s: 0.19 },
      { sheet: 'ball', x: x + 78, s: 0.12, dim: 0.15, flip: true },
      { sheet: 'ball', x: x - 74, s: 0.12, dim: 0.2 }
    ];
    this.decoys = [...pile(1005), ...pile(2170)];

    // Towers: two outside, one in the hall. Archers stand on their roofs.
    this.towers = [
      { id: 'T1', cx: 1185, area: 'out' },
      { id: 'T2', cx: 2430, area: 'out' },
      { id: 'T3', cx: ROOM_X + 1080, area: 'room' }
    ];
    const roofHalf = ((TOWER.roofR - TOWER.roofL) / 2) * TOWER_SCALE - 8;
    for (const t of this.towers) {
      t.roof = { x1: t.cx - roofHalf, x2: t.cx + roofHalf, y: TOWER_ROOF_Y };
      t.ladderX = t.cx + ((t.id === 'T1' ? TOWER1.ladderX : TOWER.ladderX) - TOWER.cx) * TOWER_SCALE;
    }
    this.ladderShown = 0;   // tower 2's ladder (0 hidden .. 1 fully drawn)
    this.ladderShown1 = 0;  // tower 1's ladder (it unfurls when the second archer there falls)
    this.ladders = [];

    // Archers
    const archer = (id, x, y) => new Archer(x, y, id, ARCHER_ART);
    this.archers = {
      A: archer('A', this.towers[0].cx, TOWER_ROOF_Y),
      B: archer('B', this.towers[1].cx, TOWER_ROOF_Y),
      C: archer('C', this.towers[2].cx, TOWER_ROOF_Y),
      H1: archer('H1', ROOM_X + 960, FLOOR_Y),     // the horde's archers step out at both ends of the hall (H1 was at
                                                   // +700, pressed against the last sinking pier; now in the open between the shrine and the tower)
      H2: archer('H2', ROOM_X + 1430, FLOOR_Y)
    };
    this.archers.H1.x0 = this.archers.H1.x;   // their posts (they run / leap in to them with the horde)
    this.archers.H2.x0 = this.archers.H2.x;
    this.archers.H1.shootCooldown = 3.4;   // two at once: give Rakti room to breathe
    this.archers.H2.shootCooldown = 3.4;
    this.archers.A.crushOnly = true;    // only Kali's stone reaches them
    this.archers.B.crushOnly = true;
    // The way back: a new archer holds tower 1 (only the rewound boulder reaches him)
    this.archers.A2 = archer('A2', this.towers[0].cx, TOWER_ROOF_Y);
    this.archers.A2.crushOnly = true;

    // [Q] stones: boulders that become spheres hurled at an archer, and floating rocks that become platforms
    const ballCY = FLOOR_Y + 2 - (BALL.bottom - BALL.anchorY) * BALL.scale;
    this.balls = [
      { id: 'ball1', x: 1005, y: ballCY, target: 'A', state: 'idle', t: 0 },
      { id: 'ball2', x: 2170, y: ballCY, target: 'B', state: 'idle', t: 0 }   // well clear of the chasm edge
    ];
    this.slabs = [
      { cx: 1608, top: 336 },
      { cx: 1763, top: 306 },
      { cx: 1918, top: 326 }
    ].map((s, i) => ({ ...s, state: 'raw', t: 0, delay: 0, phase: i * 1.7 }));
    // on the way back for the key the [Q] slabs crumble like the fallers
    this.slabFallers = this.slabs.map((q, i) => ({ cx: q.cx, top: q.top, phase: i * 1.3, state: 'idle', t: 0, dy: 0, vy: 0, alpha: 1 }));
    // The second chasm is crossed on crumbling slabs: each one drops shortly after Rakti lands on it.
    // The gaps are wide enough that no jump clears two slabs at once.
    this.fallers = [
      { cx: 2981, top: 334 },
      { cx: 3133, top: 312 },
      { cx: 3286, top: 330 }
    ].map((f, i) => ({ ...f, phase: i * 1.3, state: 'idle', t: 0, dy: 0, vy: 0, alpha: 1 }));

    // The Sands of Time over tower 2, the Sun Key over tower 1 (once its second archer falls), the sun door, the hall door
    this.hourglass = { x: this.towers[1].cx, y: TOWER_ROOF_Y - 36, shown: 0, taken: false, fly: 0, fromX: 0, fromY: 0 };
    this.key = { x: this.towers[0].cx, y: TOWER_ROOF_Y - 32, shown: 0, taken: false, fly: 0, fromX: 0, fromY: 0 };
    this.door1 = { cx: X(5, 1457), x1: X(5, 1390), x2: X(5, 1525), midY: BGY(620), anim: 0 };
    this.door2 = { cx: RX(1, 1450), x1: RX(1, 1345), x2: RX(1, 1555), midY: BGY(610), anim: 0 };

    // The hall: shrine with the Trishul
    this.shrine = { x: ROOM_X + 840, y: FLOOR_Y + 2 };
    this.trishulFly = 0;

    // Betal: one before the sun door, three in the hall's horde
    // Betal: four on the way to the sun door, three in the hall's horde
    const outside = [
      new Betal(1380, 1240, 1460, FLOOR_Y),     // past tower 1, before the floating rocks
      new Betal(1050, 900, 1130, FLOOR_Y),      // at the first boulder pile
      new Betal(2640, 2540, 2760, FLOOR_Y),     // on the long run past tower 2
      new Betal(2800, 2700, 2850, FLOOR_Y),
      new Betal(3716, 3666, 3786, FLOOR_Y),     // three guard the sun door
      new Betal(3560, 3450, 3660, FLOOR_Y),
      new Betal(3906, 3736, 4016, FLOOR_Y)
    ];
    const horde = [
      new Betal(ROOM_X + 900, ROOM_X + 760, ROOM_X + 990, FLOOR_Y),
      new Betal(ROOM_X + 1240, ROOM_X + 1170, ROOM_X + 1310, FLOOR_Y),
      new Betal(ROOM_X + 1390, ROOM_X + 1320, ROOM_X + 1450, FLOOR_Y)
    ];
    for (const b of outside) { b.area = 'out'; b.orig = true; }
    for (const b of horde) { b.area = 'room'; b.horde = true; }
    this.betals = [...outside, ...horde];
    // the way back for the key (see RETURN_WAVES): archers join this.archers, Betal this.betals
    this.returnMembers = RETURN_WAVES.map((d) => {
      const [f1, f2] = RETURN_FLOORS[d.floor];
      let who;
      if (d.kind === 'betal') {
        who = new Betal(d.post, Math.max(f1, d.post - 170), Math.min(f2, d.post + 170), FLOOR_Y);
        who.area = 'out';
        this.betals.push(who);
      } else {
        who = this.archers[d.id] = archer(d.id, d.post, FLOOR_Y);
        who.shootCooldown = 3.0;
        who.isArcher = true;
      }
      who.ret = d;
      who.id = d.id;
      return { ...d, who };
    });

    // Checkpoints: 0 portal, 1 past tower 1, 2 past tower 2, 3 hall entrance, 4 at the shrine
    this.checkpoints = [
      { x: this.portal.spawnX, area: 'out' },
      { x: 1300, area: 'out' },
      { x: 2305, area: 'out' },
      { x: ROOM_X + 150, area: 'room' },
      { x: ROOM_X + 840, area: 'room' },
      { x: 3470, area: 'out' }      // 5: at the sun door, when the way back for the key begins
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
  /** The Trishul on its shrine: what Rakti needs to reach to go on. */
  crucialItem() {
    const p = this.progress;
    if (this.area === 'out') {
      if (p.archerB && !p.sandsTaken) return { x: this.hourglass.x, y: TOWER_ROOF_Y };
      if (p.archerA2 && !p.keyTaken) return { x: this.key.x, y: TOWER_ROOF_Y };
      if (p.doorTried && !p.keyTaken) return { x: this.sunMarkPos().x, y: TOWER_ROOF_Y };
      return null;
    }
    return p.trishulTaken ? null : { x: this.shrine.x, y: FLOOR_Y };
  }

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
    this.qsDepth = 0;
    this.qsWasIn = false;
    this.rockFade = 1;   // the boulder piles are part of the scenery from the start (they used to pop in with [Q])
    this.sunMark = { lit: Boolean(p.doorTried), ignite: 0 };
    this.sunPan = null;
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
    // tower 1's boulder: thrown at the first archer, then (rewound) at the second
    this.balls[0].state = !p.archerA ? 'idle' : (p.rewound && !p.archerA2) ? 'idle' : 'gone';
    this.balls[0].target = p.archerA ? 'A2' : 'A';
    this.balls[1].state = p.archerB ? 'gone' : 'idle';
    this.rewind = null;
    this.hasteWind = 0;
    for (const b of this.balls) {
      // back where it lay (a death mid-throw used to leave it on the tower top)
      b.x0 ??= b.x; b.y0 ??= b.y;
      b.x = b.x0; b.y = b.y0; b.t = 0; b.trail = []; b.spin = 0;
    }
    for (const q of this.pillars) if (q.sinks) { q.sinkD = 0; q.top = q.top0; }
    for (const s of this.slabs) { s.state = p.slabsRaised ? 'solid' : 'raw'; s.t = 0; s.delay = 0; s.pulled = false; }
    for (const f of this.fallers) Object.assign(f, { state: 'idle', t: 0, dy: 0, vy: 0, alpha: 1 });
    this.ladderShown = p.archerB ? 1 : 0;
    this.ladderShown1 = p.archerA2 ? 1 : 0;
    this.hourglass.shown = p.archerB && !p.sandsTaken ? 1 : 0;
    this.hourglass.taken = p.sandsTaken;
    this.hourglass.fly = p.sandsTaken ? 1 : 0;
    this.key.shown = p.archerA2 && !p.keyTaken ? 1 : 0;
    this.key.taken = p.keyTaken;
    this.key.fly = p.keyTaken ? 1 : 0;
    // the second archer on tower 1 and the herd (only once the way back has begun)
    const A2 = this.archers.A2;
    A2.hidden = !p.doorTried;
    if (p.archerA2) { A2.alive = false; A2.gone = true; A2.arrows = []; A2.attachedArrow = null; }

    this.door1.anim = p.door1Open ? 1 : 0;
    this.door1.keyFly = p.door1Open ? 1 : 0;
    this.door2.anim = p.hordeCleared ? 1 : 0;
    this.trishulFly = p.trishulTaken ? 1 : 0;
    this.hordeTimer = -1;
    this.hordeEntries = [];
    this.hordeTalked = false;
    for (const id of ['H1', 'H2']) { const a = this.archers[id]; a.entry = null; a.x = a.x0; a.y = FLOOR_Y; }
    for (const b of this.betals) {
      b.entry = null;
      b.reset();
      if (b.horde) {
        b.hidden = true;
        if (p.hordeCleared) { b.dead = true; b.removed = true; b.hidden = false; }
      }
    }
    // the desert's first Betal are gone for good once the way back has begun (they used to come back on a respawn)
    if (p.doorTried) for (const b of this.betals) if (b.orig) { b.dead = true; b.removed = true; }
    const anchor = this.getRespawnPoint().x;   // the door wave forms up around where she comes back
    for (const m of this.returnMembers) this.placeReturnMember(m, p, anchor);
    for (const q of this.slabFallers) Object.assign(q, { state: 'idle', t: 0, dy: 0, vy: 0, alpha: 1, sank: false });
    for (const f of this.fallers) f.wave = false;
    this.waveClock = 0;
    this.updateLadders();
  }

  setArea(area) {
    this.area = area;
    if (area === 'room') { this.minX = ROOM_X; this.width = ROOM_END; }
    else { this.minX = 0; this.width = OUT_W; }
  }

  updateLadders() {
    this.ladders = [];
    if (this.ladderShown >= 1) this.ladders.push({ x: this.towers[1].ladderX, y1: TOWER_ROOF_Y, y2: FLOOR_Y });
    if (this.ladderShown1 >= 1) this.ladders.push({ x: this.towers[0].ladderX, y1: TOWER_ROOF_Y, y2: FLOOR_Y });
  }

  // ======================================================================== geometry
  getPlatforms() {
    const list = [];
    for (const f of this.floors) if (f.area === this.area) list.push({ id: 'floor', x1: f.x1, x2: f.x2, y: FLOOR_Y, oneWay: false });
    for (const p of this.pillars) if (p.area === this.area) list.push({ id: 'pillar', pierRef: p, x1: p.cx - p.half, x2: p.cx + p.half, y: p.top, oneWay: false });
    for (const t of this.towers) if (t.area === this.area) list.push({ id: 'roof', x1: t.roof.x1, x2: t.roof.x2, y: t.roof.y, oneWay: true });
    // quicksand: its surface drops under Rakti as she sinks (qsDepth), so she sinks with it
    for (const pit of this.pits) {
      if (pit.area === this.area && pit.sand !== false) list.push({ id: 'quicksand', pit, x1: pit.x1, x2: pit.x2, y: SAND_Y + this.qsDepth, oneWay: false });
    }
    if (this.area === 'out') {
      const back = this.onWayBack;
      if (back) {
        // the way back: the [Q] slabs crumble, and the second chasm's slabs rise and sink in their wave
        for (const q of this.slabFallers) if (q.state === 'idle' || q.state === 'shaking') list.push({ id: 'faller', faller: q, ...this.slabBox(q), oneWay: true });
        for (const f of this.fallers) if (f.state === 'idle' || f.state === 'shaking') list.push({ id: 'faller', faller: f, ...this.slabBox(f), oneWay: true });
      } else {
        for (const s of this.slabs) if (s.state === 'solid') list.push({ id: 'slab', ...this.slabBox(s), oneWay: true });
        for (const f of this.fallers) {
          if (f.state === 'idle' || f.state === 'shaking') list.push({ id: 'faller', faller: f, ...this.slabBox(f), oneWay: true });
        }
      }
    }
    return list;
  }

  /** On the way back for the key (the desert quickened, the key not yet taken). */
  get onWayBack() { return this.progress.doorTried && !this.progress.keyTaken; }

  /** Chasm 2 on the way back: where each slab is in its wave (k = its order westward from the door). */
  updateSlabWave(dt, player) {
    const W = SLAB_WAVE;
    this.waveClock = (this.waveClock || 0) + dt * W.rush;
    const order = [...this.fallers].sort((a, b) => b.cx - a.cx);
    order.forEach((f, k) => {
      f.wave = true;
      f.state = 'wave';
      f.alpha = 1;
      const u = (((this.waveClock - k * W.step) % W.period) + W.period) % W.period;
      const wasSolid = f.waveSolid;
      f.waveSolid = u <= W.window;
      // it surfaces just before its window and goes under just after it
      if (f.waveSolid) f.dy = 0;
      else if (u < W.window + W.rise) f.dy = ((u - W.window) / W.rise) * W.sunk;
      else if (u > W.period - W.rise) f.dy = ((W.period - u) / W.rise) * W.sunk;
      else f.dy = W.sunk;
      if (!f.waveSolid && wasSolid) {
        if (this.inView(f.cx - 40, f.cx + 40)) this.burst(f.cx, SAND_Y - 2, 8, ['#dca15c', '#c3823f', '#ffe1a8'], 60, 0.4);
        if (player && player.currentPlatform?.faller === f) { player.isGrounded = false; player.currentPlatform = null; }
      }
      if (f.waveSolid && !wasSolid && this.inView(f.cx - 40, f.cx + 40)) this.burst(f.cx, SAND_Y - 2, 6, ['#ffe1a8', '#dca15c'], 50, 0.35);
    });
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
    // below floor level the pit's walls hold her in (she has to climb or jump out)
    if (y > FLOOR_Y + 3) {
      for (const pit of this.pits) {
        if (pit.area !== this.area || x < pit.x1 - 12 || x > pit.x2 + 12) continue;
        x = Math.max(pit.x1 + 8, Math.min(pit.x2 - 8, x));
      }
    }
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
    if (this.transition || this.intro || this.rewind) return null;
    if (this.area === 'out') {
      // the Sands of Time over tower 2's roof
      const t2 = this.towers[1], t1 = this.towers[0];
      if (this.hourglass.shown >= 1 && !this.hourglass.taken && Math.abs(px - this.hourglass.x) < 44 && Math.abs(py - t2.roof.y) < 8) {
        return {
          type: 'l2_sands', x: this.hourglass.x, y: this.hourglass.y, prompt: '[E] TAKE THE SANDS OF TIME', speaker: 'kali', title: '⚜ THE SANDS OF TIME ⚜',
          text: 'My hourglass, the Sands of Time. Press [F] and the world around you slows for eight breaths, but you do not. Then the sands must refill before you turn them again.',
          onInteract: () => this.takeSands()
        };
      }
      // the Sun Key over tower 1's roof (once its second archer has fallen)
      if (this.key.shown >= 1 && !this.key.taken && Math.abs(px - this.key.x) < 44 && Math.abs(py - t1.roof.y) < 8) {
        return {
          type: 'l2_key', x: this.key.x, y: this.key.y, prompt: '[E] TAKE THE SUN KEY', speaker: 'kali', title: '⚜ THE SUN KEY ⚜',
          text: 'The Sun Key. The desert calms now that it is yours. Back to the door.',
          onInteract: () => this.takeKey()
        };
      }
      // the rewind: by the broken boulder's pile at tower 1, while its second archer stands
      if (this.rewindPending() && Math.abs(px - this.balls[0].x0) < 190 && Math.abs(py - FLOOR_Y) < 8) {
        const c = this.sandsCharge();
        if (!c.ready) {
          return {
            type: 'inspection', x: this.balls[0].x0, y: FLOOR_Y, prompt: `⟲ SANDS NOT CHARGED · ${c.have}/${c.need}`, speaker: 'kali', title: '⚜ THE SANDS OF TIME ⚜',
            text: `Not yet. ${c.need - c.have} warriors still stand, and each one that falls fills the hourglass.`
          };
        }
        return {
          type: 'inspection', x: this.balls[0].x0, y: FLOOR_Y, prompt: '[F] TURN BACK THE SANDS', speaker: 'kali', title: '⚜ THE SANDS OF TIME ⚜',
          text: 'Press [F] and I will turn back time for this stone. Once.'
        };
      }
      // The sun door
      if (Math.abs(px - this.door1.cx) < 80 && Math.abs(py - FLOOR_Y) < 6 && !p.door1Open) {
        if (p.keyTaken) {
          return {
            type: 'l2_door', x: this.door1.cx, y: FLOOR_Y, prompt: '[E] UNLOCK THE SUN DOOR', speaker: 'kali', title: '⚜ THE SUN DOOR ⚜',
            text: 'The seals give way. Go in. Whatever is inside has been waiting for you.',
            onInteract: () => this.openSunDoor()
          };
        }
        if (p.sandsTaken && !p.doorTried) {
          // the twist: there is no key
          return {
            type: 'inspection', x: this.door1.cx, y: FLOOR_Y, prompt: '[E] OPEN THE SUN DOOR', speaker: 'rakti', title: '⚜ THE SUN DOOR ⚜',
            text: 'It won\'t open. There\'s a sun-shaped lock... and I don\'t have a key.',
            onInteract: () => this.startDoorTwist()
          };
        }
        return {
          type: 'inspection', x: this.door1.cx, y: FLOOR_Y, prompt: '[E] SEALED DOOR', speaker: 'stele', title: '⚜ THE SUN DOOR ⚜',
          text: p.doorTried
            ? 'The lock waits for its key. Look for the burning sun on the first tower.'
            : 'A sun-shaped lock holds the doors shut. Something on the second tower still calls to you.'
        };
      }
      // [Q] hints once Kali has taught it
      if (p.qUnlocked) {
        const ball = this.balls.find((b) => b.state === 'idle' && Math.abs(px - b.x) < 170 && Math.abs(py - FLOOR_Y) < 8);
        if (ball) {
          return {
            type: 'inspection', x: ball.x, y: FLOOR_Y, prompt: '[Q] HURL THE BOULDER', speaker: 'kali', title: '⚜ MAA KALI ⚜',
            text: 'Stand by the stone and press [Q]. I will send it at your enemy.'
          };
        }
        if (this.slabs.some((s) => s.state === 'raw') && px > 1330 && px < 1490) {
          return {
            type: 'inspection', x: 1480, y: FLOOR_Y, prompt: '[Q] RAISE THE STONES', speaker: 'kali', title: '⚜ MAA KALI ⚜',
            text: 'Press [Q] and I will flatten the rocks into a path.'
          };
        }
      }
      return null;
    }
    // The hall
    if (!p.trishulTaken && Math.abs(px - this.shrine.x) < 52 && Math.abs(py - FLOOR_Y) < 8) {
      return {
        type: 'l2_trishul', x: this.shrine.x, y: FLOOR_Y, prompt: '[E] TAKE THE TRISHUL', speaker: 'kali', title: '⚜ THE SECOND RELIC: THE TRISHUL ⚜',
        text: 'My Trishul, the second relic. It chose you. Press [2] to wield it and [1] for your talwar. Throw it and it finds its mark, then returns to your hand. Now, the archer on the tower.',
        onInteract: () => this.takeTrishul()
      };
    }
    if (this.door2.anim < 1 && Math.abs(px - this.door2.cx) < 70 && Math.abs(py - FLOOR_Y) < 6) {
      return {
        type: 'inspection', x: this.door2.cx, y: FLOOR_Y, prompt: '[E] SEALED DOOR', speaker: 'stele', title: '⚜ THE HALL DOOR ⚜',
        text: 'The sigils burn. These doors stay shut while the hall\'s guardians stand.'
      };
    }
    return null;
  }

  // ======================================================================== the Sands of Time & the way back
  takeSands() {
    const H = this.hourglass;
    if (H.taken) return;
    H.taken = true;
    H.fly = 0; H.fromX = H.x; H.fromY = H.y;
    this.progress.sandsTaken = true;
    if (this.player) this.player.hasSands = true;
    Sfx.play('item_get');
    this.cameraShake = 0.4;
    this.toast('⏳ SANDS OF TIME · PRESS [F]', 2.6);
    const flash = typeof document !== 'undefined' && document.getElementById('divineFlash');
    if (flash) { flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 250); }
  }

  /** [E] at the sun door with the hourglass but no key: Kali tells her the key is back at the first tower, and
   *  when the talk ends the desert quickens (startHaste). */
  startDoorTwist() {
    this.pendingDialogue = {
      lines: [
        // the camera glides back to the first tower while Kali speaks, and the sun mark there ignites
        { s: 'kali', t: 'That sun is carved on the first tower too. Look. It is burning.', focus: 'sunmark' },
        { s: 'rakti', t: 'The first tower? That\'s all the way back!' },
        { s: 'kali', t: 'Then run. The desert is turning on you. Use the Sands [F] when it gets bad, and cut down every warrior. Each one fills the hourglass, and you will need it full.' }
      ],
      onDone: () => this.startHaste()
    };
  }

  startHaste() {
    const p = this.progress;
    if (p.doorTried) return;
    p.doorTried = true;
    this.sunMark.lit = true;   // (a skipped talk never reached the mark, so light it here)
    this.cameraShake = 0.8;
    this.toast('⚠ THE DESERT QUICKENS ⚠', 2.6);
    this.archers.A2.hidden = false;
    this.archers.A2.appear = 1;
    // the desert's first Betal melt back into the sand: only the way back's enemies remain
    for (const b of this.betals) {
      if (!b.orig || b.dead) continue;
      if (this.inView(b.x - 30, b.x + 30)) this.burst(b.x, b.y - 30, 18, ['#dca15c', '#c3823f', '#ffe1a8'], 90, 0.6);
      b.dead = true; b.removed = true;
    }
    const anchor = this.player ? this.player.x : this.door1.cx;
    for (const m of this.returnMembers) this.placeReturnMember(m, p, anchor);
    this.saveCheckpoint(5, false);
  }

  /** Puts one enemy of the way back where he belongs: nothing before the desert quickens; slain ones stay slain;
   *  the door's wave walks in from beyond the sun door; the others wait at their posts on their own floors. */
  /** Where one of the door's wave ends up, around where Rakti stands (anchorX): the Betal come right at her and
   *  hunt over the whole door floor; the archers take posts well spread out, on the side of her with more room
   *  (when she stands by the door they run past her to the west). */
  waveOnePost(m, anchorX) {
    const [f1, f2] = RETURN_FLOORS[3];
    const k = m.id === 'R2' || m.id === 'R4' ? 1 : 0;
    if (m.kind === 'betal') return Math.max(f1 + 30, Math.min(f2 - 15, anchorX + 110 + k * 45));
    const east = anchorX < (f1 + f2) / 2;
    return east ? Math.min(f2 - 15, anchorX + 300 + k * 95) : Math.max(f1 + 30, anchorX - 260 - k * 95);
  }

  placeReturnMember(m, p, anchorX = null) {
    const w = m.who;
    w.entry = null;
    w.walking = false;
    m.floor = RETURN_WAVES.find((d) => d.id === m.id).floor;
    const [f1, f2] = RETURN_FLOORS[m.floor];
    w.reset();
    if (m.kind === 'betal') {
      w.spawn.x = m.post; w.minX = Math.max(f1, m.post - 170); w.maxX = Math.min(f2, m.post + 170);
      w.x = m.post;
    } else {
      w.x = m.post; w.y = FLOOR_Y; w.appear = 1; w.goneT = 0; w.gone = false; w.fadeAlpha = 1;
      w.dormant = true;
    }
    w.hidden = !p.doorTried;
    if (!p.doorTried) return;
    if (p.herdDead[m.id]) {
      if (m.kind === 'betal') { w.dead = true; w.removed = true; }
      else { w.alive = false; w.gone = true; w.arrows = []; w.attachedArrow = null; }
      return;
    }
    this.applyReturnRush(w);
    const view = 430;   // about half a screen: beyond this from her, an enemy is out of sight
    if (m.wave === 1) {
      // the door's wave: the Betal walk in from the door side and come at her; an archer whose post is on her
      // far side drops from the gate's wall instead of walking through her
      if (anchorX === null || anchorX < f1 - 20 || anchorX > f2 + 20) {
        // she is on another floor: they simply wait by the door
        if (m.kind === 'betal') { w.minX = f1; w.maxX = f2; }
        return;
      }
      const toX = this.waveOnePost(m, anchorX);
      if (m.kind === 'betal') {
        w.minX = f1; w.maxX = f2; w.spawn.x = toX;
        this.startReturnEntry(w, { delay: m.delay, x: OUT_W + 40 + m.delay * 25, toX });
      } else if (anchorX !== null && toX < anchorX) {
        w.startX = toX;
        this.startReturnEntry(w, { delay: m.delay, x: toX, toX, drop: true });
      } else {
        w.startX = toX;
        this.startReturnEntry(w, { delay: m.delay, x: OUT_W + 40 + m.delay * 25, toX });
      }
      return;
    }
    // waves 2 and 3 wait at their posts; after a respawn nobody stands on top of her: whoever is too close walks in
    // from out of sight on the same floor to a post well clear of where she stands
    if (anchorX !== null && Math.abs(m.post - anchorX) < view) {
      const east = anchorX + view + 40 <= f2;
      const fromX = east ? Math.min(f2 - 10, anchorX + view + 40) : Math.max(f1 + 10, anchorX - view - 40);
      let toX = m.post;
      if (Math.abs(toX - anchorX) < 220) toX = east ? Math.min(f2 - 20, anchorX + 240) : Math.max(f1 + 20, anchorX - 240);
      if (m.kind === 'betal') w.spawn.x = toX;
      else w.startX = toX;
      this.startReturnEntry(w, { delay: 0.6 + (m.kind === 'archer' ? 0.8 : 0), x: fromX, toX });
    }
  }

  /** An enemy of the way back on the move: walking in from beyond the sun door, or running to a chasm's edge and
   *  leaping the quicksand after Rakti (takeoff/land), then walking to his post. */
  startReturnEntry(w, { delay = 0, x = null, toX, drop = false }) {
    w.hidden = false;
    if (x !== null) w.x = x;
    w.y = drop ? -70 : FLOOR_Y;
    w.entry = { delay, toX, drop, vy: 0 };
    w.walking = !drop;
    w.facing = toX < w.x ? 'left' : 'right';
    if (w.isArcher) { w.dormant = true; w.appear = 1; w.state = 'idle'; w.frame = 0; w.arrows = []; }
    else { w.fadeAlpha = 1; w.isMoving = !drop; }
    this.applyReturnRush(w);
  }

  updateReturnEntry(w, dt) {
    const e = w.entry;
    if (e.delay > 0) { e.delay -= dt; if (e.drop) w.y = -70; return; }
    if (e.drop) {
      // an archer drops from the top of the sun gate's wall and lands in a crouch of dust
      e.vy += 900 * dt;
      w.y = Math.min(FLOOR_Y, w.y + e.vy * dt);
      if (w.y >= FLOOR_Y) {
        this.burst(w.x, FLOOR_Y - 2, 14, ['#c8955a', '#ffe1a8', '#7a4a20'], 80, 0.5);
        this.cameraShake = Math.max(this.cameraShake, 0.18);
        this.finishReturnEntry(w);
      }
      return;
    }
    // a steady walk in, like a cutscene: no faster than a normal walk, with the walk cycle at the matching pace
    const speed = 78;
    w.isMoving = true;
    if (w.isArcher) w.animTimer = (w.animTimer || 0) + dt * 1.3;
    else w.animTime = (w.animTime || 0) + dt;
    const d = e.toX - w.x;
    w.facing = d < 0 ? 'left' : 'right';
    if (Math.abs(d) > 2) w.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
    else this.finishReturnEntry(w);
  }

  finishReturnEntry(w) {
    w.x = w.entry.toX;
    w.y = FLOOR_Y;
    w.entry = null;
    w.walking = false;
    w.isMoving = false;
    if (w.isArcher) { w.dormant = false; w.cooldownTimer = 1.0; w.animTimer = 0; w.state = 'idle'; }
  }

  /** The enemies of the way back: their entries, their fights, and following Rakti west over the quicksand when she
   *  leaves them behind (so every one of them can still be slain to fill the hourglass). */
  updateReturnWave(dt, player, frozen) {
    for (const m of this.returnMembers) {
      const w = m.who;
      if (w.hidden || frozen) continue;
      if (w.entry) { this.updateReturnEntry(w, dt); continue; }
      if (m.kind === 'archer') {
        if (w.gone) continue;
        // (a slain archer keeps updating: his death frames play, he fades out and is gone, his last arrows land)
        w.dormant = !player || Math.abs(player.x - w.x) > 620;
        this.updateArcher(w, dt, player);
      }
      // (the Betal update with the other Betal outside; slain ones fade and are removed there)
    }
  }

  /** The hourglass fills with every enemy of the way back slain; full, it can turn time back (engine HUD hook). */
  sandsCharge() {
    const p = this.progress;
    if (!p.doorTried || p.rewound || p.keyTaken) return null;
    const have = this.returnMembers.filter((m) => p.herdDead[m.id]).length;
    return { have, need: this.returnMembers.length, ready: have >= this.returnMembers.length };
  }

  get chargeFull() { const c = this.sandsCharge(); return Boolean(c && c.ready); }

  /** While the way back for the key lasts, the desert outside runs HASTE x faster (engine hook). */
  worldTimeScale() {
    // (the desert no longer runs everything faster: its enemies walk at their own pace but strike and shoot
    // quicker (applyReturnRush), and its traps are quickened one by one)
    return 1;
  }

  /** On the way back the desert's warriors attack faster, but do not move faster. */
  applyReturnRush(w) {
    if (w.isArcher) { w.shootCooldown = 1.7; w.frameDuration = 0.085; }
    else { w.attackAnimDuration = 0.5; w.attackHitAt = 0.27; w.rushCooldown = 0.55; }
  }

  /** The rewind is waiting to be used (whether or not the hourglass is full yet). */
  rewindPending() {
    const p = this.progress;
    return this.area === 'out' && p.doorTried && p.sandsTaken && !p.rewound && !p.archerA2 && !this.rewind && this.balls[0].state === 'gone';
  }

  canRewind() { return this.rewindPending() && this.chargeFull; }

  /** Engine hook for [F]: by tower 1's boulder pile the sands run backward (once) instead of slowing the world. */
  useSands(player) {
    if (!this.rewindPending() || !player.isGrounded || Math.abs(player.x - this.balls[0].x0) > 190) return false;
    if (!this.chargeFull) {
      const c = this.sandsCharge();
      this.toast(`⟲ THE SANDS ARE NOT CHARGED · ${c.have}/${c.need} SLAIN`, 2.2);
      return false;     // (the sands still slow time)
    }
    this.startRewind(player);
    return true;
  }

  startRewind(player) {
    const b = this.balls[0], t = this.archers.A2;
    this.rewind = { t: 0, from: { x: b.x0, y: b.y0 }, to: { x: this.towers[0].cx, y: TOWER_ROOF_Y - 22 }, focusX: (b.x0 + t.x) / 2 };
    player.inputLocked = true;
    player.vx = 0;
    player.facing = b.x0 > player.x ? 'right' : 'left';
    Sfx.play('portal_open');
    this.toast('⏳ THE SANDS RUN BACKWARD', 2.4);
    this.cameraShake = 0.4;
  }

  /** The boulder's flight in reverse: shards gather on the roof into the sphere, it flies back down its arc,
   *  and the sphere un-forms into the rough boulder (frames 5 -> 0). */
  updateRewind(dt, player) {
    const r = this.rewind;
    if (!r) return;
    r.t += dt;
    if (player) { player.inputLocked = true; player.vx = 0; }
    const b = this.balls[0];
    b.trail = b.trail || [];
    if (r.t < REWIND.gather) {
      b.state = 'rewinding';
      b.x = r.to.x; b.y = r.to.y;
      // shards stream back in from all around the roof
      if (Math.random() < 0.9) {
        const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 40;
        this.particles.push({ x: r.to.x + Math.cos(a) * d, y: r.to.y + Math.sin(a) * d * 0.6, vx: -Math.cos(a) * d * 1.6, vy: -Math.sin(a) * d * 1.0,
          life: 0.55, maxLife: 0.55, size: 2 + Math.random() * 2, color: Math.random() > 0.5 ? '#c8955a' : '#ffe39a', g: 0 });
      }
    } else if (r.t < REWIND.fly) {
      const u = 1 - (r.t - REWIND.gather) / (REWIND.fly - REWIND.gather);   // 1 -> 0 along the old arc
      b.x = r.from.x + (r.to.x - r.from.x) * u;
      b.y = r.from.y + (r.to.y - r.from.y) * u - Math.sin(u * Math.PI) * 110;
      b.spin = (b.spin || 0) - dt * 9;
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 12) b.trail.shift();
    } else if (r.t < REWIND.end) {
      b.x = r.from.x; b.y = r.from.y; b.spin = 0;
      if (b.trail.length) b.trail.shift();
      if (!r.landed) { r.landed = true; this.cameraShake = 0.5; this.burst(b.x, b.y, 22, ['#9ff6e8', '#ffe39a', '#c8955a'], 110, 0.6); }
    } else {
      this.rewind = null;
      b.state = 'idle'; b.t = 0; b.trail = []; b.spin = 0;
      b.target = 'A2';
      this.progress.rewound = true;
      if (player) player.inputLocked = false;
      this.say('rewound', '⚜ MAA KALI ⚜', 'Whole again. Now press [Q] and send it at him.');
    }
  }

  /** The boulder's frame while it rewinds (the sphere until it lands, then it un-forms 5 -> 0). */
  rewindFrame() {
    const r = this.rewind;
    if (!r || r.t < REWIND.fly) return 5;
    return Math.max(0, 5 - Math.floor(((r.t - REWIND.fly) / (REWIND.unform - REWIND.fly)) * 6));
  }

  /** Engine hook: what the camera frames during the rewind. */
  cameraFocus(line) {
    const r = this.rewind;
    if (r) return { x: r.focusX, y: FLOOR_Y - 120 };
    // the sun door talk: glide to the first tower's sun mark while Kali speaks of it, then glide back
    const want = line?.focus === 'sunmark';
    if (want && !this.sunPan) this.sunPan = { u: 0, dir: 1 };
    const P = this.sunPan;
    if (!P) return null;
    P.dir = want ? 1 : -1;
    const pl = this.player, fx = pl ? pl.x : this.door1.cx, fy = (pl ? pl.y : FLOOR_Y) - 20;
    const m = this.sunMarkPos(), u = P.u, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    return { x: fx + (m.x - fx) * e, y: fy + (m.y - 8 - fy) * e };
  }

  /** Where the sun mark sits in the world (the middle of the first tower, over its window). */
  sunMarkPos() {
    const t = this.towers[0], s = TOWER_SCALE;
    return { x: t.cx + (SUN_MARK.ix - TOWER.cx) * s, y: FLOOR_Y + 4 - TOWER.baseY * s + SUN_MARK.iy * s };
  }

  /** The camera glide (real time, so the Sands never slow it), the ignition flash, and embers while it burns. */
  updateSunMark(dt) {
    const m = this.sunMark, P = this.sunPan, rd = this.realDt ?? dt;
    if (!m) return;
    if (P) {
      P.u = Math.max(0, Math.min(1, P.u + (rd / (P.dir > 0 ? SUN_PAN.there : SUN_PAN.back)) * P.dir));
      if (P.dir > 0 && P.u >= 0.92 && !m.lit) {
        m.lit = true;
        m.ignite = 1;
        this.cameraShake = Math.max(this.cameraShake, 0.35);
        Sfx.play('portal_open');
        const pos = this.sunMarkPos();
        this.burst(pos.x, pos.y, 26, ['#fff2b0', '#ffd25a', '#ffae2e', '#ff8a1e'], 120, 1.0);
      }
      if (P.dir < 0 && P.u <= 0) this.sunPan = null;
    }
    if (m.ignite > 0) m.ignite = Math.max(0, m.ignite - rd * 0.8);
    const burning = (m.lit || this.progress.doorTried) && !this.progress.keyTaken && this.area === 'out';
    if (burning && Math.random() < rd * 9) {
      const pos = this.sunMarkPos();
      this.particles.push({ x: pos.x + (Math.random() - 0.5) * 22, y: pos.y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 10,
        vy: -22 - Math.random() * 26, life: 1.6, maxLife: 1.6, size: 0.8 + Math.random() * 1.2, color: Math.random() > 0.4 ? '#ffd25a' : '#ff9a2e', g: 0 });
    }
  }

  /** The painted sun's gold, cut from the first tower's art once: drawn again in 'lighter' it makes the sun burn. */
  sunGlowArt() {
    const r = SUN_MARK.r, k = TOWER_SCALE, size = r * 2 * k;
    return this.cachedArt('sunGlow', size, size, ready(this.tower1Img), (g) => {
      g.drawImage(this.tower1Img, SUN_MARK.ix - r, SUN_MARK.iy - r, r * 2, r * 2, 0, 0, size, size);
      const c = g.canvas, x = c.getContext('2d');
      let d;
      try { d = x.getImageData(0, 0, c.width, c.height); } catch (e) { return; }   // (a file:// page cannot read it)
      const px = d.data;
      for (let i = 0; i < px.length; i += 4) {
        const R = px[i], G = px[i + 1], B = px[i + 2];
        const gold = R > 150 && G > 90 && R - B > 90;   // the sun and its rays, not the navy window or the stone
        const cx = ((i / 4) % c.width) / c.width - 0.5, cy = Math.floor(i / 4 / c.width) / c.height - 0.5;
        if (!gold || Math.hypot(cx, cy) > 0.5) px[i + 3] = 0;
      }
      x.putImageData(d, 0, 0);
    });
  }

  /** The sun mark: the sun painted in the first tower's window. Quiet until it ignites; then it burns and pulses,
   *  with a glow and a light shaft into the sky; once the key is hers it stays lit, calmly. */
  drawSunMark(ctx) {
    const m = this.sunMark, p = this.progress;
    if (!m) return;
    const pos = this.sunMarkPos(), t = this.animTime;
    const lit = m.lit || p.doorTried, burning = lit && !p.keyTaken;
    const R = SUN_MARK.glowR;
    const pulse = burning ? 0.85 + Math.sin(t * 3.2) * 0.15 : 1;
    const half = SUN_MARK.r * TOWER_SCALE;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const glowArt = lit ? this.sunGlowArt() : null;
    if (glowArt) {
      // the painted sun burning: pulsing while it calls her, steady once the key is taken (and a flash as it ignites)
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, (burning ? 0.55 + 0.35 * Math.sin(t * 3.2) : 0.4) + m.ignite);
      ctx.drawImage(glowArt, -half, -half, half * 2, half * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (burning) {
      // a shaft of light into the sky: it can be seen from far down the dunes
      ctx.globalCompositeOperation = 'lighter';
      const top = -pos.y - 40, w = R * 1.5 * pulse, y0 = -half * 0.6;   // it rises from the top of the sun
      const shaft = ctx.createLinearGradient(0, y0, 0, top);
      shaft.addColorStop(0, 'rgba(255, 200, 80, 0.4)');
      shaft.addColorStop(0.5, 'rgba(255, 190, 70, 0.2)');
      shaft.addColorStop(1, 'rgba(255, 180, 60, 0)');
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, y0); ctx.lineTo(w * 0.5, y0); ctx.lineTo(w * 1.3, top); ctx.lineTo(-w * 1.3, top);
      ctx.closePath();
      ctx.fill();
    }
    if (lit) {
      ctx.globalCompositeOperation = 'lighter';
      const gr = R * (burning ? 3.4 * pulse : 2.2);
      const glow = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, gr);
      glow.addColorStop(0, burning ? 'rgba(255, 170, 50, 0.35)' : 'rgba(255, 180, 80, 0.18)');
      glow.addColorStop(1, 'rgba(255, 160, 40, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-gr, -gr, gr * 2, gr * 2);
    }
    ctx.restore();
  }

  get cutscene() { return Boolean(this.rewind); }

  takeKey() {
    if (this.key.taken) return;
    this.key.taken = true;
    Sfx.play('item_get');
    this.key.fly = 0;
    this.key.fromX = this.key.x;
    this.key.fromY = this.key.y;
    this.progress.keyTaken = true;
    this.cameraShake = 0.3;
    this.killToastText = '⚜ SUN KEY · THE SANDS SETTLE ⚜';
    this.killToastTimer = 2.4;
    this.saveCheckpoint(1, false);
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
    Sfx.play('item_get');
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
    if (!player.hasPearl) return;   // the earth answers through the Pearl of the Tide
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
    // spoken once is enough: a respawn from an earlier checkpoint does not play it again
    if (this.saved?.said) this.saved.said[id] = true;
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
    if (enemy.ret && !p.herdDead[enemy.id]) {
      // slain stays slain, even after a respawn (written into the checkpoint too)
      p.herdDead[enemy.id] = true;
      this.saved.herdDead = { ...(this.saved.herdDead || {}), [enemy.id]: true };
      const c = this.sandsCharge();
      if (c && c.ready) {
        this.toast('⏳ THE SANDS OF TIME ARE CHARGED', 2.8);
        this.say('charged', '⚜ MAA KALI ⚜', 'The hourglass is full. Go to the rubble at the first tower and turn time back with [F].');
      } else if (c) this.toast(`⟲ SANDS ${c.have}/${c.need}`, 1.4);
    }
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

    this.updateSunMark(dt);

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
          'Surya Mandir. The second relic lies beyond a sealed door to the east, and Asura archers hold the towers. Keep moving.');
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
            'A hall of the sun-kings. Something here still burns with my light. Find it before its guardians find you.');
        }
      }
      return;
    }

    // moving piers carry Rakti with them; sinking piers go down into the quicksand under her weight
    for (const p of this.pillars) {
      if (!p.swing && !p.sinks) continue;
      const prev = p.top;
      if (p.sinks) {
        const on = player && player.isGrounded && player.currentPlatform?.pierRef === p;
        p.sinkD = on ? Math.min(PIER_SINK_MAX, p.sinkD + PIER_SINK_SPEED * dt) : Math.max(0, p.sinkD - PIER_RISE_SPEED * dt);
        p.top = p.top0 + p.sinkD + (p.swing ? Math.sin((this.animTime * Math.PI * 2) / p.period + p.phase) * p.swing : 0);
        if (on && Math.random() < dt * 14) this.burst(p.cx + (Math.random() - 0.5) * p.w, SAND_Y - 2, 2, ['#dca15c', '#c3823f', '#ffe1a8'], 40, 0.5);
        if (on && p.sinkD >= PIER_SINK_MAX) { player.isGrounded = false; player.currentPlatform = null; }   // swallowed: she drops into the sand
      } else {
        p.top = p.base + Math.sin((this.animTime * Math.PI * 2) / p.period + p.phase) * p.swing;
      }
      if (player && player.isGrounded && player.currentPlatform?.pierRef === p) {
        player.y = p.top;
        player.currentPlatform.y = p.top;
      } else if (player && player.isGrounded && Math.abs(playerX - p.cx) <= p.half + 2 && Math.abs(playerY - prev) < 3) {
        player.y = p.top;
      }
    }
    this.updateQuicksand(dt, playerX, playerY, isDivine, player);

    // ---------------------------------------------------- outside
    if (this.area === 'out') {
      // Kali teaches [Q] as Rakti nears the first tower
      if (!p.qUnlocked && playerX >= 790) {
        p.qUnlocked = true;
        this.say('q', '⚜ MAA KALI: THE PEARL AWAKENS ⚜',
          'No leap will reach that archer. But the Pearl has woken. Stand by the boulder and press [Q], and I will hurl it at him.', true);
      }
      if (p.qUnlocked && !p.slabsRaised && playerX >= 1340 && playerX < 1490) {
        this.say('slabs', '⚜ MAA KALI ⚜', 'Those rocks are too rough to stand on. Press [Q] and I will flatten them into a path.');
      }

      // the rewind at tower 1 (a cutscene: everything else holds still)
      this.updateRewind(dt, player);
      const frozen = talking || Boolean(this.rewind);

      // archers on the two towers: they shoot once Rakti comes near
      const A = this.archers.A, Bq = this.archers.B, A2 = this.archers.A2;
      A.dormant = !(playerX > 700 && playerX < A.x + 560);
      Bq.dormant = !(playerX > 2040 && playerX < Bq.x + 560);   // not while she is still crossing the floating rocks
      A2.dormant = !(playerX > 640 && playerX < A2.x + 560);
      if (!frozen) for (const id of ['A', 'B', 'A2']) this.updateArcher(this.archers[id], dt, player);
      // the herd on the way back for the key
      if (p.doorTried) this.updateReturnWave(dt, player, frozen);
      if (p.doorTried && !p.keyTaken) {
        // the quickened desert: sand blows hard across the view
        this.hasteWind = Math.min(1, (this.hasteWind || 0) + dt);
        const v = this.view;
        if (v && Math.random() < dt * 40) {
          this.particles.push({ x: v.x2 + 10, y: 20 + Math.random() * (FLOOR_Y - 20), vx: -260 - Math.random() * 160, vy: 10 + Math.random() * 20,
            life: 2.4, maxLife: 2.4, size: 1 + Math.random() * 1.6, color: Math.random() > 0.5 ? '#ffd890' : '#d09048', g: 0 });
        }
        // Kali, as Rakti nears the first tower again
        if (playerX < 1560 && !p.archerA2) {
          this.say('a2', '⚜ MAA KALI ⚜', 'Another archer, and the key is up there with him. Your boulder lies broken on his roof. Cut down the desert\'s warriors to fill the hourglass, then stand by the rubble and press [F]. Time will turn back, once.');
        }
      } else this.hasteWind = Math.max(0, (this.hasteWind || 0) - dt);

      // boulders: forming -> flying in an arc onto the tower top -> falling away
      for (const b of this.balls) this.updateBall(b, dt);
      // floating rocks: bob until [Q], then flatten into slabs
      for (const s of this.slabs) {
        if (s.state === 'forming') {
          if (s.delay > 0) { s.delay -= dt; continue; }
          if (!s.pulled) {   // it tears free of the quicksand
            s.pulled = true;
            Sfx.play('ground_rise');   // it tears free of the quicksand
            this.burst(s.cx, SAND_Y - 2, 16, ['#dca15c', '#c3823f', '#ffe1a8'], 90, 0.6);
          }
          s.t += dt;
          if (Math.random() < 0.5) this.burst(s.cx + (Math.random() - 0.5) * 30, s.top + 20, 1, ['#9ff6e8', '#ffe39a'], 40, 0.5);
          if (s.t >= 0.6) {
            s.state = 'solid';
            this.burst(s.cx, s.top + 10, 12, ['#c8955a', '#9ff6e8', '#ffe39a'], 70, 0.5);
            this.cameraShake = Math.max(this.cameraShake, 0.15);
          }
        }
      }

      // crumbling slabs: shake once stood on, drop after FALL_DELAY, come back a little later.
      // On the way back the second chasm's slabs rise and sink in a wave instead, and the [Q] slabs crumble too.
      if (this.onWayBack) {
        // the second chasm's slabs stay up until stepped on; then, unless the Sands slow time, they drop at once
        for (const f of this.fallers) this.updateFaller(f, dt, player, this.sandsActive ? RETURN_FALL_SANDS : 0);
        for (const q of this.slabFallers) this.updateFaller(q, dt, player, FALL_DELAY / HASTE);
        if (player && player.isGrounded && playerX > 3411 && playerX < 3530) {
          this.say('wave', '⚜ MAA KALI ⚜', 'These slabs drop the moment you land. Slow time with [F] first, and they will hold you long enough.');
        }
      } else {
        for (const f of this.fallers) {
          if (f.wave) Object.assign(f, { wave: false, waveSolid: false, state: 'idle', t: 0, dy: 0, vy: 0, alpha: 1, sank: false });
          this.updateFaller(f, dt, player);
        }
      }

      // tower 2: the ladder unfurls and the hourglass appears once its archer has fallen;
      // tower 1: the same for the Sun Key once its second archer falls
      const unfurl = (key, t) => {
        if (this[key] >= 1) return;
        this[key] = Math.min(1, this[key] + dt / 0.9);
        if (Math.random() < 0.9) this.burst(t.ladderX + (Math.random() - 0.5) * 10, TOWER_ROOF_Y + Math.random() * (FLOOR_Y - TOWER_ROOF_Y), 1, ['#ffe39a', '#ffffff'], 30, 0.6);
        if (this[key] >= 1) this.updateLadders();
      };
      if (p.archerB) {
        unfurl('ladderShown', this.towers[1]);
        if (!this.hourglass.taken && this.hourglass.shown < 1) this.hourglass.shown = Math.min(1, this.hourglass.shown + dt / 1.0);
      }
      if (p.archerA2) {
        unfurl('ladderShown1', this.towers[0]);
        if (!this.key.taken && this.key.shown < 1) this.key.shown = Math.min(1, this.key.shown + dt / 1.0);
      }
      if (this.hourglass.taken && this.hourglass.fly < 1) this.hourglass.fly = Math.min(1, this.hourglass.fly + dt * 1.5);
      if (this.key.taken && this.key.fly < 1) this.key.fly = Math.min(1, this.key.fly + dt * 1.5);

      // the sun door: the key flies into the lock, then the doors swing open
      if (p.door1Open && this.door1.anim < 1) {
        this.door1.keyFly = Math.min(1, (this.door1.keyFly ?? 0) + dt * 1.6);
        if (this.door1.keyFly >= 1) {
          if (this.door1.anim === 0) Sfx.play('door_open');
          this.door1.anim = Math.min(1, this.door1.anim + dt / 1.4);
          this.cameraShake = Math.max(this.cameraShake, 0.2);
          if (this.door1.anim >= 1) this.toast('⚜ THE SUN DOOR OPENS ⚜', 2.2);
        }
      }

      // Betal before the door
      for (const b of this.betals) if (b.area === 'out' && !b.entry) b.update(dt, player, this, !frozen);

      if (player && !player.isDead && player.isGrounded) {
        // checkpoints past each tower
        for (let i = this.checkpointIndex + 1; i <= 2; i++) {
          if (playerX >= this.checkpoints[i].x) this.saveCheckpoint(i);
        }
        // on the way back for the key they follow her west: the door -> past tower 2 -> past tower 1
        if (p.doorTried && !p.keyTaken) {
          if (this.checkpointIndex === 5 && playerX <= this.checkpoints[2].x) this.saveCheckpoint(2);
          else if (this.checkpointIndex === 2 && playerX <= this.checkpoints[1].x) this.saveCheckpoint(1);
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
    if (!talking) this.updateHordeEntries(dt, player);
    for (const id of ['H1', 'H2']) {
      const a = this.archers[id];
      if (a.hidden || a.entry) continue;
      if (a.appear < 1) a.appear = Math.min(1, a.appear + dt * 2);
      a.dormant = a.appear < 1;
      if (!talking) this.updateArcher(a, dt, player);
    }
    for (const b of this.betals) if (b.horde && !b.entry) b.update(dt, player, this, !talking);

    if (p.hordeStarted && !p.hordeCleared) {
      const alive = this.betals.some((b) => b.horde && !b.dead) || this.archers.H1.alive || this.archers.H2.alive;
      if (!alive) {
        p.hordeCleared = true;
        this.cameraShake = 0.6;
        this.say('cleared', '⚜ MAA KALI ⚜', 'It is over. The sun-door is waking. Go.');
      }
    }
    if (p.hordeCleared && this.door2.anim < 1) {
      if (this.door2.anim === 0) Sfx.play('door_open');
      this.door2.anim = Math.min(1, this.door2.anim + dt / 1.6);
      if (this.door2.anim >= 1) { Sfx.play('portal_open'); this.toast('⚜ THE PORTAL IS OPEN ⚜', 2.8); }
    }
  }

  updateFaller(f, dt, player, delay = FALL_DELAY) {
    f.t += dt;
    if (f.state === 'idle') {
      const box = this.slabBox(f);
      const on = player && player.isGrounded && player.currentPlatform?.faller === f
        && player.x >= box.x1 - 2 && player.x <= box.x2 + 2;
      if (on) {
        f.state = 'shaking'; f.t = 0; this.burst(f.cx, f.top + 10, 6, ['#c8955a', '#7a4f2a'], 40, 0.4);
        if (delay <= 0) {
          // it gives way the moment she lands: no last-instant jump (coyote time and a buffered jump are cancelled)
          player.coyoteTimer = 0;
          player.jumpBufferTimer = 0;
          f.t = 1e9;
        }
      }
    }
    if (f.state === 'shaking') {
      if (f.t >= delay) {
        f.state = 'falling'; f.t = 0; f.vy = 40;
        this.burst(f.cx, f.top + 8, 14, ['#c8955a', '#7a4f2a', '#e8b878'], 90, 0.6);
        this.cameraShake = Math.max(this.cameraShake, 0.15);
        // the slab is gone from under her
        if (player && player.currentPlatform?.faller === f) { player.isGrounded = false; player.currentPlatform = null; }
      }
    } else if (f.state === 'falling') {
      f.vy += 900 * dt;
      f.dy += f.vy * dt;
      f.alpha = f.sank ? 0 : Math.max(0, 1 - f.t / 0.9);
      if (!f.sank && f.top + f.dy > SAND_Y - 6) {
        f.sank = true;
        f.alpha = 0;
        this.burst(f.cx, SAND_Y - 2, 14, ['#dca15c', '#c3823f', '#ffe1a8'], 70, 0.6);
      }
      if (f.t >= FALL_RESPAWN) { f.state = 'returning'; f.t = 0; f.dy = 0; f.alpha = 0; f.sank = false; }
    } else if (f.state === 'returning') {
      f.alpha = Math.min(1, f.t / 0.6);
      if (f.t >= 0.6) { f.state = 'idle'; f.t = 0; f.alpha = 1; }
    }
  }

  /** A crumbling slab: gentle bob while idle, a tremble once stepped on, then it drops away. */
  drawFaller(ctx, f) {
    const k = SLAB.scale, w = SLAB.frameW * k, h = SLAB.frameH * k;
    if (f.alpha <= 0 || !this.inView(f.cx - w, f.cx + w)) return;
    const c = this.cachedArt('slab:5', w, h, ready(this.slabSheet),
      (g) => g.drawImage(this.slabSheet, 5 * SLAB.frameW, 0, SLAB.frameW, SLAB.frameH, 0, 0, w, h));
    if (!c) return;
    let ox = 0, oy = f.dy, rot = 0;
    if (f.state === 'idle' || f.state === 'returning') oy += Math.sin(this.animTime * 1.7 + f.phase) * 1.5;
    if (f.state === 'shaking') { ox = Math.sin(f.t * 90) * 1.6; oy += Math.sin(f.t * 70) * 0.8; }
    if (f.state === 'falling') rot = Math.min(0.5, f.t * 0.7) * (f.phase % 2.6 > 1.3 ? 1 : -1);
    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.translate(f.cx + ox, f.top + oy);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(c, -SLAB.anchorX * k, -SLAB.anchorY * k, w, h);
    ctx.restore();
  }

  /** Quicksand: slows, sinks and finally swallows Rakti; Kali's form floats on it. */
  updateQuicksand(dt, px, py, isDivine, player) {
    // drifting grains over every pit
    for (const pit of this.pits) {
      if (pit.area === this.area && pit.sand !== false && Math.random() < dt * 6) {
        this.particles.push({ x: pit.x1 + Math.random() * (pit.x2 - pit.x1), y: SAND_Y + 2, vx: (Math.random() - 0.5) * 14, vy: -6,
          life: 1.2, maxLife: 1.2, size: 1.5, color: Math.random() > 0.5 ? '#ffd890' : '#b8702e', g: 0 });
      }
    }
    if (!player || player.isDead) { this.qsDepth = 0; return; }
    // in the sand: inside a pit, at or below its surface, and not on the way up out of it
    const pit = this.pits.find((q) => q.area === this.area && q.sand !== false && px >= q.x1 && px <= q.x2);
    // once she is in, a jump (vy < 0) is cancelled below: there is no leaping out of the sand
    const inSand = Boolean(pit) && py >= SAND_Y - 3 && (player.vy >= 0 || this.qsWasIn) && !player.isClimbing;
    if (!inSand) {
      // she keeps her depth until she is clear of the surface (so a short hop lands back where she was)
      if (py < SAND_Y - 6) this.qsDepth = 0;
      else if (this.qsDepth > 0 && py > SAND_Y + this.qsDepth + 4) this.qsDepth = Math.max(0, py - SAND_Y);
      this.qsWasIn = false;
      this.qsLastX = px;
      return;
    }
    if (!this.qsWasIn) {
      this.burst(px, SAND_Y - 2, 18, ['#dca15c', '#c3823f', '#ffe1a8'], 100, 0.6);
      this.cameraShake = Math.max(this.cameraShake, 0.15);
      this.qsLastX = px;
      if (!this.progress.said.quicksand) this.toast('⚠ QUICKSAND - THERE IS NO ESCAPE ⚠', 2.4);
      this.progress.said.quicksand = true;
    }
    this.qsWasIn = true;
    const moved = px - (this.qsLastX ?? px);
    if (isDivine) {   // Kali floats up and glides over it
      this.qsDepth = Math.max(0, this.qsDepth - dt * 40);
      this.qsLastX = px;
      return;
    }
    // wading: only part of each step goes through
    player.x = (this.qsLastX ?? px) + moved * QS_SLOW;
    this.qsLastX = player.x;
    this.qsDepth += dt * (Math.abs(moved) > 0.2 ? QS_SINK_MOVING : QS_SINK) * (this.onWayBack ? HASTE : 1);
    if (Math.random() < dt * 14) {
      this.particles.push({ x: player.x + (Math.random() - 0.5) * 22, y: SAND_Y + this.qsDepth * 0.2, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20,
        life: 0.5, maxLife: 0.5, size: 2, color: Math.random() > 0.5 ? '#e8b878' : '#a8692e', g: 80 });
    }
    // she stays locked to the sinking surface (frame-rate independent)
    this.qsDepth = Math.max(this.qsDepth, py - SAND_Y);
    player.y = SAND_Y + this.qsDepth;
    player.vy = 0;
    player.isGrounded = true;
    player.currentPlatform = { id: 'quicksand', pit, x1: pit.x1, x2: pit.x2, y: player.y, oneWay: false };
    if (this.qsDepth >= QS_MAX) {
      // swallowed
      this.burst(player.x, SAND_Y, 26, ['#dca15c', '#c3823f', '#ffe1a8'], 90, 0.8);
      this.qsDepth = 0;
      this.qsWasIn = false;
      player.respawnFromPit(this);
      this.qsLastX = player.x;
    }
  }

  /** The horde pours into the hall from both sides: from the left they leap the quicksand pit from the
   *  entrance floor, from the right they run in past the sun-door (off screen). Kali speaks once all are in. */
  startHorde() {
    const p = this.progress;
    if (p.hordeStarted) return;
    p.hordeStarted = true;
    this.cameraShake = 0.8;
    const L0 = ROOM_X + 120, edge = ROOM_X + 250, land = ROOM_X + 720, R0 = ROOM_END + 50;
    const enter = (who, side, toX, delay, isArcher = false) => {
      who.hidden = false;
      who.entry = side === 'L'
        ? { side, delay, t: 0, x: L0 - delay * 40, toX, takeoff: edge - 6, land, leapT: -1, isArcher }
        : { side, delay, t: 0, x: R0 + delay * 30, toX, isArcher };
      who.x = who.entry.x;
      who.y = FLOOR_Y;
      if (isArcher) { who.appear = 1; who.dormant = true; } else { who.fadeAlpha = 1; who.isMoving = true; }
      who.facing = side === 'L' ? 'right' : 'left';
    };
    const hb = this.betals.filter((b) => b.horde);
    enter(hb[0], 'L', hb[0].spawn.x, 0.15);
    enter(hb[1], 'R', hb[1].spawn.x, 0.0);
    enter(hb[2], 'R', hb[2].spawn.x, 0.7);
    enter(this.archers.H1, 'L', this.archers.H1.x0, 0.9, true);
    enter(this.archers.H2, 'R', this.archers.H2.x0, 1.3, true);
    this.toast('⚜ THE HALL AWAKENS ⚜', 2.4);
  }

  updateHordeEntries(dt, player) {
    const movers = [...this.betals.filter((b) => b.horde), this.archers.H1, this.archers.H2].filter((w) => w.entry);
    for (const w of movers) {
      const e = w.entry;
      if (e.delay > 0) { e.delay -= dt; continue; }
      e.t += dt;
      const speed = e.isArcher ? 150 : 125;
      w.animTime = (w.animTime || 0) + dt;
      if (e.side === 'L' && e.leapT < 0 && w.x < e.takeoff) {
        w.x = Math.min(e.takeoff, w.x + speed * dt);           // a run-up on the entrance floor
        if (w.x >= e.takeoff) { e.leapT = 0; this.burst(w.x, FLOOR_Y - 2, 8, ['#c8955a', '#ffe1a8'], 60, 0.4); }
      } else if (e.side === 'L' && e.leapT >= 0 && e.leapT < 1) {
        // the leap over the quicksand pit
        e.leapT = Math.min(1, e.leapT + dt / 0.85);
        const u = e.leapT;
        w.x = e.takeoff + (e.land - e.takeoff) * u;
        w.y = FLOOR_Y - Math.sin(u * Math.PI) * 95;
        if (e.leapT >= 1) {
          w.y = FLOOR_Y;
          e.leapT = 2;
          this.burst(w.x, FLOOR_Y - 2, 14, ['#c8955a', '#ffe1a8', '#7a4a20'], 90, 0.5);
          this.cameraShake = Math.max(this.cameraShake, 0.25);
        }
      } else {
        const d = e.toX - w.x;
        w.facing = d < 0 ? 'left' : 'right';
        if (Math.abs(d) > 3) w.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
        else {
          w.x = e.toX;
          w.entry = null;
          if (e.isArcher) { w.dormant = false; w.cooldownTimer = 1.4; if (player) w.facing = player.x < w.x ? 'left' : 'right'; }
          else w.isMoving = false;
        }
      }
      if (!e.isArcher) w.isMoving = Boolean(w.entry) && !(e.side === 'L' && e.leapT >= 0 && e.leapT < 1);
    }
    // all in: Kali speaks
    if (!this.hordeTalked && this.progress.hordeStarted && !movers.length) {
      this.hordeTalked = true;
      this.pendingDialogue = {
        speaker: 'kali', title: '⚜ MAA KALI ⚜',
        text: 'A trap! They are coming from both sides. Keep the Trishul flying, and do not stand still.'
      };
    }
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
        if (b.target === 'A2') {
          this.progress.archerA2 = true;
          this.say('ladder1', '⚜ MAA KALI ⚜', 'A ladder has fallen on the first tower. The Sun Key is on its roof. Climb.');
        }
        if (b.target === 'B') {
          this.progress.archerB = true;
          this.say('ladder', '⚜ MAA KALI ⚜', 'He was guarding something. A ladder has unfurled on his tower - climb it, Rakti, and see what waits on top.');
        }
        this.cameraShake = 0.9;
        this.burst(b.x, b.y, 30, ['#c8955a', '#ffe39a', '#9ff6e8', '#7a4f2a'], 150, 0.8);
        // the sphere bursts apart against the tower top
        this.burst(b.x, b.y, 26, ['#c8955a', '#7a4f2a', '#e8b878', '#5a3a1c'], 190, 1.0);
        b.state = 'gone';
        b.trail = [];
      }
      return;
    }
    if (b.state === 'falling') {
      b.vy += 900 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 6;
      b.trail.shift();
      if (b.y > FLOOR_Y - 20) {
        // it smashes apart on the ground
        this.burst(b.x, FLOOR_Y - 10, 34, ['#c8955a', '#7a4f2a', '#e8b878', '#5a3a1c'], 160, 0.9);
        this.cameraShake = Math.max(this.cameraShake, 0.45);
        b.state = 'gone';
      }
      if (b.t > 2) b.state = 'gone';
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

  drawScreen(ctx, canvas, x, alpha = 1, dy = 0) {
    if (!canvas || alpha <= 0) return;
    if (!this.inView(x, x + SCREEN_W + 1)) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(canvas, x, BG_Y + dy, SCREEN_W + 1, SCREEN_H + BG_EXT);
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
      this.drawScreen(ctx, this.screenCanvas('portal', this.bg.portal, { feather: false }), X(0), 1, PORTAL_DY);
      this.drawScreen(ctx, this.screenCanvas('filler', this.bg.filler), X(1));
      this.drawScreen(ctx, this.screenCanvas('filler_m', this.bg.filler, { mirror: true }), X(2));
      this.drawScreen(ctx, this.screenCanvas('filler', this.bg.filler), X(3));
      this.drawScreen(ctx, this.screenCanvas('filler_m', this.bg.filler, { mirror: true }), X(4));
      this.drawScreen(ctx, this.screenCanvas('door_closed', this.bg.doorClosed), X(5));
      if (this.door1.anim > 0) this.drawScreen(ctx, this.screenCanvas('door_open', this.bg.doorOpen), X(5), this.door1.anim);
      this.renderPortalGlow(ctx);
      this.renderDoorGlow(ctx, this.door1, this.progress.keyTaken, false);
    } else {
      this.drawScreen(ctx, this.screenCanvas('room_entrance', this.bg.roomEntrance, { feather: false }), RX(0));
      this.drawScreen(ctx, this.screenCanvas('room_end_closed', this.bg.roomEndClosed), RX(1));
      if (this.door2.anim > 0) this.drawScreen(ctx, this.screenCanvas('room_end_open', this.bg.roomEndOpen), RX(1), this.door2.anim);
      this.renderDoorGlow(ctx, this.door2, this.progress.archerC, true);
    }

    this.renderTowers(ctx);
    for (const p of this.pillars) if (p.area === this.area) this.drawPillar(ctx, p);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (const f of this.floors) if (f.area === this.area && this.inView(f.x1, f.x2)) this.platformArt.draw(ctx, f.x1, f.x2, FLOOR_Y);
    ctx.restore();
    this.renderSeamColumns(ctx);

    if (this.area === 'out') {
      for (const d of this.decoys) if (d.back) this.drawDecoy(ctx, d);
      if (this.onWayBack && this.progress.slabsRaised) for (const q of this.slabFallers) this.drawFaller(ctx, q);
      else for (const s of this.slabs) this.drawSlab(ctx, s);
      for (const f of this.fallers) this.drawFaller(ctx, f);
      this.renderKey(ctx);
      this.renderHourglass(ctx);
      this.renderRubble(ctx);
      for (const id of ['A', 'B', 'A2']) this.renderArcher(ctx, this.archers[id]);
      for (const m of this.returnMembers) if (m.kind === 'archer') this.renderArcher(ctx, m.who);
      for (const b of this.balls) if (b.state === 'idle' || b.state === 'forming' || b.state === 'rewinding') this.drawBall(ctx, b);
      for (const d of this.decoys) if (!d.back) this.drawDecoy(ctx, d);
      for (const b of this.balls) if (b.state !== 'idle' && b.state !== 'forming' && b.state !== 'rewinding') this.drawBall(ctx, b);
      this.renderDoorKey(ctx);
      for (const b of this.betals) if (b.area === 'out') b.render(ctx, this.enemySprites);
    } else {
      this.renderShrine(ctx);
      for (const id of ['C', 'H1', 'H2']) this.renderArcher(ctx, this.archers[id]);
      for (const b of this.betals) if (b.horde) b.render(ctx, this.enemySprites);
    }
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

  /** Drawn after Rakti (engine calls it), so the quicksand covers whatever has sunk into it. */
  renderForeground(ctx) {
    this.renderPits(ctx);
    this.renderParticles(ctx);
    // the quickened desert: a hot amber haze; the rewind: a cold sepia wash with the sands flowing backward
    const v = this.view;
    if (!v) return;
    if (this.hasteWind > 0.01 && this.area === 'out') {
      ctx.save();
      ctx.fillStyle = `rgba(220, 120, 40, ${0.08 * this.hasteWind})`;
      ctx.fillRect(v.x1, -40, v.x2 - v.x1, SCREEN_H + 120);
      ctx.restore();
    }
    if (this.rewind) {
      const t = this.rewind.t, k = Math.min(1, t / 0.3) * Math.min(1, Math.max(0, (REWIND.end - t) / 0.4));
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = `rgba(150, 120, 80, ${0.75 * k})`;
      ctx.fillRect(v.x1, -40, v.x2 - v.x1, SCREEN_H + 120);
      ctx.globalCompositeOperation = 'source-over';
      // streaks of sand flowing right-to-left, backward in time
      ctx.strokeStyle = `rgba(255, 225, 160, ${0.35 * k})`;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 26; i++) {
        const y = 10 + ((i * 37) % (FLOOR_Y - 10)), x = v.x2 - ((t * 420 + i * 97) % (v.x2 - v.x1 + 120));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40, y + 4); ctx.stroke();
      }
      ctx.restore();
    }
  }

  /** The shards of tower 1's boulder, left on its roof once the first archer is crushed (until the rewind). */
  renderRubble(ctx) {
    const p = this.progress;
    if (!p.archerA || p.rewound) return;
    const t = this.towers[0];
    if (!this.inView(t.cx - 60, t.cx + 60)) return;
    const k = BALL.scale * 0.42, w = BALL.frameW * k, h = BALL.frameH * k;
    const c = this.cachedArt('rubble', w, h, ready(this.ballSheet), (g) => g.drawImage(this.ballSheet, 0, 0, BALL.frameW, BALL.frameH, 0, 0, w, h));
    if (!c) return;
    const r = this.rewind, gather = r ? Math.min(1, r.t / REWIND.gather) : 0;
    if (r && r.t >= REWIND.gather) return;
    const pieces = [[-34, 0, 0.9, 0.3], [-18, 2, 0.7, -0.6], [-2, 1, 1.0, 1.2], [16, 2, 0.75, 2.1], [32, 0, 0.85, -1.4], [8, -6, 0.6, 0.4]];
    for (const [dx, dy, s, rot] of pieces) {
      // during the rewind each shard rises to where the sphere re-forms
      const e = gather * gather;
      const x = t.cx + dx * (1 - e), y = TOWER_ROOF_Y + 2 + dy - (h * s) / 2 + (-22 - dy) * e;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot + gather * 6);
      ctx.drawImage(c, (-w * s) / 2, (-h * s) / 2, w * s, h * s);
      ctx.restore();
    }
  }

  /** The Sands of Time float over tower 2's roof once its archer has fallen, then fly to Rakti. */
  renderHourglass(ctx) {
    const H = this.hourglass;
    if (H.shown <= 0 || (H.taken && H.fly >= 1) || !ready(this.hourglassImg)) return;
    const h = HOURGLASS.draw, w = h * (HOURGLASS.w / HOURGLASS.h);
    let x = H.x, y = H.y + Math.sin(this.animTime * 2.2) * 3, alpha = H.shown, size = 1;
    if (H.taken && this.player) {
      const t = H.fly, e = t * t * (3 - 2 * t);
      x = H.fromX + (this.player.x - H.fromX) * e;
      y = H.fromY + (this.player.y - 40 - H.fromY) * e - Math.sin(t * Math.PI) * 26;
      alpha = 1 - Math.max(0, (t - 0.7) / 0.3);
      size = 1 - 0.4 * t;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 2, x, y, 40);
    g.addColorStop(0, `rgba(255, 210, 120, ${0.6 * alpha})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 42, y - 42, 84, 84);
    ctx.restore();
    const c = this.cachedArt('hourglass', w, h, true, (gg) => gg.drawImage(this.hourglassImg, 0, 0, w, h));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(this.animTime * 1.3) * 0.08);
    ctx.drawImage(c, (-w * size) / 2, (-h * size) / 2, w * size, h * size);
    ctx.restore();
    if (!H.taken) this.drawMarker(ctx, x, y - h / 2 - 10);
  }

  /** Arrows break on anything solid: floors, pillars, the tower bodies and the quicksand. */
  isSolidPoint(x, y) {
    if (y >= SAND_Y) return true;
    if (y >= FLOOR_Y + 2) {
      for (const f of this.floors) if (f.area === this.area && x >= f.x1 && x <= f.x2) return true;
    }
    for (const p of this.pillars) {
      if (p.area === this.area && y > p.top + 2 && Math.abs(x - p.cx) < p.half) return true;
    }
    return false;
  }

  /** Quicksand pits: the sand strip tiled across each pit, drifting slowly, with a dimple where Rakti sinks. */
  renderPits(ctx) {
    const room = this.area === 'room', im = this.quicksandImg;
    const k = QS.scale, tw = QS.w * k, th = QS.h * k;
    const top = SAND_Y - QS.surface * k;
    const strip = this.cachedArt(`qs:${room}`, tw, th, ready(im), (g) => {
      g.drawImage(im, 0, 0, tw, th);
      if (room) {   // the hall's pit lies in shade
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(70, 30, 10, 0.35)';
        g.fillRect(0, 0, tw, th);
      }
    });
    if (!strip) return;
    const drift = (this.animTime * 7) % tw;
    for (const pit of this.pits) {
      if (pit.area !== this.area || !this.inView(pit.x1, pit.x2)) continue;
      const x1 = pit.x1 - 2, x2 = pit.x2 + 2;
      if (pit.sand === false) { this.drawChasm(ctx, x1, x2); continue; }
      ctx.save();
      ctx.beginPath();
      ctx.rect(x1, top - 12, x2 - x1, SCREEN_H - top + 60);
      ctx.clip();
      for (let x = x1 - drift; x < x2; x += tw - 1) ctx.drawImage(strip, x, top, tw, th);
      // below the strip: deep sand
      ctx.fillStyle = room ? '#4a2410' : '#6a3414';
      ctx.fillRect(x1, top + th - 2, x2 - x1, SCREEN_H + 60);
      // shaded walls where the floor slabs end
      const side = ctx.createLinearGradient(x1, 0, x2, 0);
      const e = Math.min(0.45, 26 / (x2 - x1));
      side.addColorStop(0, 'rgba(50, 20, 6, 0.55)');
      side.addColorStop(e, 'rgba(50, 20, 6, 0)');
      side.addColorStop(1 - e, 'rgba(50, 20, 6, 0)');
      side.addColorStop(1, 'rgba(50, 20, 6, 0.55)');
      ctx.fillStyle = side;
      ctx.fillRect(x1, top, x2 - x1, SCREEN_H + 60);
      // a sinking dimple and churn around Rakti
      if (this.qsWasIn && this.player && this.player.x >= pit.x1 && this.player.x <= pit.x2) {
        const px = this.player.x, d = Math.min(1, this.qsDepth / QS_MAX);
        const g = ctx.createRadialGradient(px, SAND_Y + 2, 2, px, SAND_Y + 2, 26 + 10 * d);
        g.addColorStop(0, `rgba(70, 30, 8, ${0.25 + 0.3 * d})`);
        g.addColorStop(1, 'rgba(70, 30, 8, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - 40, SAND_Y - 8, 80, 22);
        ctx.strokeStyle = 'rgba(255, 220, 150, 0.45)';
        ctx.lineWidth = 1;
        const r = 12 + ((this.animTime * 18) % 16);
        ctx.beginPath();
        ctx.ellipse(px, SAND_Y + 2, r, r * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /** A bare chasm (no quicksand): the floor ends and the dark falls away below it. */
  drawChasm(ctx, x1, x2) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x1, FLOOR_Y, x2 - x1, SCREEN_H + 60 - FLOOR_Y);
    ctx.clip();
    const fall = ctx.createLinearGradient(0, FLOOR_Y, 0, SCREEN_H + 20);
    fall.addColorStop(0, 'rgba(60, 26, 8, 0.15)');
    fall.addColorStop(0.35, 'rgba(34, 14, 4, 0.8)');
    fall.addColorStop(1, 'rgba(14, 6, 2, 1)');
    ctx.fillStyle = fall;
    ctx.fillRect(x1, FLOOR_Y, x2 - x1, SCREEN_H + 60 - FLOOR_Y);
    const side = ctx.createLinearGradient(x1, 0, x2, 0);
    const e = Math.min(0.45, 26 / (x2 - x1));
    side.addColorStop(0, 'rgba(50, 20, 6, 0.55)');
    side.addColorStop(e, 'rgba(50, 20, 6, 0)');
    side.addColorStop(1 - e, 'rgba(50, 20, 6, 0)');
    side.addColorStop(1, 'rgba(50, 20, 6, 0.55)');
    ctx.fillStyle = side;
    ctx.fillRect(x1, FLOOR_Y, x2 - x1, SCREEN_H + 60 - FLOOR_Y);
    ctx.restore();
  }

  /** The rift in the start screen: a slow pulse, flaring while Rakti steps out of it. */
  renderPortalGlow(ctx) {
    const P = this.portal;
    if (!this.inView(P.x - 120, P.x + 120)) return;
    const boost = this.intro ? Math.max(0, 1 - Math.abs(this.intro.t - 0.7) / 0.7) : 0;
    const a = 0.14 + Math.sin(this.animTime * 1.8) * 0.05 + boost * 0.55;
    const halfH = (P.y - P.top) + 10;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(P.x, P.y);
    ctx.scale(0.42, 1);                       // the arch is tall and narrow
    const g = ctx.createRadialGradient(0, 0, 6, 0, 0, halfH + boost * 30);
    g.addColorStop(0, `rgba(150, 250, 255, ${a})`);
    g.addColorStop(0.55, `rgba(60, 170, 255, ${a * 0.4})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-halfH - 40, -halfH - 40, (halfH + 40) * 2, (halfH + 40) * 2);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const k = (this.animTime * 0.3 + i / 14) % 1;
      const ang = i * 2.39 + this.animTime * 0.7;
      const r = (1 - k);
      ctx.fillStyle = `rgba(200, 255, 255, ${0.6 * Math.sin(k * Math.PI)})`;
      ctx.fillRect(P.x + Math.cos(ang) * r * 30 - 1, P.y + Math.sin(ang) * r * halfH * 0.9 - 1, 2, 2);
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
      const sun = t.id === 'T1', im = sun ? this.tower1Img : this.towerImg, imL = sun ? this.tower1LadderImg : this.towerLadderImg;
      const plain = this.cachedArt(sun ? 'tower1' : 'tower', w, h, ready(im), (g) => g.drawImage(im, 0, 0, w, h));
      const ladderAlpha = t.id === 'T2' ? this.ladderShown : t.id === 'T1' ? this.ladderShown1 : 0;
      if (plain && ladderAlpha < 1) ctx.drawImage(plain, x, y, w, h);
      if (ladderAlpha > 0) {
        const lad = this.cachedArt(sun ? 'tower1_ladder' : 'tower_ladder', w, h, ready(imL), (g) => g.drawImage(imL, 0, 0, w, h));
        if (lad) {
          ctx.save();
          ctx.globalAlpha = ladderAlpha;
          ctx.drawImage(lad, x, y, w, h);
          ctx.restore();
        }
      }
      if (t.id === 'T1') this.drawSunMark(ctx);
    }
  }

  /** Tall carved columns (the long pillar art) standing over background seams, floor to above the view. */
  renderSeamColumns(ctx) {
    const art = PILLAR_ART.long, im = this.pillarImgs.long;
    const h = FLOOR_Y + 4 + 10, w = h * (art.w / art.h);
    const c = this.cachedArt('seamColumn', w, h, ready(im), (g) => g.drawImage(im, 0, 0, w, h));
    if (!c) return;
    for (const col of this.seamColumns) {
      if (col.area !== this.area) continue;
      // the stepped base must sit wholly on a floor slab: slide it onto the nearest one, or leave it out
      if (col.x === undefined) {
        const half = w / 2 + 14;   // clear of the slab's bevelled end
        const f = this.floors.find((q) => q.area === col.area && q.x1 - 60 <= col.cx && q.x2 + 60 >= col.cx && q.x2 - q.x1 >= half * 2);
        col.x = f ? Math.max(f.x1 + half, Math.min(f.x2 - half, col.cx)) : null;
        if (col.x !== null && Math.abs(col.x - col.cx) > 75) col.x = null;
      }
      if (col.x !== null && this.inView(col.x - w / 2, col.x + w / 2)) ctx.drawImage(c, col.x - w / 2, FLOOR_Y + 4 - h, w, h);
    }
  }

  /** A loose boulder that is only scenery (same rock art as the [Q] stones). */
  drawDecoy(ctx, d) {
    const art = d.sheet === 'ball' ? BALL : SLAB, sheet = d.sheet === 'ball' ? this.ballSheet : this.slabSheet;
    const w = art.frameW * d.s, h = art.frameH * d.s;
    if (this.rockFade <= 0 || !this.inView(d.x - w, d.x + w)) return;
    const c = this.cachedArt(`decoy:${d.sheet}:${d.s}`, w, h, ready(sheet),
      (g) => g.drawImage(sheet, 0, 0, art.frameW, art.frameH, 0, 0, w, h));
    if (!c) return;
    // rock frame 0 sits with its lowest pixel on the floor
    const bottom = d.sheet === 'ball' ? BALL.bottom : 232;
    ctx.save();
    ctx.globalAlpha = this.rockFade;
    ctx.translate(d.x, FLOOR_Y + 3 - bottom * d.s);
    if (d.flip) ctx.scale(-1, 1);
    ctx.drawImage(c, -art.anchorX * d.s, 0, w, h);
    ctx.restore();
    if (d.dim) {
      // further back: a touch of shadow in the rock's own shape
      const sh = this.cachedArt(`decoyShade:${d.sheet}:${d.s}`, w, h, ready(sheet), (g) => {
        g.drawImage(sheet, 0, 0, art.frameW, art.frameH, 0, 0, w, h);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#2a1206';
        g.fillRect(0, 0, w, h);
      });
      ctx.save();
      ctx.globalAlpha = d.dim * this.rockFade;
      ctx.translate(d.x, FLOOR_Y + 3 - bottom * d.s);
      if (d.flip) ctx.scale(-1, 1);
      ctx.drawImage(sh, -art.anchorX * d.s, 0, w, h);
      ctx.restore();
    }
  }

  /** The whole pillar, stepped base included; in a pit the sand drawn after it buries the base. */
  drawPillar(ctx, p) {
    if (p.pier) {
      // a carved mudbrick pier (the floor's own end caps over its frieze, repeated downward)
      const k = 0.48, w = 150 * k, h = 492 * k;
      if (!this.inView(p.cx - w / 2, p.cx + w / 2)) return;
      const c = this.cachedArt('pier', w, h, ready(this.pierImg), (g) => g.drawImage(this.pierImg, 0, 0, w, h));
      if (c) ctx.drawImage(c, p.cx - w / 2, p.top - 20 * k, w, h);
      return;
    }
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
    // Before [Q] the rocks rest on top of the quicksand (just their bottom edge pressed into its surface);
    // [Q] lifts them out while they break open into slabs.
    const rest = SAND_Y + SLAB_REST_SINK - (s.top + (SLAB_ROCK_BOTTOM - SLAB.anchorY) * k);
    if (s.state === 'raw') {
      bob = rest + Math.sin(this.animTime * 1.3 + s.phase) * 1.2;
      glow = this.progress.qUnlocked ? 0.35 + 0.35 * Math.sin(this.animTime * 3 + s.phase) : 0;
    } else if (s.state === 'forming') {
      frame = Math.min(5, Math.floor(Math.max(0, s.t) / 0.1));
      const u = Math.min(1, Math.max(0, s.t) / 0.6), e = 1 - (1 - u) * (1 - u) * (1 - u);
      bob = rest * (1 - e);
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
    if (b.state === 'gone' || (b.state === 'idle' && this.rockFade <= 0)) return;
    const k = BALL.scale, w = BALL.frameW * k, h = BALL.frameH * k;
    if (!this.inView(b.x - w, b.x + w)) return;
    let frame = 0, glow = 0;
    if (b.state === 'idle') {
      // a plain rough boulder (frame 0) until [Q]; before Kali teaches [Q] it has no glow at all.
      // (It used to fall through to the finished-sphere frame while [Q] was still locked.)
      if (this.progress.qUnlocked && this.player) {
        // only up close do its cracks give it away among the other boulders
        const near = 1 - Math.min(1, Math.max(0, (Math.abs(this.player.x - b.x) - 120) / 160));
        glow = near * (0.25 + 0.3 * Math.sin(this.animTime * 3));
      }
    }
    else if (b.state === 'forming') frame = Math.min(5, Math.floor(b.t / 0.1));
    else if (b.state === 'rewinding') frame = this.rewindFrame();
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
    ctx.globalAlpha = b.state === 'idle' ? this.rockFade : 1;
    if (b.state === 'falling') ctx.globalAlpha = Math.max(0, 1 - Math.max(0, b.t - 0.9) / 0.5);
    if (b.state === 'rewinding' && this.rewind) ctx.globalAlpha = Math.min(1, this.rewind.t / REWIND.gather);
    ctx.drawImage(c, -BALL.anchorX * k, -BALL.anchorY * k, w, h);
    if (glow > 0) {
      const c1 = cache(1);
      if (c1) { ctx.globalAlpha = glow; ctx.drawImage(c1, -BALL.anchorX * k, -BALL.anchorY * k, w, h); }
    }
    ctx.restore();
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
    a.render(ctx, a.walking ? this.archerWalkSprites : this.archerSprites);
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
