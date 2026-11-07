/**
 * ==========================================================================
 * LEVEL 1: DROWNED DWARAKA (js/levels/level1.js)
 * Six screens, left to right (each background is 1926x817, drawn at 368/655):
 *   0. Rift portal   - Rakti wakes up in her sari, hears a voice (prologue)
 *   1. Kali sanctum  - the idol (separate sprite) near the start: conversation, armour, then Kali's
 *                      first test: one Betal steps out of the dark and must be slain before she can go on
 *   2. Ruins         - two-pillar pit (spike on a pillar), a ripple of single spikes, a Betal
 *   3. Sun wall      - checkpoint, alternating spike gauntlet, Betal, pit with alternating pillar spikes
 *   4. Ruins (mirrored) - checkpoint, rolling spike wave, three-pillar pit whose middle pillar SPINS
 *   5. Shrine        - checkpoint, Kali grants her form [X] near the lever tower. No floor between the
 *                      three towers: leap up to the lever tower as Kali, defeat its Betal, pull the
 *                      lever -> Kali's hibiscus bridges bloom tower -> stone pier -> tower (walkable only as Kali),
 *                      geysers from the deep burst through them -> relic tower (Betal) -> relic -> door
 * (The old single-screen temple level is archived in unused_assets/old_code/js/level.js.)
 * ==========================================================================
 */

import { PlatformArt } from '../render/platformArt.js';
import { Betal } from '../entities/betal.js';
import { EnemySpriteSheet } from '../entities/enemySprites.js';
import { drawShrineBeacon } from '../render/shrineBeacon.js';
import { Sfx } from '../core/audio.js';

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
const BRIDGE_SUMMON_TIME = 1.9;  // the flower bridges take this long to bloom across
const TOWER_GAP = 520;          // open water between arm tips: a stone pier stands in the middle of each gap,
                                // so every hibiscus span (~225 px) is longer than a mortal jump
const PIER_SCALE = 0.27;        // the piers use the tall pillar art; tall enough that their base sinks into the dark

// Kali's idol (assets/level1/kali_idol.png, 560x840 from the 1024x1536 original): pillared shrine whose
// plinth stands on the floor. footRow = the plinth's bottom row, faceRow = her eyes.
const IDOL_ART = { src: 'assets/level1/kali_idol.png', w: 560, h: 840, footRow: 826, faceRow: 180, worldH: 338 };

// Single spikes: assets/level1/spikes/single_spike_sheet.png is one spike cut from each frame of the old
// 4-spike trap sheet: 16 frames of 68x140, base on row 130. 0-1 hidden, 2-3 tips peek, 4-7 rising, 8-11 up,
// 12-15 retracting. Each spike runs its own fast cycle; rows of them are phased into ripples or alternation.
const SPIKE_ART = { frameW: 68, frameH: 140, surface: 130 };
const SPIKE_TIP_ROW = [140, 140, 125, 116, 103, 82, 51, 25, 7, 9, 7, 9, 38, 69, 96, 121];   // top row per frame
const SPIKE_SCALE = 0.62;       // one spike ~32 world px wide, ~76 tall when up
const SPIKE_HALF = 17;          // harmful half-width
const SPIKE_CYCLE = 3.4;        // default seconds per cycle (warn/rise/up/retract always take 1.77 s)
const SPIKE_DAMAGE = 3;
const PIT_DAMAGE = 3;

// Kali's hibiscus road (assets/level1/hibiscus/, cut from the hibiscus sheet): the deck is a chain of leaf pads
// carpeted with blooms; side-view flowers hang from the gold swag under it; petals drift off it.
const HIB = 'assets/level1/hibiscus/';
const PAD_ART = { s: { w: 277, h: 101 }, m: { w: 311, h: 115 }, l: { w: 493, h: 117 } };
const PAD_K = 0.21;          // pad image px -> world px (a large pad ~104 px long, ~25 px thick)
const PAD_OVERLAP = 12;      // neighbouring pads overlap by this many world px
const PAD_SURFACE = 0.42;    // the leaf's top surface sits this far down the pad image
const PETAL_ART = { c: { w: 113, h: 57 }, d: { w: 79, h: 39 } };

// Jet art (assets/level1/jet/, cut from the jet sheet): four strips of 4 frames each, all 112 px wide except the splash.
//  head:   the falling tip (its point at the bottom), drawn at the jet's leading end while it drives down
//  column: the pouring water, tiles top to bottom (scrolled downward so it reads as falling)
//  splash: where it hits the deck (its ground line `splashBase` px down the frame)
//  tail:   the water breaking up; drawn flipped above the jet's upper end as it falls away, thinning frame by frame
// `body` is the width of the solid water in a frame; `scale` sizes it to the jet's hit width (GEYSER.half).
const JET_ART = { dir: 'assets/level1/jet/', fw: 112, headH: 120, headTip: 118, colH: 128, splashW: 172, splashH: 69,
  splashBase: 66, tailH: 104, body: 74, scale: 0.52, frameTime: 0.08 };

// Water jets that replace the old bridge orbs: the sea above pours a jet straight down onto each hibiscus span.
// A thin shimmer from above and a ring on the deck warn first; the jet then drives down from the top of the
// screen onto the deck, holds, and its tail follows it down. It fills the whole height: wait for it to pass.
const GEYSER = { cycle: 3.4, warn: 0.85, burst: 0.95, half: 17, damage: 3, top: -14 };

// ---------------------------------------------------------------- prologue conversation
// s: speaker ('kali' | 'rakti' | 'voice'), t: text, g: gesture (0-7, row 3 of the portrait sheet)
// Kali gestures: 0 open palm, 1 finger up, 2 hand on chest, 3 palm out, 4 raised hand, 5 chin, 6 offering, 7 namaste
// Rakti gestures: 0 palm, 1 finger up, 2 hand on chest, 3 frown, 4 chin, 5 palm, 7 namaste
const VOICE = '⚜ A VOICE FROM THE DARK ⚜';
const PROLOGUE_WAKE = [
  { s: 'rakti', p: 2, g: 3, t: 'Where... where am I? This isn\'t home. The last thing I remember is the sky over the sea tearing open.' },
  { s: 'rakti', p: 1, t: 'Pitaji? Pitaji, can you hear me?!' },
  { s: 'voice', title: VOICE, t: 'Rakti...' },
  { s: 'rakti', p: 3, g: 2, t: 'Who\'s there? Who said my name?' },
  { s: 'voice', title: VOICE, t: 'Do not be afraid, child. Come to me. Follow the light, deeper into the temple.' },
  { s: 'rakti', p: 5, g: 4, t: 'That voice... it\'s coming from further in. I have to see.' }
];
const PROLOGUE_IDOL = [
  { s: 'kali', p: 6, g: 4, t: 'You came, Rakti. Good. You have your father\'s courage.' },
  { s: 'rakti', p: 1, g: 2, t: 'Maa Kali...? You know my father? Where is he? What is this place?' },
  { s: 'kali', p: 1, g: 0, t: 'This is Dwaraka, the city the sea swallowed long before your time. The rift that split the sky above your home pulled you down into its ruins.' },
  { s: 'rakti', p: 2, g: 3, t: 'And Pitaji?' },
  { s: 'kali', p: 7, g: 3, t: 'He came through before you. He went after the four relics, the only things that can seal the rift. His trail runs through these ruins and the lands beyond.' },
  { s: 'rakti', p: 3, g: 4, t: 'Then I\'ll follow it. Whatever it takes, I\'m bringing him home.' },
  { s: 'kali', p: 3, g: 1, t: 'Betal and Asura walk these halls now. In a sari, with bare hands, you would not last a breath.' },
  { s: 'kali', p: 6, g: 6, t: 'So take what I give you: armour, a blade, and a little of my strength. Hold still.' },
  { s: 'rakti', p: 0, g: 7, t: 'I\'m ready, Maa.' }
];
const PROLOGUE_AFTER = [
  { s: 'rakti', p: 1, g: 2, t: 'This armour... it moves with me, as if it was always mine. And this blade is so light.' },
  { s: 'kali', p: 7, g: 1, t: 'A blade is only as good as the hand that holds it. Now comes your first test, Rakti.' },
  { s: 'kali', p: 3, g: 3, t: 'Something in the dark has smelled a mortal. A Betal. Do not run from it. Face it, and strike when it raises its blade.' },
  { s: 'rakti', p: 11, g: 3, t: 'Then let it come.' }
];
const TEST_DONE = [
  { s: 'rakti', p: 1, g: 2, t: 'I... I did it. It\'s gone.' },
  { s: 'kali', p: 5, g: 4, t: 'Well struck. That was your first test, and you met it. There will be many more.' },
  { s: 'kali', p: 6, g: 0, t: 'The first relic, the Pearl of the Tide, waits past the towers to the east. The ruins between are full of traps. Watch the floor, Rakti. I am with you.' }
];

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
      sanctum: img('assets/level1/sanctum_clean.jpg'),   // the idol is a separate sprite on it (prologue_idol.jpg kept as backup)
      ruins: img('assets/level1/filler_ruins.jpg'),
      suns: img('assets/level1/sanctum_suns.jpg'),       // the sun wall (screen 3)
      towers: img('assets/level1/towers_bg.jpg')      // open water behind the shrine towers (screens 5+)
    };
    this.idolImg = img(IDOL_ART.src);
    this.hib = Object.fromEntries(['pad_s', 'pad_m', 'pad_l', 'hib_front', 'hib_side_a', 'hib_side_b', 'leaf_b', 'leaf_c', 'petal_c', 'petal_d']
      .map((n) => [n, img(HIB + n + '.png')]));
    this.jetImgs = Object.fromEntries(['head', 'column', 'splash', 'tail'].map((k) => [k, img(`${JET_ART.dir}jet_${k}.png`)]));
    this.towerImgs = Object.fromEntries(Object.entries(TOWER_ART).map(([k, v]) => [k, img(v.src)]));

    this.platformArt = new PlatformArt('temple');
    this.pillarImgs = Object.fromEntries(Object.entries(PILLAR_ART).map(([k, v]) => [k, img(v.src)]));
    this.spikeSheet = img('assets/level1/spikes/single_spike_sheet.png');
    this.relicImg = img('assets/level1/relic.png');
    this.columnImg = img('assets/level1/column.png');   // 300x1324, stands over every screen seam
    this.seamColumns = [1, 2, 3, 4, 5].map((n) => X(n) + FEATHER / 2);
    this.enemySprites = new EnemySpriteSheet();
    this.shrineImg = img('assets/level1/shrine.png');

    // ------------------------------------------------------------------ prologue (screens 0-1)
    // The idol stands near the start of the sanctum screen; its face glows while Kali speaks.
    const idolScale = IDOL_ART.worldH / IDOL_ART.h;
    this.prologue = {
      wakeX: X(0, 430),
      idolX: X(1, 520),
      idolScale,
      idolFaceY: FLOOR_Y + 2 - (IDOL_ART.footRow - IDOL_ART.faceRow) * idolScale,
      idolRange: 95
    };
    this.idolBlessed = false;
    this.idolGlow = 0;
    this.screenFade = 0;
    // Kali's first test: a Betal in the sanctum, after the outfit change. Passing it is kept across deaths.
    this.testArenaMaxX = X(1) + 900;
    this.testDone = false;

    // ------------------------------------------------------------------ floor & pits
    this.floors = [
      { x1: 0, x2: X(2) + 190 },
      { x1: X(2) + 560, x2: X(3) + 640 },
      { x1: X(3) + 930, x2: X(4) + 540 },
      { x1: X(4) + 960, x2: X(5) + 300 }    // ends at the lever tower; beyond it only the towers rise from the deep
    ];
    this.pits = [
      { x1: X(2) + 190, x2: X(2) + 560 },
      { x1: X(3) + 640, x2: X(3) + 930 },
      { x1: X(4) + 540, x2: X(4) + 960 },
      { x1: X(5) + 300, x2: X(8) }           // the abyss under the towers
    ];

    // Pillars: `top` is where feet stand. Pit pillars use the tall art and sink into the abyss.
    // `swing`: the pillar rises and sinks around `base` (like the moving piers of Levels 2 and 3) and carries Rakti.
    this.pillars = [
      { art: 'tall', cx: X(2) + 275, top: 335, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(2) + 455, top: 305, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(3) + 725, top: 320, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(3) + 845, top: 298, scale: PIT_PILLAR_SCALE },
      // the last pit: two moving pillars, out of step with each other
      { art: 'tall', cx: X(4) + 680, top: 322, base: 322, swing: 30, period: 3.0, phase: 0, scale: PIT_PILLAR_SCALE },
      { art: 'tall', cx: X(4) + 830, top: 306, base: 306, swing: 28, period: 3.0, phase: Math.PI, scale: PIT_PILLAR_SCALE }
    ];

    // Single floor spikes. `x` = centre; `cycle` in seconds; `phase` offsets it so rows ripple or alternate
    // instead of moving together. (Pillar-cap spikes were tried and removed.)
    const row = (x0, n, step, cycle, phaseOf) => Array.from({ length: n }, (_, i) => ({ x: x0 + i * step, cycle, phase: phaseOf(i) }));
    this.spikes = [
      // screen 2: a ripple of three after the first pit (each rises a beat after the one before it)
      ...row(X(2) + 650, 3, 52, 3.2, (i) => -i * 0.4),
      // screen 3: the gauntlet alternates: odd spikes are up while even ones are down; hop from gap to gap
      ...row(X(3) + 150, 6, 60, 3.6, (i) => (i % 2) * 1.8),
      // screen 4: a rolling wave that runs toward Rakti (right to left)
      ...row(X(4) + 130, 5, 58, 3.4, (i) => i * 0.42)
    ];

    // Shrine room (screen 5): lever tower -> bridge -> pier -> bridge -> relic tower -> bridge -> pier -> bridge -> door tower.
    // All three arms are ~129 px above the floor, so only Kali's leap reaches the first one.
    this.ledgeY = 239;
    const s = TOWER_SCALE, A = TOWER_ART.shrine, D = TOWER_ART.doorClosed;
    const armHalf = (art) => ({ l: (art.cx - art.armL) * s, r: (art.armR - art.cx) * s });
    const cx1 = X(5) + 380;            // its left arm overhangs the floor's end, so Kali can leap straight up onto it
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
    // Stone piers in the middle of each gap: solid for everyone, so Rakti can rest on them, let Kali's
    // form go and take it again. Their caps sit at deck height.
    const pierHalf = PILLAR_ART.tall.w * PIER_SCALE * 0.4;
    this.piers = [0, 1].map((i) => {
      const cx = (this.ledges[i].x2 + this.ledges[i + 1].x1) / 2;
      return { art: 'tall', cx, top: this.ledgeY, scale: PIER_SCALE, x1: cx - pierHalf, x2: cx + pierHalf };
    });
    this.doorSillY = this.ledgeY;
    this.door = { x1: cx3 + (D.doorL - D.cx) * s, x2: cx3 + (D.doorR - D.cx) * s, cx: cx3,
      midY: this.towerY(D, (D.doorTop + D.doorSill) / 2) };
    this.width = Math.round(cx3 + armHalf(D).r + 150);

    // the lever stands in the lever tower's niche, at Rakti's chest height
    this.lever = { x: cx1, y: this.towerY(A, A.nicheSill), activated: false, pullTime: 0 };
    this.leverMessage = "The lever locks into place, and my flowers answer it. Red hibiscus strung on gold now spans the water from tower to pier to tower. That bridge is woven from my power, Rakti, and it holds only for my form [X]. Rest on the stone piers when you must, and beware the deep: it breathes up through the flowers.";
    this.leverImgs = [0, 1, 2].map((i) => img(`assets/level1/lever_${i}.png`));   // idle, moving, pulled

    // Kali's flower bridges: four spans (tower -> pier -> tower -> pier -> tower). The lever calls them, and red
    // hibiscus blooms (her sacred flower) strung on a gold thread fly in from both ends and meet in the middle.
    // Solid only in Kali form; a mortal Rakti sees just their ghost. (The old golden_bridge_a/b.png art stays as a backup.)
    this.bridges = [
      { x1: this.ledges[0].x2 - 4, x2: this.piers[0].x1 + 3, y: this.ledgeY },
      { x1: this.piers[0].x2 - 3, x2: this.ledges[1].x1 + 4, y: this.ledgeY },
      { x1: this.ledges[1].x2 - 4, x2: this.piers[1].x1 + 3, y: this.ledgeY },
      { x1: this.piers[1].x2 - 3, x2: this.ledges[2].x1 + 4, y: this.ledgeY }
    ];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const b of this.bridges) {
      // fill the span with leaf pads (large ones while there is room), then stretch them a touch to fit exactly
      const span = b.x2 - b.x1, kinds = [];
      let total = -PAD_OVERLAP;
      while (total < span) {
        const left = span - total, k = left > 130 ? 'l' : (left > 66 ? 'm' : 's');
        kinds.push(k);
        total += PAD_ART[k].w * PAD_K - PAD_OVERLAP;
      }
      if (kinds.length > 2) kinds.push(kinds.shift());   // a large pad in the middle rather than at the end
      const fit = (span + PAD_OVERLAP * 2) / (total + PAD_OVERLAP * 2);
      let cur = b.x1 - PAD_OVERLAP * 0.5;
      b.blooms = kinds.map((k) => {
        const w = PAD_ART[k].w * PAD_K * fit, h = PAD_ART[k].h * PAD_K;
        const x = cur + w / 2;
        cur += w - PAD_OVERLAP * fit;
        const u = (x - b.x1) / span;
        return { kind: k, x, y: b.y, w, h, u, d: Math.min(Math.max(u, 0), Math.max(1 - u, 0)) * 2, flip: rnd() < 0.5,
          tilt: (rnd() - 0.5) * 0.04, rot: rnd() * Math.PI * 2, landed: false };
      });
      b.met = false;
    }
    this.petals = [];
    this.bridgeGrow = 0;
    // The geysers that replaced the old bridge orbs: one in the middle of each span, out of step with each other.
    this.geysers = this.bridges.map((b, i) => ({ x: (b.x1 + b.x2) / 2 + (i % 2 ? 18 : -18), bridge: i, phase: [0, 1.7, 0.85, 2.55][i], burstSeen: false }));
    this.bubbles = [];
    this.lastSafeLedge = null;   // the tower / pier Rakti last stood on once the bridges are out (pit-fall respawn)

    // Art is pre-scaled once to the size it appears on screen (see cachedArt), so each frame is a cheap 1:1 copy
    this.artCache = new Map();
    this.artScale = 0;

    // Kali grants her form [X] when Rakti nears the lever tower (kept across deaths until a New Game)
    this.abilityGrantX = X(5) - 30;
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

    // Checkpoints: pit falls and deaths after the prologue respawn here (before the first: at the idol)
    this.checkpoints = [this.testArenaMaxX + 20, X(3) + 20, X(4) + 20, X(4) + 970];

    // Betal: [0] is Kali's first test in the sanctum (hidden until the test starts), then one per ruin screen
    // and one on each of the first two towers. (spawn x, patrol min x, patrol max x)
    this.betals = [
      new Betal(X(1) + 640, X(1) + 340, this.testArenaMaxX - 20),
      new Betal(X(2) + 900, X(2) + 820, X(2) + 960),
      new Betal(X(3) + 560, X(3) + 500, X(3) + 610),
      new Betal(cx1 + 70, this.ledges[0].x1 + 12, this.ledges[0].x2 - 12, this.ledgeY),   // lever tower
      new Betal(cx2 + 50, this.ledges[1].x1 + 12, this.ledges[1].x2 - 12, this.ledgeY)    // relic tower
    ];
    this.test = { started: false, doneT: 0 };
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
    this.petals = [];
    for (const b of this.bridges) { b.met = false; for (const f of b.blooms) f.landed = false; }
    for (const g of this.geysers) g.burstSeen = false;
    this.bubbles = [];
    this.lastSafeLedge = null;
    this.pendingDialogue = null;
    this.test = { started: false, doneT: 0 };
    this.relic.collected = false;
    this.relic.fly = 0;
    this.doorOpen = 0;
    this.doorOpenDelay = 0;
    this.cameraShake = 0;
    this.killToastTimer = 0;
    this.idolGlow = 0;
    this.screenFade = 0;
    this.scene = { stage: 'wake' };   // prologue: wake -> free -> walk -> talk -> outfit -> done
    this.isCompleted = false;
    this.animTime = 0;      // spike traps restart their cycle
    for (const b of this.betals) b.reset();
    // the first-test Betal stays hidden until Kali calls him (and stays gone once the test is passed)
    this.betals[0].hidden = true;
    if (this.testDone) { this.betals[0].dead = true; this.betals[0].removed = true; }
  }

  /** Arriving from outside (new game, level select): the prologue test and checkpoints start over. */
  /** What Rakti needs to reach next to go on (the engine hums as she nears it): the lever, then the relic. */
  crucialItem() {
    if (!this.lever.activated) return { x: this.lever.x, y: this.ledgeY };
    return this.relic.collected ? null : { x: this.relic.x, y: this.ledgeY };
  }

  freshStart() {
    this.checkpointIndex = -1;
    this.abilityGranted = false;
    this.testDone = false;
  }

  /** Where Rakti appears after a pit fall, death or restart once the prologue is done. */
  getRespawnPoint() {
    // Once the bridges are out, a fall into the abyss puts her back on the tower or pier she last stood on
    if (this.lastSafeLedge) return { x: this.lastSafeLedge.x, y: this.ledgeY };
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
    Sfx.play('item_get');
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
      list.push({ id: 'pillar', x1: p.cx - half, x2: p.cx + half, y: p.swing ? p.top : Math.round(p.top), oneWay: false });
    }
    for (const l of this.ledges) list.push({ ...l, oneWay: true });
    for (const q of this.piers) list.push({ id: 'pier', x1: q.x1, x2: q.x2, y: q.top, oneWay: false });
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

  /** Solid pillar sides, plus an invisible wall past the idol until Kali's blessing and her first test. */
  resolvePitWallCollision(x, y) {
    if (!this.idolBlessed) x = Math.min(x, this.prologue.idolX + 140);
    else if (!this.testDone) x = Math.min(x, this.testArenaMaxX);
    for (const p of [...this.pillars, ...this.piers]) {
      const half = this.pillarHalf(p) + 7;
      if (y > p.top + 5 && Math.abs(x - p.cx) < half) {
        x = x < p.cx ? p.cx - half : p.cx + half;
      }
    }
    return x;
  }

  // ======================================================================== interactions
  getNearbyInteractable(px, py) {
    if (Math.abs(px - this.lever.x) < 40 && Math.abs(py - this.ledgeY) < 12) {
      return {
        type: 'lever', x: this.lever.x, y: this.lever.y, activated: this.lever.activated,
        prompt: this.lever.activated ? '[E] LEVER (ENGAGED)' : '[E] PULL LEVER',
        text: 'The lever is locked in place. Kali\'s flower bridges hold only for her form [X].'
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
        text: "The Pearl of the Tide, Rakti. The first of the four relics. It has waited for your bloodline, and it answers to you alone. Keep it close: the strength of the deep sleeps inside it, and with it even stone will move at your call. The gate is open. Your father's trail goes on beyond it."
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
    this.updatePrologueScene(player);
    this.updateMovingPillars(playerX, playerY, player);

    // Lever pull, then Kali's flower bridges bloom from both towers and meet in the middle. They wait until her
    // words about them are closed, so the player watches them bloom instead of it happening behind the dialogue.
    if (this.lever.activated) {
      this.lever.pullTime += dt;
      if (this.dialogueOpen && this.bridgeGrow <= 0) this.lever.pullTime = Math.min(this.lever.pullTime, 0.2);
      if (this.lever.pullTime > 0.35 && this.bridgeGrow < 1) {
        this.bridgeGrow = Math.min(1, this.bridgeGrow + dt / BRIDGE_SUMMON_TIME);
        this.cameraShake = Math.max(this.cameraShake, 0.08);
        if (this.bridgeGrow >= 1) {
          this.killToastText = '⚜ KALI\'S BRIDGES BLOOM ⚜';
          this.killToastTimer = 2.4;
        }
      }
    }
    this.updateBridgeBlooms(dt, isDivine);

    // Geysers burst up through the spans once the bridges are out
    this.updateGeysers(dt, player);

    // Relic flies into Rakti's hands, then the door opens
    if (this.relic.collected && this.relic.fly < 1) this.relic.fly = Math.min(1, this.relic.fly + dt * 1.4);
    if (this.relic.collected) {
      if (this.doorOpenDelay > 0) {
        this.doorOpenDelay -= dt;
      } else if (this.doorOpen < 1) {
        if (this.doorOpen === 0) Sfx.play('door_open');   // the door unlocks and starts to swing
        this.doorOpen = Math.min(1, this.doorOpen + dt / 1.4);
        this.cameraShake = Math.max(this.cameraShake, 0.2);
        if (this.doorOpen >= 1) {
          Sfx.play('portal_open');   // it is open: the portal starts
          this.killToastText = '⚜ THE PORTAL IS OPEN ⚜';
          this.killToastTimer = 2.8;
        }
      }
    }

    // Betal: the first one is Kali's test and stays out of sight until she calls it
    const blessingDone = this.idolBlessed && player && !player.isCivilian;
    this.updateFirstTest(player, blessingDone, dt);
    for (const b of this.betals) b.update(dt, player, this, blessingDone);

    // Kali grants her form [X] as Rakti nears the lever tower
    if (blessingDone && playerX >= this.abilityGrantX && !this.abilityGranted) {
      this.abilityGranted = true;
      this.pendingDialogue = {
        speaker: 'kali', title: '⚜ MAA KALI: MY FORM ⚜', flash: true,
        text: 'These towers stand beyond a mortal leap, Rakti. Take my form for a few breaths: press [X] to become Kali. You will leap far higher, and my bridge will hold you, but in my form your blade is stilled. Fight as yourself: press [X] again on solid ground to let my form go.'
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

    // Once the bridges are out, remember the last tower or pier she stood on (a fall puts her back there)
    if (this.bridgeGrow >= 1 && player.isGrounded && player.currentPlatform) {
      const cp = player.currentPlatform;
      if (cp.id === 'pier' || String(cp.id).startsWith('tower_')) this.lastSafeLedge = { x: Math.max(cp.x1 + 14, Math.min(cp.x2 - 14, playerX)) };
    }

    // Single floor spikes
    for (const sp of this.spikes) {
      const st = this.spikeState(sp);
      const rising = st.frame >= 4 && st.frame <= 7;
      if (rising && !sp.wasRising) Sfx.at('ground_rise', sp.x, { range: 230, volume: 0.8 });   // it thrusts up out of its vent: heard only up close
      sp.wasRising = rising;
      if (!st.harmful) continue;
      const { x, y } = this.spikeBase(sp);
      if (Math.abs(playerX - x) < SPIKE_HALF && playerY >= y - st.reach && playerY <= y + 6 && player.invulnerableTimer <= 0) {
        // a hit throws her back the way she came (a real shove, not cancelled by running)
        const away = Math.abs(player.vx) > 20 ? -Math.sign(player.vx) : (playerX < x ? -1 : 1);
        player.takeDamage(SPIKE_DAMAGE, away * 270, -300, 0.38);
        this.cameraShake = Math.max(this.cameraShake, 0.4);
      }
    }
  }

  /** Kali's first test: after the conversation a Betal steps out of the dark in the sanctum. Rakti cannot go
   *  on until it falls; then Kali speaks once more. A death during the test brings it straight back. */
  updateFirstTest(player, blessingDone, dt) {
    const b = this.betals[0], t = this.test;
    if (this.testDone || !player) return;
    if (!t.started) {
      // after a death (prologue already played) the Betal returns at once
      if (blessingDone && this.scene.stage === 'wake' && !this.pendingDialogue) this.startFirstTest();
      return;
    }
    if (b.dead) {
      t.doneT += dt;
      if (t.doneT > 0.9 && !this.pendingDialogue) {
        this.testDone = true;
        this.killToastText = '✦ FIRST TEST PASSED ✦';
        this.killToastTimer = 2.2;
        this.pendingDialogue = { lines: TEST_DONE };
      }
    }
  }

  startFirstTest() {
    const b = this.betals[0];
    this.test.started = true;
    b.reset();
    b.hidden = false;
    b.fadeAlpha = 0;
    b.noticeRange = 640;    // it has her scent: it comes straight for her
    b.chaseSpeed = 84;
    b.facing = 'left';
    this.killToastText = '⚔ FIRST TEST: SLAY THE BETAL';
    this.killToastTimer = 2.6;
    this.cameraShake = Math.max(this.cameraShake, 0.3);
  }

  /** The prologue: Rakti wakes up lost, hears Kali's voice, walks to the idol, talks with Kali,
   *  and is changed into her battle outfit. Every step waits for the one before it. */
  updatePrologueScene(player) {
    const sc = this.scene;
    if (!player || this.pendingDialogue) return;
    if (this.idolBlessed && sc.stage !== 'outfit') return;   // already played (respawns, level reloads)
    const standX = this.prologue.idolX - 55;
    if (sc.stage === 'wake') {
      if (player.isWaking) return;
      player.inputLocked = true;
      sc.stage = 'free';
      this.pendingDialogue = { whenLocked: true, lines: PROLOGUE_WAKE, onDone: () => { player.inputLocked = false; } };
    } else if (sc.stage === 'free') {
      if (player.x < standX - 230 || player.inputLocked) return;
      // she walks the last steps to the idol by herself
      player.inputLocked = true;
      player.autoWalkX = standX;
      sc.stage = 'walk';
    } else if (sc.stage === 'walk') {
      if (player.autoWalkX != null) return;
      player.facing = 'right';
      this.idolGlow = Math.max(this.idolGlow, 0.7);
      sc.stage = 'talk';
      this.pendingDialogue = {
        whenLocked: true, lines: PROLOGUE_IDOL,
        onDone: () => {
          this.idolBlessed = true;
          this.idolGlow = 1.8;
          player.inputLocked = false;
          player.startOutfitChange();
          sc.stage = 'outfit';
        }
      };
    } else if (sc.stage === 'outfit') {
      if (player.isCivilian || player.isChangingOutfit) return;
      sc.stage = 'done';
      // Kali announces the first test; the Betal steps out when the conversation ends
      this.pendingDialogue = { lines: PROLOGUE_AFTER, onDone: () => { if (!this.test.started && !this.testDone) this.startFirstTest(); } };
    }
  }

  /** Moving pit pillars rise and sink; standing on one carries Rakti with it. */
  updateMovingPillars(playerX, playerY, player) {
    for (const p of this.pillars) {
      if (!p.swing) continue;
      const prev = p.top;
      p.top = p.base + Math.sin((this.animTime * Math.PI * 2) / p.period + p.phase) * p.swing;
      if (player && player.isGrounded && Math.abs(playerX - p.cx) <= this.pillarHalf(p) + 2 && Math.abs(playerY - prev) < 3) {
        player.y = p.top;
        if (player.currentPlatform && player.currentPlatform.id === 'pillar') player.currentPlatform.y = p.top;
      }
    }
  }

  /** One spike's cycle: hidden (only its vent shows), tips peek 0.45 s, rise 0.28 s, up 0.7 s, retract 0.34 s.
   *  Returns the sheet frame (-1 = hidden), whether it hurts, and how high its tip stands above the base. */
  spikeState(sp) {
    const cycle = sp.cycle || SPIKE_CYCLE, down = cycle - 1.77;
    const t = (((this.animTime + sp.phase) % cycle) + cycle) % cycle;
    let frame;
    if (t < down) frame = -1;
    else if (t < down + 0.45) frame = 2 + (Math.floor((t - down) / 0.15) % 2);
    else if (t < down + 0.73) frame = 4 + Math.min(3, Math.floor((t - down - 0.45) / 0.07));
    else if (t < down + 1.43) frame = 8 + (Math.floor((t - down - 0.73) / 0.1) % 4);
    else frame = 12 + Math.min(3, Math.floor((t - down - 1.43) / 0.085));
    const reach = frame < 0 ? 0 : (SPIKE_ART.surface - SPIKE_TIP_ROW[frame]) * SPIKE_SCALE;
    return { frame, reach, harmful: reach > 16 };
  }

  /** Where a spike stands (all on the floor now). */
  spikeBase(sp) {
    return { x: sp.x, y: FLOOR_Y };
  }

  /** Jet cycle: calm, warn, then the jet. While it pours, `head` is its leading (lower) end and `tail` its upper
   *  end in world y: the head drives down from the top to the deck, then the tail follows it down. */
  geyserState(g) {
    const t = (this.animTime + g.phase) % GEYSER.cycle;
    const calm = GEYSER.cycle - GEYSER.warn - GEYSER.burst;
    if (t < calm) return { stage: 'calm', k: t / calm };
    if (t < calm + GEYSER.warn) return { stage: 'warn', k: (t - calm) / GEYSER.warn };
    const k = (t - calm - GEYSER.warn) / GEYSER.burst;
    const deck = this.bridges[g.bridge].y + 8, top = GEYSER.top;
    const ease = (u) => 1 - (1 - u) * (1 - u);
    const head = top + (deck + 4 - top) * ease(Math.min(1, k / 0.26));
    const tail = k > 0.78 ? top + (deck + 4 - top) * Math.min(1, (k - 0.78) / 0.22) : top;
    return { stage: 'burst', k, head, tail, landed: k >= 0.26 };
  }

  updateGeysers(dt, player) {
    if (this.bridgeGrow < 1) return;
    for (const g of this.geysers) {
      const st = this.geyserState(g), by = this.bridges[g.bridge].y;
      // motes drift down the line of the coming jet, thickest just before it pours
      const rate = st.stage === 'warn' ? 22 : (st.stage === 'burst' ? 8 : 1.5);
      if (this.inView(g.x - 40, g.x + 40) && Math.random() < rate * dt && this.bubbles.length < 160) {
        this.bubbles.push({ x: g.x + (Math.random() - 0.5) * 18, y: GEYSER.top, vy: (90 + Math.random() * 90) * (st.stage === 'warn' ? 1.5 : 1),
          r: 0.8 + Math.random() * 1.8, bottom: by + 4, seed: Math.random() * 6 });
      }
      // where it lands on the deck: a burst of petals and spray
      if (st.stage === 'burst' && st.landed && !g.burstSeen) {
        g.burstSeen = true;
        this.cameraShake = Math.max(this.cameraShake, 0.15);
        for (let k = 0; k < 12; k++) this.spawnPetal(g.x + (Math.random() - 0.5) * 24, by - 2, (Math.random() - 0.5) * 160, -60 - Math.random() * 90);
      }
      if (st.stage !== 'burst') g.burstSeen = false;
      // anything under the jet is struck and thrown aside
      if (st.stage === 'burst' && player && !player.isDead && player.invulnerableTimer <= 0) {
        if (Math.abs(player.x - g.x) < GEYSER.half && player.y - 64 < st.head && player.y > st.tail) {
          player.takeDamage(GEYSER.damage, Math.sign(player.x - g.x || 1) * 230, -170);
          this.cameraShake = Math.max(this.cameraShake, 0.35);
        }
      }
    }
    for (const q of this.bubbles) { q.y += q.vy * dt; q.x += Math.sin(q.y * 0.08 + q.seed) * 8 * dt; }
    this.bubbles = this.bubbles.filter((q) => q.y < q.bottom);
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
    this.drawScreen(ctx, this.screenCanvas('sanctum', this.bg.sanctum), 1);
    this.drawScreen(ctx, this.screenCanvas('ruins', this.bg.ruins), 2);
    this.drawScreen(ctx, this.screenCanvas('suns', this.bg.suns), 3);
    this.drawScreen(ctx, this.screenCanvas('ruins_m', this.bg.ruins, { mirror: true }), 4);
    this.drawScreen(ctx, this.screenCanvas('towers', this.bg.towers), 5);
    // mirrored copies butted edge to edge: each seam is a perfect reflection, so it needs no feather
    this.drawScreen(ctx, this.screenCanvas('towers_m', this.bg.towers, { mirror: true, feather: false }), 5, 1, X(5) + SCREEN_W - 1);
    this.drawScreen(ctx, this.screenCanvas('towers_n', this.bg.towers, { feather: false }), 5, 1, X(5) + SCREEN_W * 2 - 2);

    this.renderIdolGlow(ctx, 'back');
    this.renderIdol(ctx);
    this.renderIdolGlow(ctx, 'front');
    this.renderTowers(ctx);
    for (const q of this.piers) this.drawPillar(ctx, q);
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
    for (const sp of this.spikes) this.drawSpike(ctx, sp);

    // 5. Shrine room props
    this.renderGeysers(ctx, 'under');
    this.renderBridges(ctx, isDivine);
    this.renderGeysers(ctx, 'over');
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

  /** Kali's idol: the pillared shrine sprite, standing on the floor near the start of the sanctum. */
  renderIdol(ctx) {
    const p = this.prologue, im = this.idolImg;
    const w = IDOL_ART.w * p.idolScale, h = IDOL_ART.h * p.idolScale;
    if (!this.inView(p.idolX - w / 2, p.idolX + w / 2)) return;
    const c = this.cachedArt('idol', w, h, im.complete && im.naturalWidth > 0, (g) => {
      g.drawImage(im, 0, 0, w, h);
      // a cool wash so the gold sits in the same deep-water light as the background
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(10, 40, 110, 0.16)';
      g.fillRect(0, 0, w, h);
    });
    if (!c) return;
    const top = FLOOR_Y + 2 - IDOL_ART.footRow * p.idolScale;
    // soft dark pool where the plinth meets the floor
    ctx.save();
    const sh = ctx.createRadialGradient(p.idolX, FLOOR_Y, 4, p.idolX, FLOOR_Y, w * 0.6);
    sh.addColorStop(0, 'rgba(0, 6, 20, 0.45)');
    sh.addColorStop(1, 'rgba(0, 6, 20, 0)');
    ctx.fillStyle = sh;
    ctx.fillRect(p.idolX - w * 0.6, FLOOR_Y - 20, w * 1.2, 30);
    ctx.drawImage(c, p.idolX - w / 2, top, w, h);
    ctx.restore();
  }

  /** The idol's light: a halo behind her ('back') while she calls Rakti / speaks, and a glow on her face ('front'). */
  renderIdolGlow(ctx, pass) {
    const p = this.prologue;
    const pulse = this.idolBlessed ? 0.08 : 0.2 + Math.sin(this.animTime * 2.2) * 0.08;
    const glow = Math.max(pulse, Math.min(1, this.idolGlow));
    if (glow <= 0.01 || !this.inView(p.idolX - 160, p.idolX + 160)) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const y = p.idolFaceY + (pass === 'back' ? 30 : 0), r = pass === 'back' ? 170 : 60;
    const g = ctx.createRadialGradient(p.idolX, y, 4, p.idolX, y, r);
    g.addColorStop(0, `rgba(255, 214, 120, ${(pass === 'back' ? 0.5 : 0.35) * glow})`);
    g.addColorStop(0.45, `rgba(120, 200, 255, ${(pass === 'back' ? 0.2 : 0.08) * glow})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.idolX - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  /** The deep below each pit (and under the towers): a soft fall into darker water, in the background's own blue
   *  rather than black, so the bottom of the screen reads as deep sea and not a black bar. */
  renderPits(ctx) {
    for (const pit of this.pits) {
      if (!this.inView(pit.x1, pit.x2)) continue;
      const g = ctx.createLinearGradient(0, FLOOR_Y - 6, 0, SCREEN_H);
      g.addColorStop(0, 'rgba(4, 34, 92, 0)');
      g.addColorStop(0.45, 'rgba(4, 34, 92, 0.18)');
      g.addColorStop(1, 'rgba(3, 26, 74, 0.42)');
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

  /** One spike: its vent is always marked (a dark slot with a thin gold rim), and the spike rises out of it. */
  drawSpike(ctx, sp) {
    const { x, y } = this.spikeBase(sp);
    if (!this.inView(x - 30, x + 30)) return;
    const { frame } = this.spikeState(sp);
    // the vent
    ctx.save();
    ctx.fillStyle = 'rgba(4, 8, 18, 0.85)';
    ctx.beginPath(); ctx.ellipse(x, y + 1.5, 15, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = frame >= 2 && frame <= 3 ? 'rgba(255, 120, 70, 0.9)' : 'rgba(214, 170, 80, 0.55)';   // glows red as it is about to fire
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
    if (frame < 0) return;
    const im = this.spikeSheet, s = SPIKE_SCALE;
    const w = SPIKE_ART.frameW * s, h = SPIKE_ART.frameH * s;
    const c = this.cachedArt('spike1:' + frame, w, h, im.complete && im.naturalWidth > 0,
      (g) => g.drawImage(im, frame * SPIKE_ART.frameW, 0, SPIKE_ART.frameW, SPIKE_ART.frameH, 0, 0, w, h));
    if (!c) return;
    ctx.drawImage(c, x - w / 2, y - SPIKE_ART.surface * s + 1, w, h);
  }

  /** One frame of a jet strip, cached at device resolution. flip: drawn upside down (the tail). */
  jetFrame(kind, f, flip = false) {
    const A = JET_ART, s = A.scale, im = this.jetImgs[kind];
    const fw = kind === 'splash' ? A.splashW : A.fw;
    const fh = { head: A.headH, column: A.colH, splash: A.splashH, tail: A.tailH }[kind];
    const w = fw * s, h = fh * s;
    const c = this.cachedArt(`jet:${kind}:${f}:${flip ? 1 : 0}`, w, h, true, (g) => {
      if (flip) { g.translate(0, h); g.scale(1, -1); }
      g.drawImage(im, f * fw, 0, fw, fh, 0, 0, w, h);
    });
    if (c) { c.w = w; c.h = h; }
    return c;
  }

  /** A pouring jet: while it drives down, the falling tip at its leading end with the column behind it; once it
   *  lands, the column all the way down and the splash on the deck; as it ends, its upper end (the tip turned
   *  upside down, with the breaking-up drops above it) falls after it. A soft additive pass on top makes the water glow. */
  renderJet(ctx, g, st, by) {
    const A = JET_ART, s = A.scale, x = g.x;
    const f = Math.floor(this.animTime / A.frameTime) % 4;
    const head = this.jetFrame('head', f), col = this.jetFrame('column', f), splash = this.jetFrame('splash', f);
    if (!head || !col || !splash) return;
    const ground = by + 5;                                   // the splash's ground line sits just into the flowers
    const ending = st.k > 0.78, u = ending ? Math.min(1, (st.k - 0.78) / 0.22) : 0;
    const tail = ending ? this.jetFrame('tail', Math.min(3, Math.floor(u * 4)), true) : null;
    const cap = ending ? this.jetFrame('head', f, true) : null;   // the upper end: the falling tip, pointing up
    // the column runs from the upper end down to the tip (falling) or into the splash (landed)
    const colTop = ending && cap ? st.tail + cap.h - 4 : GEYSER.top;
    const colBottom = st.landed ? ground - A.splashBase * s * 0.35 : st.head - A.headTip * s + 3;
    for (let pass = 0; pass < 2; pass++) {
      ctx.save();
      if (pass) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28; }
      if (colBottom > colTop) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - col.w, colTop, col.w * 2, colBottom - colTop);
        ctx.clip();
        const scroll = (this.animTime * 300) % col.h;          // tiles move down: the water reads as falling
        for (let y = colBottom - col.h + scroll; y > colTop - col.h; y -= col.h) ctx.drawImage(col, x - col.w / 2, y, col.w, col.h);
        ctx.restore();
      }
      if (!st.landed) ctx.drawImage(head, x - head.w / 2, st.head - A.headTip * s, head.w, head.h);
      else if (!ending || st.tail < ground - 6) ctx.drawImage(splash, x - splash.w / 2, ground - A.splashBase * s, splash.w, splash.h);
      if (cap) ctx.drawImage(cap, x - cap.w / 2, st.tail - (cap.h - A.headTip * s), cap.w, cap.h);
      if (tail) ctx.drawImage(tail, x - tail.w / 2, st.tail + 8 - tail.h, tail.w, tail.h);
      ctx.restore();
    }
  }

  /** Water jets. 'under' (behind the bridge): the falling motes. 'over': while warning a thin shimmer from above and
   *  a ring where it will land; while pouring the jet itself, its column tiled from the sprite between its tail and
   *  head, a bright leading edge on the way down and the sprite's splash once it hits the deck. */
  renderGeysers(ctx, pass) {
    if (this.bridgeGrow < 1) return;
    ctx.save();
    if (pass === 'under') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(190, 240, 255, 0.6)';
      for (const q of this.bubbles) {
        if (!this.inView(q.x - 4, q.x + 4)) continue;
        ctx.fillRect(q.x - q.r / 2, q.y - q.r * 1.5, q.r, q.r * 3);   // streaks falling with the current
      }
      ctx.restore();
      return;
    }
    const ready = Object.values(this.jetImgs).every((im) => im.complete && im.naturalWidth > 0);
    for (const g of this.geysers) {
      const st = this.geyserState(g), by = this.bridges[g.bridge].y, deck = by + 8;
      if (!this.inView(g.x - 40, g.x + 40)) continue;
      if (st.stage === 'warn') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const a = 0.12 + 0.3 * st.k + 0.06 * Math.sin(this.animTime * 26);
        const line = ctx.createLinearGradient(0, GEYSER.top, 0, deck);
        line.addColorStop(0, `rgba(170, 245, 255, ${a})`);
        line.addColorStop(1, `rgba(170, 245, 255, ${a * 0.4})`);
        ctx.fillStyle = line;
        const lw = 2 + 6 * st.k;
        ctx.fillRect(g.x - lw / 2, GEYSER.top, lw, deck - GEYSER.top);
        ctx.strokeStyle = `rgba(190, 250, 255, ${0.35 + 0.5 * st.k})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(g.x, by + 2, 10 + 10 * st.k, 3 + 2 * st.k, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      if (st.stage !== 'burst' || !ready || st.head <= st.tail) continue;
      this.renderJet(ctx, g, st, by);
    }
    ctx.restore();
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
    // like the Trishul's shrine in Level 2: light falls on it, and a marker shows it once the lever has freed it
    if (!this.relic.collected && this.inView(this.relic.x - 60, this.relic.x + 60)) {
      drawShrineBeacon(ctx, { x: this.relic.x, baseY: this.shrineSillY - shrineH + 4, relicY: this.relicFloatY, relicH,
        t: this.animTime, rgb: '160, 255, 240', marker: this.lever.activated, shaftH: 70 });
    }
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

  /** The three free-standing towers. Their bases sink into the deep water (renderPits draws over them).
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

  /** Bloom timing on a bridge: ends first, the middle last (d = 0 at the towers, 1 at the centre). */
  bloomProgress(f) {
    return Math.max(0, Math.min(1, (this.bridgeGrow - 0.1 - f.d * 0.62) / 0.24));
  }

  updateBridgeBlooms(dt, isDivine) {
    if (this.bridgeGrow > 0) {
      for (const b of this.bridges) {
        for (const f of b.blooms) {
          if (!f.landed && this.bloomProgress(f) >= 0.98) {
            f.landed = true;
            for (let k = 0; k < 4; k++) this.spawnPetal(f.x + (Math.random() - 0.5) * f.w * 0.8, f.y - 2, (Math.random() - 0.5) * 50, -30 - Math.random() * 30);
          }
        }
        // the two halves meet: a flash and a ring of petals
        if (!b.met && this.bridgeGrow >= 0.84) {
          b.met = true;
          b.metT = 0;
          this.cameraShake = Math.max(this.cameraShake, 0.3);
          const cx = (b.x1 + b.x2) / 2;
          for (let k = 0; k < 26; k++) {
            const a = (k / 26) * Math.PI * 2;
            this.spawnPetal(cx, b.y + 2, Math.cos(a) * (60 + Math.random() * 50), Math.sin(a) * (45 + Math.random() * 40) - 30);
          }
        }
        if (b.met) b.metT += dt;
        // once whole (and seen in Kali form) a petal drifts down from it now and then
        if (this.bridgeGrow >= 1 && isDivine && Math.random() < dt * 1.6) {
          const f = b.blooms[Math.floor(Math.random() * b.blooms.length)];
          this.spawnPetal(f.x, f.y + 4, (Math.random() - 0.5) * 12, 8);
        }
      }
    }
    for (const q of this.petals) {
      q.life -= dt;
      q.vy += 70 * dt;
      q.vx *= 1 - dt * 1.4;
      q.x += (q.vx + Math.sin(q.life * 5 + q.seed) * 14) * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
    }
    this.petals = this.petals.filter((q) => q.life > 0);
  }

  spawnPetal(x, y, vx, vy) {
    if (this.petals.length > 140) return;
    this.petals.push({ x, y, vx, vy, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, life: 1.2 + Math.random() * 0.8, max: 2,
      seed: Math.random() * 6, gold: Math.random() < 0.25 });
  }

  /** A leaf pad of the hibiscus road, pre-scaled (and mirrored for variety). */
  padArt(f) {
    const im = this.hib['pad_' + f.kind];
    return this.cachedArt(`pad:${f.kind}:${f.flip ? 1 : 0}:${Math.round(f.w)}`, f.w, f.h, im.complete && im.naturalWidth > 0, (g) => {
      if (f.flip) { g.translate(f.w, 0); g.scale(-1, 1); }
      g.drawImage(im, 0, 0, f.w, f.h);
    });
  }

  /** A hibiscus-sheet sprite scaled to `size` world px on its longer side; the cache canvas carries .w/.h. */
  hibArt(name, size) {
    const im = this.hib[name];
    if (!im || !im.complete || !im.naturalWidth) return null;
    const k = size / Math.max(im.naturalWidth, im.naturalHeight);
    const w = im.naturalWidth * k, h = im.naturalHeight * k;
    const c = this.cachedArt(`hib:${name}:${size}`, w, h, true, (g) => g.drawImage(im, 0, 0, w, h));
    if (c) { c.w = w; c.h = h; }
    return c;
  }

  /** Kali's flower bridges. While the lever's call plays out, crimson fire flares at both towers and the blooms
   *  fly in, spinning, from either end, landing on a gold thread that is drawn after them; the two halves meet in
   *  a flash. Once whole they are solid only in Kali form; a mortal Rakti sees a faint ghost of them. */
  renderBridges(ctx, isDivine) {
    if (this.bridgeGrow <= 0) return;
    const g = this.bridgeGrow, summoning = g < 1;
    const ghost = !summoning && !isDivine;
    for (const b of this.bridges) {
      if (!this.inView(b.x1 - 40, b.x2 + 40)) continue;
      const span = b.x2 - b.x1, cx = (b.x1 + b.x2) / 2, y = b.y;
      ctx.save();
      if (ghost) ctx.globalAlpha = 0.22 + 0.06 * Math.sin(this.animTime * 2.4);
      // red-gold glow under the deck
      if (!ghost) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const f = Math.min(1, Math.max(0, (g - 0.1) / 0.62));
        const gl = ctx.createLinearGradient(0, y - 18, 0, y + 26);
        gl.addColorStop(0, 'rgba(0,0,0,0)');
        gl.addColorStop(0.5, `rgba(255, 70, 50, ${0.16 + 0.05 * Math.sin(this.animTime * 3)})`);
        gl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(b.x1, y - 18, (span / 2) * f, 44);
        ctx.fillRect(b.x2 - (span / 2) * f, y - 18, (span / 2) * f, 44);
        // the call: crimson fire at both arm tips
        if (g < 0.45) {
          const a = 1 - g / 0.45;
          for (const x of [b.x1, b.x2]) {
            const r = 16 + 26 * (1 - a);
            const fl = ctx.createRadialGradient(x, y, 1, x, y, r);
            fl.addColorStop(0, `rgba(255, 236, 170, ${0.9 * a})`);
            fl.addColorStop(0.35, `rgba(255, 70, 40, ${0.7 * a})`);
            fl.addColorStop(1, 'rgba(120, 0, 20, 0)');
            ctx.fillStyle = fl;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
          }
        }
        ctx.restore();
      }
      // the gold thread the blooms are strung on, drawn out from both towers
      const reach = Math.min(1, Math.max(0, (g - 0.1) / 0.66)) * span / 2;
      ctx.strokeStyle = '#f5c95a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(b.x1, y + 1); ctx.lineTo(b.x1 + reach, y + 1);
      ctx.moveTo(b.x2, y + 1); ctx.lineTo(b.x2 - reach, y + 1);
      ctx.stroke();
      // the swag garland under the deck, once the halves have met
      const swag = Math.min(1, Math.max(0, (g - 0.8) / 0.2));
      if (swag > 0) {
        ctx.save();
        ctx.globalAlpha *= swag;
        const bays = Math.max(3, Math.round(span / 34)), bw = span / bays;
        ctx.strokeStyle = '#e8b54a';
        ctx.lineWidth = 1.1;
        for (let k = 0; k < bays; k++) {
          const x0 = b.x1 + k * bw, x1 = x0 + bw, sag = 9 + Math.sin(this.animTime * 1.6 + k) * 0.8;
          ctx.beginPath();
          ctx.moveTo(x0, y + 9);
          ctx.quadraticCurveTo((x0 + x1) / 2, y + 9 + sag * 2, x1, y + 9);
          ctx.stroke();
          // marigold beads along the swag, and a small bloom hanging at its lowest point
          ctx.fillStyle = '#ff9d1c';
          for (let t = 0.2; t < 0.85; t += 0.15) {
            const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1;
            const by = (1 - t) * (1 - t) * (y + 9) + 2 * (1 - t) * t * (y + 9 + sag * 2) + t * t * (y + 9);
            ctx.beginPath(); ctx.arc(bx, by, 1.4, 0, Math.PI * 2); ctx.fill();
          }
          // a side-view hibiscus hanging at its lowest point, a leaf where the bays meet
          const hb = this.hibArt(k % 2 ? 'hib_side_a' : 'hib_side_b', 15);
          if (hb) {
            ctx.save();
            ctx.translate((x0 + x1) / 2, y + 9 + sag + 2);
            ctx.rotate(Math.PI * 0.5 + Math.sin(this.animTime * 1.4 + k) * 0.12);   // hanging head-down
            ctx.drawImage(hb, -hb.w / 2, -hb.h / 2, hb.w, hb.h);
            ctx.restore();
          }
          const lf = this.hibArt('leaf_c', 9);
          if (lf && k > 0) ctx.drawImage(lf, x0 - 4, y + 7, lf.w, lf.h);
        }
        ctx.restore();
      }
      // the leaf pads: each unfurls up out of the water at its place, ends first and the middle last
      for (const f of b.blooms) {
        const p = this.bloomProgress(f);
        if (p <= 0) continue;
        const e = 1 - Math.pow(1 - p, 3);
        const art = this.padArt(f);
        if (!art) continue;
        const over = p < 1 ? 0.25 + 0.75 * e + Math.sin(p * Math.PI) * 0.12 : 1;
        const bob = p >= 1 ? Math.sin(this.animTime * 1.8 + f.rot) * 0.5 : 0;
        ctx.save();
        ctx.translate(f.x, f.y + 34 * (1 - e) + bob);
        ctx.rotate(f.tilt + (1 - e) * (f.u < 0.5 ? -0.5 : 0.5));
        ctx.scale(over, over);
        ctx.drawImage(art, -f.w / 2, -f.h * PAD_SURFACE, f.w, f.h);
        ctx.restore();
      }
      // where the halves meet: a flash
      if (b.met && b.metT < 0.6 && !ghost) {
        const a = 1 - b.metT / 0.6;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const fl = ctx.createRadialGradient(cx, y, 1, cx, y, 50);
        fl.addColorStop(0, `rgba(255, 245, 210, ${a})`);
        fl.addColorStop(0.3, `rgba(255, 120, 70, ${0.6 * a})`);
        fl.addColorStop(1, 'rgba(120, 0, 20, 0)');
        ctx.fillStyle = fl;
        ctx.fillRect(cx - 50, y - 50, 100, 100);
        ctx.restore();
      }
      ctx.restore();
    }
    // loose petals
    if (this.petals.length) {
      for (const q of this.petals) {
        if (!this.inView(q.x - 5, q.x + 5)) continue;
        ctx.save();
        ctx.globalAlpha = Math.min(1, q.life / 0.5) * (ghost ? 0.3 : 1);
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        const pa = q.gold ? null : this.hibArt(q.seed > 3 ? 'petal_c' : 'petal_d', q.seed > 3 ? 7 : 5);
        if (pa) ctx.drawImage(pa, -pa.w / 2, -pa.h / 2, pa.w, pa.h);
        else {
          ctx.fillStyle = '#ffd36b';
          ctx.beginPath();
          ctx.ellipse(0, 0, 2.2, 1.1, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }
}
