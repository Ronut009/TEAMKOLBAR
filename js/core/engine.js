/**
 * ==========================================================================
 * GLITCHVERSE - CORE ENGINE (js/core/engine.js)
 * Fullscreen dynamic camera, four-chapter progression,
 * Undertale HUD binding, Climbing, Morphing [Q], and Quest progression.
 * ==========================================================================
 */

import { Input } from './input.js';
import { Music, Sfx } from './audio.js';
import { keyLabel, startKeyLabels } from './keyLabels.js';
import { SettingsMenu } from './settings.js';
import { Run, Saves } from './run.js';
import { SlotsMenu } from './slots.js';
import { AssetWatch } from './assetWatch.js';

// The loading screen stays until the level's pictures have arrived, but never longer than this (a picture that
// will not come must not hold the game)
const LOADING_MAX_WAIT = 25;

// An atmosphere hum swells as Rakti nears the item she needs to progress (a level's crucialItem())
const AURA_RANGE = 380, AURA_CLOSE = 110;
// Sands of Time [F] (found on Level 2's second tower): enemies, arrows, traps and moving platforms run at
// SANDS_SLOW of their speed for SANDS_DURATION s while Rakti keeps hers; then the sands need SANDS_COOLDOWN s.
const SANDS_DURATION = 8, SANDS_COOLDOWN = 15, SANDS_SLOW = 0.35;
// The level-complete cards of Levels 1-3 continue on their own after this many seconds ([E] / [Space] sooner)
const AUTO_CONTINUE = 5;
// The opening cutscene: hold [Esc] this long to skip it
const INTRO_SKIP_HOLD = 1.5;
// A dialogue line that teaches a key cannot be skipped before it is fully shown and this many seconds have passed
const KEY_LINE_HOLD = 3;
const KEY_TOKEN = /\[(E|F|Q|X|1|2|R|C|ESC|SPACE|ENTER|CLICK)\]/i;
const teachesKey = (text) => KEY_TOKEN.test(String(text || ''));
// Demo shortcuts (hackathon): straight to the story's big moments, from the title screen or in game (demoJump)
//  [J] Level 2: the Sands of Time on tower 2   [H] Level 2: the Trishul's shrine in the Hall of the Sun
//  [K] Level 3: the Forest Heart wakes, the 50 s race   [G] Level 4: Pitaji falls and the Asura rises
//  [L] Level 4: the Asura is broken: the ending scene, then the final card
// These and the level keys [U] [I] [O] [P] only work when the page address ends in ?dev (so players never hit them)
const DEV_KEYS = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev');
const DEMO_JUMPS = DEV_KEYS ? { KeyJ: 'sands', KeyH: 'trishul', KeyK: 'heart', KeyG: 'demon', KeyL: 'ending' } : {};
import { TRISHUL } from '../entities/player.js';
import { Level2 } from '../levels/level2.js';
import { Level3 } from '../levels/level3.js';
import { Level4 } from '../levels/level4.js';
import { EndlessLevel } from '../levels/endless.js';

// Shown under the sigil on the loading screen
const LEVEL_NAMES = {
  1: 'Level I  ·  Drowned Dwaraka',
  2: 'Level II  ·  Surya Mandir',
  3: 'Level III  ·  Vrindavan',
  4: 'Level IV  ·  Indraprastha',
  5: 'Chaos Mode  ·  The Siege Wall'
};

const SPEAKER_NAMES = { kali: '⚜ MAA KALI ⚜', rakti: '⚜ RAKTI ⚜', father: '⚜ PITAJI ⚜', demon: '⚜ THE ASURA ⚜' };
const divineActiveNow = (p) => p.isDivine || p.isTransforming;

// What each still portrait frame shows (v3 sheets). A dialogue line picks one with `p` (frame number);
// lines without `p` map their old gesture `g`, or are read for tone (! ? ...) by pickPortrait().
//  kali:   0 stern  1 speaking  2 fierce shout  3 hard glare  4 head raised (proud)  5 eyes closed (serene)
//          6 open palm (offering)  7 finger raised (instruction)  8 hand on chest  9 palm out (stop / blessing)  10 roar  11 clawed hand (threat)
//  rakti (armour): 0 neutral  1 speaking / surprised  2 worried  3 doubtful side-glance  4 hand on chin (thinking)  5 eyes closed, soft smile
//          6 open palm (explaining)  7 finger raised  8 hand on chest  9 palm out (stop)  10 shocked  11 determined / angry
//  rakti_sari: 0 neutral  1 speaking  2 worried  3 frowning  4 smiling, open hand  5 hand on chin
//  father: 0 stern  1 speaking, angry  2 concerned  3 hard glare  4 eyes closed  5 sad / gentle
//          6 open hand  7 finger raised  8 hand on chest  9 palm out  10 shouting  11 cold stare
//  demon:  0 glare  1 stern  2 snarling  3 sly grin  4 head lowered, menacing  5 head thrown back
//          6 open palm (demanding)  7 finger raised  8 hand on chest  9 palm out  10 roar  11 clawed hand
const OLD_GESTURE_TO_FRAME = {
  kali: { 0: 6, 1: 7, 2: 8, 3: 9, 4: 9, 5: 0, 6: 6, 7: 5 },
  rakti: { 0: 6, 1: 7, 2: 8, 3: 2, 4: 4, 5: 6, 7: 5 },
  rakti_sari: { 0: 4, 1: 1, 2: 2, 3: 3, 4: 5, 5: 4, 7: 0 },
  father: { 0: 0, 9: 2, 10: 5, 11: 2, 12: 4, 13: 3, 14: 1, 15: 1 },
  demon: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 10 }
};
/** The still frame for a line: its explicit `p`, else its old gesture mapped, else its tone. */
function pickPortrait(setName, gesture, text, p) {
  const n = setName === 'rakti_sari' ? 6 : 12;
  if (Number.isInteger(p) && p >= 0 && p < n) return p;
  const map = OLD_GESTURE_TO_FRAME[setName];
  if (gesture != null && map && map[gesture] != null) return map[gesture];
  const t = String(text || '');
  const shout = /!/.test(t) && /[A-Z]{3,}|!.*!/.test(t), excl = /!/.test(t), ask = /\?/.test(t);
  switch (setName) {
    case 'kali': return /\[[A-Z0-9]/.test(t) ? 7 : shout ? 2 : excl ? 1 : 6;
    case 'rakti': return shout ? 10 : ask ? 2 : excl ? 11 : /\.\.\./.test(t) ? 4 : 0;
    case 'rakti_sari': return ask ? 2 : excl ? 1 : /\.\.\./.test(t) ? 5 : 0;
    case 'father': return shout ? 10 : excl ? 1 : 0;
    case 'demon': return shout ? 10 : excl ? 2 : 3;
    default: return 0;
  }
}

export class Engine {
  constructor(canvas, level, player) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Levels
    this.level1 = level;
    this.level2 = new Level2();
    this.level3 = new Level3();
    this.level4 = new Level4();
    this.levelEndless = new EndlessLevel();
    this.currentLevelIndex = 1;
    this.level = this.level1;

    this.player = player;

    this.lastTime = 0;
    this.isRunning = false;
    this.rafId = null;

    // Camera zoom and positioning
    this.camX = 0;
    this.camY = 0;
    this.zoom = 1.0;

    // Dialogue State (Undertale dialogue system)
    this.dialogueActive = false;
    this.currentInteractable = null;

    // Cached DOM elements
    this.hudEl = document.getElementById('hud');
    this.hudPortraitArt = document.getElementById('hudPortraitArt');
    this.hudWeapon = document.getElementById('hudWeapon');
    this.hudWeaponKeys = document.getElementById('hudWeaponKeys');
    this.hpNum = document.getElementById('hpNum');
    this.healthTrack = document.getElementById('healthTrack');
    this.healthBarFill = document.getElementById('healthBarFill');
    this.divineTrack = document.getElementById('divineTrack');
    this.divineMeter = this.divineTrack;
    this.divineBarFill = document.getElementById('divineBarFill');
    this.isHurtPortrait = false;
    this.hudEl?.classList.add('menu-hidden');
    this.player.hasDivineUnlocked = false;

    this.dialogueBox = document.getElementById('dialogueBox');
    this.dialogueText = document.getElementById('dialogueText');
    this.dialogueTitle = document.getElementById('dialogueTitle');
    // the two standing speakers (left: Rakti; right: Kali, Pitaji, the Asura). The one speaking drives
    // dialoguePortraitImg / dialoguePortraitBack (its pose, and the previous pose under a crossfade).
    const actor = (id) => { const el = document.getElementById(id); return el && { el, img: el.querySelector('img.front'), back: el.querySelector('img.back'), name: el.querySelector('.dlg-name'), who: null }; };
    this.dlgActors = { left: actor('dlgActorLeft'), right: actor('dlgActorRight') };
    this.dialoguePortraitImg = null;
    this.dialoguePortraitBack = null;
    this.portraitLast = {};   // the last pose each portrait set showed (what a listener keeps on screen)
    this.dialogueDismiss = document.getElementById('dialogueDismiss');
    this.bossHud = document.getElementById('bossHud');
    this.bossFill = document.getElementById('bossFill');
    this.bossFillLag = document.getElementById('bossFillLag');
    this.bossName = document.getElementById('bossName');
    this.fatherHud = document.getElementById('fatherHud');
    this.fatherFill = document.getElementById('fatherFill');
    this.fatherFillLag = document.getElementById('fatherFillLag');

    // Dialogue portraits (v3, assets/portraits/*3_N.png): still busts, one expression per line, no talking animation.
    // Frames (see PORTRAIT_FRAMES below for what each one shows):
    const still = (prefix, n) => Array.from({ length: n }, (_, i) => { const im = new Image(); im.src = `assets/portraits/${prefix}_${i}.png`; return im; });
    this.portraitSets = { kali: still('kali3', 12), rakti: still('rakti3', 12), rakti_sari: still('rakti_sari3', 6),
      father: still('father3', 12), demon: still('demon3', 12) };
    this.portraitAnim = 0;
    this.portraitFrame = -1;
    this.dialogueSpeaker = null;
    this.dlg = null;        // the line on screen: { text, shown, speaker, gesture }
    this.convo = null;      // a conversation: { lines, i, onDone, title }

    this.interactPrompt = document.getElementById('interactPrompt');
    this.interactPromptText = document.getElementById('interactPromptText');

    this.levelCompleteModal = document.getElementById('levelCompleteModal');
    this.completeTitle = document.getElementById('completeTitle');
    this.completeSubtitle = document.getElementById('completeSubtitle');
    this.completeFlavor = document.getElementById('completeFlavor');
    this.completePrompt = document.getElementById('completePrompt');

    // Kill Notification & Death Screen Elements
    this.deathScreen = document.getElementById('deathScreen');
    // [Esc] pause menu: Continue / Restart (asks first) / Exit to main menu
    this.paused = false;
    this.sands = { active: 0, cooldown: 0, fx: 0, ripple: 0, grains: [] };
    // The campaign's run (shown on the ending card): play time in Levels 1-4 (not paused, loading or the opening
    // film) and deaths (a fall into the void or the quicksand is not one, nor the Forest Heart withering)
    this.runStats = { time: 0, deaths: 0 };
    this.sandsEl = document.getElementById('sandsPower');
    this.sandsGlass = document.getElementById('sandsGlass');
    this.sandsTime = document.getElementById('sandsTime');
    this.pauseScreen = document.getElementById('pauseScreen');
    this.pauseMain = document.getElementById('pauseMain');
    this.pauseConfirm = document.getElementById('pauseConfirm');
    const on = (id, fn) => document.getElementById(id)?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
    on('pauseContinue', () => this.resume());
    // Settings: from the pause menu and the title screen (js/core/settings.js)
    this.settings = new SettingsMenu();
    on('pauseSettings', () => this.settings.show(document.getElementById('pauseSettings'), this.controlsHave()));
    on('titleSettingsButton', () => this.settings.show(document.getElementById('titleSettingsButton')));
    on('pauseRestart', () => this.showRestartConfirm(true));
    on('pauseExit', () => { this.resume(); this.returnToTitle(); });
    on('pauseYes', () => this.restartFromStart());
    on('pauseNo', () => this.showRestartConfirm(false));
    this.killToast = document.getElementById('killToast');
    this.killToastText = document.getElementById('killToastText');

    this.titleScreen = document.getElementById('titleScreen');
    this.startGameButton = document.getElementById('startGameButton');
    this.endlessGameButton = document.getElementById('endlessGameButton');
    this.endlessHud = document.getElementById('endlessHud');
    this.loadingScreen = document.getElementById('loadingScreen');
    this.loadingLevel = document.getElementById('loadingLevel');
    this.isLoading = false;
    this.loadingTimer = 0;
    this.loadingTargetIndex = null;
    this.isGameStarted = false;
    // Level 1 prologue (wake-up, idol, outfit change) plays once per new game; deaths after it
    // respawn Rakti in her battle outfit at the start of the temple.
    this.prologueComplete = false;
    this.cameraSnap = false;

    startKeyLabels();      // on-screen [KEY] names follow the device in use (keyboard, Xbox or PlayStation pad)
    Music.play('title');   // the start screen's music: it begins at once, or on the first click if the browser blocks that

    // Campaign: the three save slots (js/core/slots.js). An empty slot asks for the difficulty, then the game begins.
    this.slotIndex = null;      // the slot being played (null: Chaos mode, the test keys)
    this.saveClock = 0;
    this.lastSaveKey = '';
    this.slots = new SlotsMenu({
      onNew: (slot, difficulty) => this.startJourney(slot, difficulty),
      onContinue: (slot) => this.continueJourney(slot)
    });
    this.startGameButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.openCampaign();
    });

    this.endlessGameButton?.addEventListener('click', (event) => {
      event.preventDefault();
      this.startEndless();
    });

    this.playerDying = false;
    this.levelCompleted = false;
    this.levelTransitionTimer = 0;

    this.resizeCanvas = this.resizeCanvas.bind(this);
    this.loop = this.loop.bind(this);

    window.addEventListener('resize', this.resizeCanvas);
    this.resizeCanvas();

    // Leaving the game (another tab, another window, minimising) pauses it
    const away = () => {
      if (this.isGameStarted && !this.isLoading && !this.paused && !this.intro && !this.playerDying && !this.levelCompleted) this.pause();
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden) away(); });
    window.addEventListener('blur', away);
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    Input.poll();    // the controller, if one is plugged in
    this.update(dt);
    this.render();

    Input.update();
    this.rafId = requestAnimationFrame(this.loop);
  }

  loadLevel(index) {
    this.isGameStarted = true;
    this.currentLevelIndex = index;
    this.level = index === 5 ? this.levelEndless
      : index === 4 ? this.level4
      : index === 3 ? this.level3
      : index === 2 ? this.level2
      : this.level1;
    Run.campaign = index >= 1 && index <= 4;    // the difficulty only counts in the story (enemy health is set in reset())
    this.level.reset();
    this.levelCompleted = false;
    this.levelTransitionTimer = 0;
    this.closeDialogue();

    if (this.levelCompleteModal) {
      this.levelCompleteModal.classList.remove('active');
    }

    if (index === 5) {
      // Unlimited mode: the arena's centre, every power and weapon from the start
      const spawn = this.levelEndless.getRespawnPoint();
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      this.player.hasDivineUnlocked = true;
    } else if (index === 4) {
      // The archer fort: Rakti steps onto the platform below the wall
      const spawn = this.level4.getRespawnPoint();
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      this.player.hasDivineUnlocked = true;
    } else if (index === 3) {
      // Level 3 (jungle): starts on the home field, or at the last checkpoint
      const spawn = this.level3.getRespawnPoint();
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      this.player.hasDivineUnlocked = true;
    } else if (index === 2) {
      // Level 2 (sun wastes): the portal at the start, or the last checkpoint
      const spawn = this.level2.getRespawnPoint ? this.level2.getRespawnPoint() : { x: 90, y: 145 };
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      this.player.hasDivineUnlocked = true; // Divine power persists into Level 2
    } else {
      // Level 1: the prologue (portal room -> idol) unless it has already been played
      this.level1.idolBlessed = this.prologueComplete;
      this.player.x = this.prologueComplete ? this.level1.getRespawnPoint().x : this.level1.prologue.wakeX;
      this.player.y = 368;
      this.player.hasDivineUnlocked = false; // Strictly requires lotus interaction in Round 1
    }

    this.player.vx = 0;
    this.player.vy = 0;
    Object.assign(this.sands, { active: 0, cooldown: 0, ripple: 0 });
    this.applyRelicPowers();
    this.player.hp = this.player.maxHp;
    this.player.speed = this.player.baseSpeed;
    this.player.hasKey = false;
    this.player.isClimbing = false;
    this.player.isGrounded = true;
    this.player.isDead = false;
    this.player.isAttacking = false;
    this.player.attackQueued = false;
    this.player.climbTransition = null;
    this.player.doorwayFade = 1.0;
    this.player.currentPlatform = null;
    // A level whose intro is still to play (Level 2: stepping out of the portal) shows Rakti itself
    const introHidden = Boolean(this.level.introPending);
    this.player.inputLocked = introHidden;
    this.player.spawnAlpha = introHidden ? 0 : 1;
    // The Trishul is found in Level 2's sun shrine and kept from then on
    this.player.hasTrishul = index >= 3 || Boolean(this.level.playerHasTrishul?.());
    // Kali's gold orbs and the damage charge belong to Level 4 (it switches them on once the mala is taken)
    this.player.kaliOrbs = false;
    this.player.chargeMode = false;
    this.player.divineDuration = 6;
    this.player.resetWeapons();
    this.level.onPlayerSpawn?.(this.player);
    this.playerDying = false;
    if (this.deathScreen) {
      this.deathScreen.classList.remove('active');
    }
    this.player.resetPrologueState();
    if (index === 1 && !this.prologueComplete) {
      // Rakti lies unconscious in her sari; the screen fades in as she wakes.
      this.player.beginWakeUp();
      this.level1.screenFade = 1;
    } else {
      this.player.spawnPoof(20);
    }
    this.cameraSnap = true;

    // Every level starts in mortal form (Kali form used to carry over when switching levels)
    if (this.player.isDivine || this.player.isTransforming || this.player.isReverting) this.player.revertToMortal();
    this.updateHUD();
  }

  /**
   * Each relic makes Rakti stronger:
   *  - Pearl of the Tide (Level 1): Kali's earth power [Q] answers her (Level 2 on)
   *  - Forest Heart (Level 3): talwar and Trishul deal double damage, and her life rises to 50 (Level 4 boss)
   */
  applyRelicPowers() {
    const p = this.player, i = this.currentLevelIndex;
    p.hasPearl = i >= 2 || Boolean(this.level1.relic?.collected);
    const heart = i >= 4 || (i === 3 && Boolean(this.level3.relic?.collected));
    p.relicMight = heart ? 2 : 1;
    p.swordDamage = 5 * p.relicMight;
    p.trishulDamage = TRISHUL.damage * p.relicMight;
    p.maxHp = heart ? 50 : 20;
    if (p.hp > p.maxHp) p.hp = p.maxHp;
    // Sands of Time: taken on Level 2's second tower, kept from then on (unlimited mode has every power)
    p.hasSands = i >= 3 || (i === 2 && Boolean(this.level2.progress?.sandsTaken));
  }

  /** Level 3: claiming the Forest Heart empowers Rakti on the spot (full life at the new maximum). */
  grantForestHeart() {
    this.applyRelicPowers();
    this.player.hp = this.player.maxHp;
    this.level.killToastText = '⚜ FOREST HEART: DOUBLE MIGHT · LIFE 50 ⚜';
    this.level.killToastTimer = 3.2;
    this.level.cameraShake = Math.max(this.level.cameraShake || 0, 0.6);
    const flash = document.getElementById('divineFlash');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 300);
    }
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2, v = 60 + Math.random() * 90;
      this.player.particles.push({
        x: this.player.x, y: this.player.y - 34, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20,
        life: 0.9, maxLife: 0.9, size: 2.5 + Math.random() * 2, color: i % 3 ? '#7dff9a' : '#fff1b0'
      });
    }
  }

  /** Title screen > CAMPAIGN MODE: the save slots. */
  openCampaign() {
    if (this.isGameStarted || this.isLoading || this.intro || this.slots.isOpen) return;
    this.slots.show(this.startGameButton);
  }

  /** A new game in a save slot, at the chosen difficulty ('normal' | 'hard' | 'hardcore'). */
  startJourney(slot = null, difficulty = 'normal') {
    if (this.isGameStarted || this.isLoading) return;
    this.slotIndex = slot;
    Run.difficulty = difficulty;
    this.lastSaveKey = '';
    if (slot !== null) {
      // a hardcore slot counts its attempts; anything else starts at 1
      const before = Saves.get(slot);
      const attempts = before && before.difficulty === 'hardcore' && difficulty === 'hardcore' && !before.completed ? (before.attempts || 1) : 1;
      Saves.write(slot, Saves.fresh(difficulty, attempts));
    }
    this.prologueComplete = false;   // a new game always starts with the wake-up
    this.level1.checkpointIndex = -1;
    this.level1.abilityGranted = false;
    this.level1.bridgeTold = false;
    this.level1.lessonHeard = false;
    this.level1.relicKept = false;
    this.level1.leverKept = false;
    this.level1.relicTalked = false;
    this.runStats = { time: 0, deaths: 0 };   // a new campaign: a new run
    this.playIntroCutscene(() => this.beginLoadingTransition(1));
  }

  /** Continue a save slot: the level it reached, as Rakti would return to it after a death (Normal: her last
   *  checkpoint; Hard and Hardcore: the start of the level). */
  continueJourney(slot) {
    const s = Saves.get(slot);
    if (!s || this.isGameStarted || this.isLoading) return;
    this.slotIndex = slot;
    Run.difficulty = s.difficulty;
    this.lastSaveKey = '';
    this.runStats = { time: s.time || 0, deaths: s.deaths || 0 };
    this.closeDialogue();
    this.playerDying = false;
    this.beginLoadingTransition(s.level);                 // freshStart(): the level from scratch ...
    this.prologueComplete = Boolean(s.prologue) || s.level > 1;
    if (s.difficulty === 'normal' && s.snap) [null, this.level1, this.level2, this.level3, this.level4][s.level]?.restore?.(s.snap);   // ... then what the slot kept
    else if (s.level === 1 && s.testDone) this.level1.testDone = true;
  }

  /** Writes the slot being played (called about once a second while playing; `force` at once). Only what a death
   *  would keep is stored, so continuing is the same as coming back from a death. */
  autosave(force = false) {
    const i = this.currentLevelIndex;
    if (this.slotIndex === null || i < 1 || i > 4 || this.playerDying) return;
    const old = Saves.get(this.slotIndex);
    const save = {
      difficulty: Run.difficulty, level: i, prologue: this.prologueComplete,
      snap: Run.difficulty === 'normal' ? (this.level.snapshot?.() ?? null) : null,
      testDone: i === 1 && Boolean(this.level1.testDone),
      attempts: old?.attempts || 1, completed: Boolean(this.levelCompleted && i === 4),
      deaths: this.runStats.deaths
    };
    const key = JSON.stringify(save);
    this.saveClock = 0;
    if (!force && key === this.lastSaveKey && Math.floor(this.runStats.time / 10) === this.lastSaveTen) return;   // (the clock is stored every 10 s)
    this.lastSaveKey = key;
    this.lastSaveTen = Math.floor(this.runStats.time / 10);
    Saves.write(this.slotIndex, { ...save, time: Math.floor(this.runStats.time) });
  }

  // ======================================================================== the opening cutscene
  /** New Game: the opening film (assets/video/start_cutscene.mp4) plays full screen first; when it ends, or [Esc]
   *  has been held for INTRO_SKIP_HOLD s, the loading screen takes over and Level 1 begins. */
  playIntroCutscene(onDone) {
    const box = document.getElementById('introCutscene'), video = document.getElementById('introVideo');
    if (!box || !video) { onDone(); return; }
    this.intro = { onDone, hold: 0, done: false };
    this.titleScreen?.classList.remove('active');
    box.classList.add('active');
    box.setAttribute('aria-hidden', 'false');
    try { video.currentTime = 0; } catch (e) { /* not loaded yet */ }
    video.onended = () => this.finishIntroCutscene();
    video.onerror = () => this.finishIntroCutscene();   // missing or unplayable: straight into the game
    const p = video.play();
    if (p && p.catch) p.catch(() => {
      // sound refused (should not happen after the click): play it muted rather than not at all
      video.muted = true;
      video.play().catch(() => this.finishIntroCutscene());
    });
  }

  updateIntroCutscene(dt) {
    const it = this.intro;
    // hold [Esc] to skip: the bar fills while it is held and drains when it is let go
    it.hold = Input.isDown('Escape') ? it.hold + dt : Math.max(0, it.hold - dt * 2);
    // the skip button (the menu's button art, bottom right for the whole film) lights up from left to right while held
    const skip = document.getElementById('introSkip');
    if (skip) {
      skip.style.setProperty('--fill', `${Math.min(100, (it.hold / INTRO_SKIP_HOLD) * 100).toFixed(1)}%`);
      skip.classList.toggle('holding', it.hold > 0);
      skip.classList.add('show');
    }
    if (it.hold >= INTRO_SKIP_HOLD) { this.finishIntroCutscene(); return; }
  }

  finishIntroCutscene() {
    const it = this.intro;
    if (!it || it.done) return;
    it.done = true;
    const box = document.getElementById('introCutscene'), video = document.getElementById('introVideo');
    video?.pause();
    if (video) { video.onended = null; video.onerror = null; }
    box?.classList.remove('active');
    box?.setAttribute('aria-hidden', 'true');
    this.intro = null;
    Input.keysPressed?.clear();
    Input.keysDown?.clear();
    it.onDone();
  }

  // ======================================================================== music
  /** What should play right now. Start menu: its theme. Opening film and loading screens: silence. Levels 1-3:
   *  their own theme, looped and kept low. Level 4: the arrival track once, silence from the moment the mala is
   *  taken (Pitaji's scene), Pitaji's theme in the first stage of the fight, the Asura's in the second, silence for
   *  the ending. Unlimited mode: Pitaji's fight theme. Over all of it, the Sands of Time play their own music while
   *  time is slowed (and during Level 2's rewind): the level's theme fades out, then resumes where it left off. */
  updateMusic() {
    const onMenu = !this.isGameStarted && !this.isLoading && !this.intro && this.titleScreen?.classList.contains('active');
    const inGame = this.isGameStarted && !this.isLoading && !this.intro;
    Music.setBase(onMenu ? 'title' : inGame ? this.levelMusic() : null);
    const sands = inGame && (this.sands.active > 0 || (this.level === this.level2 && Boolean(this.level2.rewind)));
    Music.setOverlay(sands ? 'sands' : null);
    Music.setDuck(this.paused ? 0.45 : 1);
  }

  levelMusic() {
    const i = this.currentLevelIndex, L = this.level;
    if (i === 1) return 'level1';
    if (i === 2) return 'level2';
    if (i === 3) return 'level3';
    if (i === 5) return 'pitaji_fight';
    if (i === 4) {
      if (L.ending) return 'reunited';   // the ending: Rakti and Pitaji together, the talk, the embrace, the card
      if (!L.fightStage) return L.malaTaken ? null : 'level4_start';
      if (L.fightStage === 1) return L.cutscene?.kind === 'turn' ? null : 'pitaji_fight';
      if (L.fightStage === 2) return 'demon_fight';
      return null;
    }
    return null;
  }

  /** Title screen: Unlimited mode (endless rounds in one arena). */
  startEndless() {
    if (this.isGameStarted || this.isLoading) return;
    this.slotIndex = null;
    this.beginLoadingTransition(5);
  }

  /** Demo shortcuts (DEMO_JUMPS): loads the level fresh with the story already played up to that moment. The
   *  level's saved progress is set here (before loadLevel's reset); finishDemoJump starts the scene once it is in. */
  demoJump(kind) {
    const index = { sands: 2, trishul: 2, heart: 3, demon: 4, ending: 4 }[kind];
    if (!index || this.isLoading || this.intro) return;
    this.slotIndex = null;          // a test jump never touches a save slot
    Run.difficulty = 'normal';
    this.slots?.hide(false);
    this.closeDialogue();
    this.playerDying = false;
    this.deathScreen?.classList.remove('active');
    this.beginLoadingTransition(index);        // freshStart(): the level from scratch, then the story set below
    this.prologueComplete = true;
    if (index === 2) {
      const L = this.level2, s = L.saved;
      // tower 1's archer is down, the slabs are raised, tower 2's archer is down: the ladder to the hourglass is out
      Object.assign(s, { introDone: true, qUnlocked: true, archerA: true, slabsRaised: true, archerB: true });
      Object.assign(s.said, { intro: true, q: true, slabs: true, ladder: true, quicksand: true });
      L.checkpointIndex = 2;                   // beside tower 2
      if (kind === 'trishul') {
        // ... and the Sands, the way back for the Sun Key and the sun door are done: she stands in the hall
        Object.assign(s, { sandsTaken: true, doorTried: true, rewound: true, archerA2: true, keyTaken: true, door1Open: true, inRoom: true });
        Object.assign(s.said, { wave: true, a2: true, rewound: true, charged: true, ladder1: true, hall: true });
        for (const m of L.returnMembers) s.herdDead[m.id] = true;
        L.checkpointIndex = 3;                 // the hall's entrance
      }
    } else if (index === 3) {
      const L = this.level3;
      L.introQueued = false;                   // no walk in from the forest's edge
      L.kaliHintShown = true;
      L.checkpointIndex = L.checkpoints.length - 1;   // by the forest door
    } else if (index === 4) {
      // the portal, the doubt at the shrine, the mala and the talk with Pitaji are behind her
      Object.assign(this.level4, { arrived: true, doubtTalked: true, malaTaken: true, malaFly: 1, fatherTalked: true, meetWalk: true });
    }
    this.demoSetup = kind;
  }

  /** The second half of demoJump, once the level has loaded: start the moment itself. */
  finishDemoJump(kind) {
    const P = this.player;
    if (kind === 'heart') {
      // the door's ambush is beaten: a moment later the jungle shifts, the heart wakes and its clock starts
      const L = this.level3;
      L.phase = 'ambush';
      L.clearTimer = 0;
      for (const b of L.betals) if (b.wave !== 'return') { b.dead = true; b.removed = true; b.hidden = true; b.entry = null; }
    } else if (kind === 'demon') {
      // Pitaji is beaten: he falls, and the Asura tears out of him (the level's own 'turn' scene, then stage 2)
      const L = this.level4, B = L.boss;
      L.fightStage = 1;
      L.waveIndex = 1;
      L.cutscene = null;
      B.reset(1);
      B.alpha = 1;
      B.x = P.x + 400;
      B.y = L.floorY ?? P.y;
      B.facing = 'left';
      B.setState('walk');
      B.hp = B.stage2Hp;
      L.onBossStageOver(1);
    } else if (kind === 'ending') {
      // the Asura is beaten: he burns away, Pitaji is freed, the embrace, then the level (and the game) ends
      const L = this.level4, B = L.boss;
      L.fightStage = 2;
      L.waveIndex = 2;
      L.cutscene = null;
      B.reset(2);
      B.x = P.x + 300;
      B.facing = 'left';
      B.startStage2();
      B.hp = 0;
      L.onBossStageOver(2);
    }
    this.cameraSnap = true;
  }

  beginLoadingTransition(destinationIndex) {
    if (this.isLoading) return;
    // Arriving in a level from outside (not a death or [R]) clears its checkpoints
    const dest = [null, this.level1, this.level2, this.level3, this.level4, this.levelEndless][destinationIndex];
    dest?.freshStart?.();
    this.isLoading = true;
    this.isGameStarted = false;
    this.loadingTimer = 2.2;
    this.loadingTargetIndex = destinationIndex;
    this.titleScreen?.classList.remove('active');
    this.levelCompleteModal?.classList.remove('active');
    this.hudEl?.classList.add('menu-hidden');
    if (this.loadingLevel) this.loadingLevel.textContent = LEVEL_NAMES[destinationIndex] || '';
    this.loadingScreen?.classList.add('active');
    this.loadingScreen?.setAttribute('aria-hidden', 'false');
  }

  /** [Esc]: freeze the game and show the pause menu. */
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.showRestartConfirm(false);
    this.pauseScreen?.classList.add('active');
    this.pauseScreen?.setAttribute('aria-hidden', 'false');
    document.getElementById('pauseContinue')?.focus({ focusVisible: false });   // [Enter] works, no outline box
  }

  resume() {
    this.paused = false;
    this.pauseScreen?.classList.remove('active');
    this.pauseScreen?.setAttribute('aria-hidden', 'true');
    Input.keysPressed?.clear();      // the click / key that closed the menu is not also a swing or a jump
    Input.keysDown?.clear();
    this.lastTime = performance.now();
  }

  /** A controller in the title and pause menus: up / down (or left / right) moves between the buttons, A presses
   *  the highlighted one, B backs out of the pause menu. True when it used this frame's input. */
  padMenu() {
    const pad = Input.device === 'pad';
    let root = null;
    if (this.settings?.isOpen) root = this.settings.panel;
    else if (this.slots?.isOpen) root = this.slots.panel;
    else if (this.paused) root = this.pauseConfirm && !this.pauseConfirm.hidden ? this.pauseConfirm : this.pauseMain;
    else if (!this.isGameStarted && !this.isLoading && this.titleScreen?.classList.contains('active')) root = this.titleScreen;
    if (this.padRoot !== root) { this.padFocus = 0; this.padRoot = root; this.padFresh = true; }
    for (const b of document.querySelectorAll('.menu-button.pad-focus')) if (!pad || !root || !root.contains(b)) b.classList.remove('pad-focus');
    if (!pad || !root) return false;
    const btns = [...root.querySelectorAll('button.menu-button')].filter((b) => b.offsetParent !== null && !b.disabled);
    if (!btns.length) return false;
    if (this.padFresh) {
      // a menu just opened: start on its chosen device (settings) or the button that has focus (back from settings)
      this.padFresh = false;
      let c = btns.findIndex((b) => b.classList.contains('chosen'));
      if (c < 0) c = btns.indexOf(document.activeElement);
      if (c >= 0) this.padFocus = c;
    }
    const prev = ['PadUp', 'StickUp', 'PadLeft', 'StickLeft'].some((c) => Input.isPressed(c));
    const next = ['PadDown', 'StickDown', 'PadRight', 'StickRight'].some((c) => Input.isPressed(c));
    let i = Math.min(this.padFocus || 0, btns.length - 1);
    if (prev) i = (i - 1 + btns.length) % btns.length;
    if (next) i = (i + 1) % btns.length;
    if ((prev || next) && i !== this.padFocus) Sfx.play('text_pop');
    this.padFocus = i;
    btns.forEach((b, k) => b.classList.toggle('pad-focus', k === i));
    if (Input.isPressed('PadA')) {
      Input.consume('PadA');
      btns[i].click();
      return true;
    }
    if (this.settings?.isOpen && Input.isPressed('PadB')) {
      Input.consume('PadB');
      this.settings.hide();
      return true;
    }
    if (this.slots?.isOpen && Input.isPressed('PadB')) {
      Input.consume('PadB');
      this.slots.back();
      return true;
    }
    if (this.paused && Input.isPressed('PadB')) {
      Input.consume('PadB');
      if (this.pauseConfirm && !this.pauseConfirm.hidden) this.showRestartConfirm(false);
      else this.resume();
      return true;
    }
    return false;
  }

  /** Which controls Settings lists from the pause menu: only what the player has so far in the campaign (the powers
   *  appear as the story gives them), and only what the arena uses in Chaos mode. */
  controlsHave() {
    const i = this.currentLevelIndex, p = this.player;
    if (i === 5) return { attack: true, trishul: true, kali: true, earth: true, sands: true, arena: true };
    return {
      climb: i >= 2,                                   // ladders begin in Level 2
      ledge: true,
      attack: !p.isCivilian,                           // not before the blade (Level 1's prologue)
      trishul: Boolean(p.hasTrishul),
      kali: Boolean(p.hasDivineUnlocked),
      earth: i === 2 ? Boolean(this.level2?.progress?.qUnlocked) : i >= 3 && Boolean(p.hasPearl),
      sands: Boolean(p.hasSands),
      story: true
    };
  }

  /** Restart asks first: true shows "Are you sure?", false goes back to the three buttons. */
  showRestartConfirm(show) {
    if (this.pauseMain) this.pauseMain.hidden = show;
    if (this.pauseConfirm) this.pauseConfirm.hidden = !show;
    const txt = document.getElementById('pauseConfirmText');
    if (txt) txt.textContent = this.currentLevelIndex === 5
      ? 'Chaos mode starts over from round one. Your current run will be lost.'
      : 'You will go back to the very start of this level. All progress in it, and its checkpoints, will be lost.';
    document.getElementById(show ? 'pauseNo' : 'pauseContinue')?.focus({ focusVisible: false });
  }

  /** Restart (confirmed): back to the very start of the level (or round one of the arena), whatever was done. */
  restartFromStart() {
    const i = this.currentLevelIndex;
    this.resume();
    this.closeDialogue();
    this.playerDying = false;
    this.deathScreen?.classList.remove('active');
    if (i === 1) {
      // Level 1 starts with the wake-up again
      this.prologueComplete = false;
      this.level1.checkpointIndex = -1;
      this.level1.abilityGranted = false;
      this.level1.bridgeTold = false;
      this.level1.lessonHeard = false;
      this.level1.relicKept = false;
      this.level1.leverKept = false;
      this.level1.relicTalked = false;
    }
    this.beginLoadingTransition(i);   // freshStart(): checkpoints and story flags cleared
  }

  /** The hum for the item Rakti needs next: silent far away, louder the closer she gets. */
  updateItemAura() {
    const item = this.level.crucialItem?.();
    if (!item || this.player.isDead) return;
    const dx = this.player.x - item.x, dy = (this.player.y - item.y) * 0.5;
    const strength = Math.max(0, Math.min(1, (AURA_RANGE - Math.hypot(dx, dy)) / (AURA_RANGE - AURA_CLOSE)));
    if (strength > 0) Sfx.hold('item_aura', strength);
  }

  returnToTitle() {
    this.autosave(true);          // leaving the campaign: the slot is up to date
    this.slotIndex = null;
    this.isGameStarted = false;
    this.paused = false;
    this.pauseScreen?.classList.remove('active');
    this.levelCompleteModal?.classList.remove('active');
    this.closeDialogue();
    this.titleScreen?.classList.add('active');
    this.hudEl?.classList.add('menu-hidden');
    this.endlessHud?.classList.remove('active');
  }

  update(dt) {
    // Music: the start menu's theme, each level's own, the fights', and the Sands of Time over them (updateMusic)
    this.updateMusic();
    // The opening cutscene (after New Game): nothing else runs while it plays
    if (this.intro) { this.updateIntroCutscene(dt); return; }
    // Settings open (over the title screen or the pause menu): only it takes input; [Esc] or B closes it
    if (this.settings?.isOpen) {
      this.padMenu();
      if (Input.isPressed('Escape')) this.settings.hide();
      return;
    }
    // The campaign's save slots (over the title screen): [Esc] or B goes back a step
    if (this.slots?.isOpen) {
      this.padMenu();
      if (Input.isPressed('Escape')) this.slots.back();
      return;
    }
    // a controller in the title and pause menus
    if (this.padMenu()) return;
    // the run's clock: story levels only, while actually playing
    if (this.isGameStarted && !this.isLoading && !this.paused && !this.levelCompleted
        && this.currentLevelIndex >= 1 && this.currentLevelIndex <= 4) {
      this.runStats.time += dt;
      this.saveClock += dt;
      if (this.saveClock >= 1) this.autosave();
    }
    if (this.isLoading) {
      this.loadingTimer -= dt;
      const artReady = AssetWatch.pending(this.loadingTargetIndex) === 0 || this.loadingTimer < -LOADING_MAX_WAIT;
      if (this.loadingTimer <= 0 && artReady) {
        const destinationIndex = this.loadingTargetIndex;
        this.isLoading = false;
        this.loadingTargetIndex = null;
        this.loadingScreen?.classList.remove('active');
        this.loadingScreen?.setAttribute('aria-hidden', 'true');
        if (destinationIndex) {
          this.loadLevel(destinationIndex);
          this.hudEl?.classList.remove('menu-hidden');
          if (this.demoSetup) { this.finishDemoJump(this.demoSetup); this.demoSetup = null; }
        }
      }
      this.updateCamera(dt);
      return;
    }

    if (!this.isGameStarted) {
      if (this.titleScreen?.classList.contains('active')) {
        for (const [code, kind] of Object.entries(DEMO_JUMPS)) if (Input.isPressed(code)) { this.demoJump(kind); break; }
      }
      if (Input.isPressed('enter') || Input.isPressed('space')) {
        this.openCampaign();
      }
      this.updateCamera(dt);
      return;
    }

    // [Esc] pauses (story and unlimited mode); while paused nothing moves. [Esc] again resumes (or backs out of
    // the restart question).
    if (this.paused) {
      if (Input.isPressed('Escape')) {
        if (this.pauseConfirm && !this.pauseConfirm.hidden) this.showRestartConfirm(false);
        else this.resume();
      }
      return;
    }
    if (Input.isPressed('Escape') && !this.playerDying && !this.levelCompleted) {
      this.pause();
      return;
    }

    // Dialogue: the text types out while the speaker's portrait talks, then idles (with blinks) or holds a gesture
    if (this.dialogueActive && this.dlg) this.updateDialogue(dt);

    // Levels 1, 2 and 3 continue automatically after their completion card (AUTO_CONTINUE s), while
    // still allowing the player to enter the next level immediately with E or Space.
    if (this.currentLevelIndex >= 1 && this.currentLevelIndex <= 3 && this.levelCompleted) {
      const nextLevel = this.currentLevelIndex + 1;
      this.levelTransitionTimer -= dt;
      if (this.completePrompt) {
        const seconds = Math.max(0, Math.ceil(this.levelTransitionTimer));
        this.completePrompt.textContent = `[E] CONTINUE TO LEVEL ${nextLevel}  •  AUTO IN ${seconds}s`;
      }
      if (this.levelTransitionTimer <= 0 || Input.isPressed('interact') || Input.isPressed('space')) {
        this.beginLoadingTransition(nextLevel);
        return;
      }

      this.player.updateParticles(dt);
      this.updateCamera(dt);
      this.updateHUD();
      return;
    }

    // Level 3 intentionally advances through a scripted defeat. Let its own
    // fade and epilogue run instead of triggering the regular checkpoint reset.
    if (this.currentLevelIndex === 3 && this.level.usesScriptedDefeat !== false && this.player.hp <= 0) {
      this.closeDialogue();
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.isDead = true;
      this.player.updateParticles(dt);
      this.level.update(this.player.x, this.player.y, dt, this.player.isDivine, this.player);
      this.updateCamera(dt);
      this.updateHUD();

      if (this.level.proceedToLevel4 || (
        this.level.epilogueAlpha > 0.6 &&
        (Input.isPressed('interact') || Input.isPressed('space'))
      )) {
        this.beginLoadingTransition(4);
      }
      return;
    }

    // 0. Check Player 0 HP Defeat
    if (this.player.hp <= 0 && !this.playerDying) {
      this.handlePlayerDeath();
      return;
    }

    if (this.playerDying) {
      this.player.updateParticles(dt);
      this.updateCamera(dt);
      return;
    }

    // Testing shortcuts: [U] Level 1, [I] Level 2, [O] Level 3, [P] Level 4 (each starts the level fresh)
    const devKeys = DEV_KEYS ? { KeyU: 1, KeyI: 2, KeyO: 3, KeyP: 4 } : {};
    for (const [code, index] of Object.entries(devKeys)) {
      if (Input.isPressed(code)) {
        this.slotIndex = null;      // a test jump never touches a save slot
        Run.difficulty = 'normal';
        this.beginLoadingTransition(index);
        return;
      }
    }
    for (const [code, kind] of Object.entries(DEMO_JUMPS)) {
      if (Input.isPressed(code)) { this.demoJump(kind); return; }
    }


    // (The [R] restart shortcut is removed for now: Restart is in the pause menu.)

    // Morph Object Ability [Q] (Level 2 only - completely disabled in round 1)
    if ((Input.isPressed('morph') || Input.isPressed('q')) && !this.dialogueActive) {
      if (this.level.castQ) {
        // Levels with Kali's earth power decide what answers (Level 2: boulders and floating stones)
        this.level.castQ(this.player);
      } else if (this.currentLevelIndex === 2 && this.level.triggerMorph) {
        const morphed = this.level.triggerMorph(this.player.x, this.player.y);
        if (morphed) {
          this.openDialogue(this.level.lastMorphMessage || "Transmutation unleashed! The sacred stone transforms into an unstoppable rolling sphere!", 'kali', '⚜ MAA KALI: TRANSMUTATION ⚜');
        }
      }
    }

    // Sands of Time [F]
    if (Input.isPressed('KeyF') && !this.dialogueActive) this.trySands();

    // 1. Check nearby inspection points (none while a cutscene animation plays)
    const inCutscene = this.player.isWaking || this.player.isChangingOutfit;
    const nearby = inCutscene ? null : this.level.getNearbyInteractable(this.player.x, this.player.y);
    this.currentInteractable = nearby;

    if (this.interactPrompt) {
      if (nearby && !this.dialogueActive && !this.levelCompleted) {
        if (this.interactPromptText && nearby.prompt) {
          this.interactPromptText.textContent = nearby.prompt;
        }
        this.interactPrompt.style.display = 'block';
      } else {
        this.interactPrompt.style.display = 'none';
      }
    }

    // 2. Handle [E] / [Enter] to interact, pull lever, open chest, or unlock door.
    // Z is reserved for strike so attacking near a landmark never activates it.
    // (a controller's A also moves a conversation on, and that press is not also a jump)
    const padNext = this.dialogueActive && Input.isPressed('PadA');
    if (padNext) Input.consume('PadA');
    if (Input.isPressed('interact') || padNext || (this.levelCompleted && Input.isPressed('space'))) {
      if (this.levelCompleted) {
        if (this.currentLevelIndex === 1) {
          this.beginLoadingTransition(2);
          return;
        } else if (this.currentLevelIndex === 2) {
          this.beginLoadingTransition(3);
          return;
        } else if (this.currentLevelIndex === 3) {
          this.beginLoadingTransition(4);
          return;
        } else if (this.currentLevelIndex === 4) {
          this.returnToTitle();
          return;
        } else {
          this.resetGame();
          return;
        }
      }

      if (this.dialogueActive) {
        this.advanceDialogue();
      } else if (nearby) {
        // LEVEL 1 PROLOGUE: touching Maa Kali's idol changes Rakti into her battle outfit
        if (nearby.type === 'kali_idol') {
          this.level.idolBlessed = true;
          this.level.idolGlow = 1.8;
          this.player.startOutfitChange();
        }
        // LEVEL 1: claiming the relic in the shrine opens the door to Level 2
        else if (nearby.type === 'relic' && !this.level.relic.collected) {
          this.level.collectRelic(this.player);
          let text = nearby.text;
          if (this.currentLevelIndex === 3 && this.level.relic.collected) {
            this.grantForestHeart();
            text += ' It strengthens you too: your talwar and my Trishul strike twice as hard, and your life burns stronger.';
          }
          this.openDialogue(text, 'kali', nearby.title || '⚜ PEARL OF THE TIDE ⚜');
        }
        // LEVEL 1: Sacred Lotus Awakening (Unlocks X ability - Taught by Maa Kali)
        else if (nearby.type === 'lotus_awakening' || nearby.id === 'sacred_lotus') {
          this.player.hasDivineUnlocked = true;
          this.openDialogue(nearby.text, 'kali', nearby.title || '⚜ DIVINE AWAKENING: MAA KALI ⚜');
          const flash = document.getElementById('divineFlash');
          if (flash) {
            flash.classList.add('active');
            setTimeout(() => flash.classList.remove('active'), 250);
          }
        }
        // LEVEL 1: Lever Interaction
        else if (nearby.type === 'lever' && !this.level.lever.activated) {
          this.level.pullLever();
          if (this.level.leverMessage) {
            this.openDialogue(this.level.leverMessage, 'kali', '⚜ THE PORTAL OPENS ⚜');
          } else {
            this.openDialogue("You pull the ancient mechanism. Deep tremors reverberate through the temple as the sacred stone pillar rises from the depths!");
          }
        }
        // LEVEL 2: Chest Interaction (Obtain Sanctum Key)
        else if (nearby.type === 'chest' && !this.level.chest.opened) {
          if (!this.level.chest.unlocked) {
            this.openDialogue("The cache seal is still active. The sentinel archer above must be defeated first.", 'stele', '⚜ LIVING SEAL ⚜');
          } else {
            this.level.chest.opened = true;
            this.player.hasKey = true;
            this.openDialogue("The sentinel's destruction has broken the cache seal! You claim the [SANCTUM KEY]! A second stone waits over the lower chasm.", 'kali', '⚜ SANCTUM KEY ACQUIRED ⚜');
          }
        }
        // LEVEL 2: Locked Door Interaction
        else if (nearby.type === 'locked_door') {
          if (this.level.lockedDoor?.unlocked) {
            this.openDialogue("The sanctum gate stands unsealed. Step boldly into the dark passage to conquer the catacombs.", 'kali', '⚜ SANCTUM OPEN ⚜');
          } else if (this.level.canUnlockDoor?.()) {
            this.level.lockedDoor.unlocked = true;
            this.level.cameraShake = 0.8;
            this.openDialogue("With the sentinel archer eliminated, the sanctum padlock shatters and the ancient gates slide open!", 'kali', '⚜ SANCTUM UNSEALED ⚜');
          } else {
            this.openDialogue("The colossal sanctum gate is barred by an enchanted ward. Eliminate the sentinel archer above to shatter the seal.", 'kali', '⚜ SANCTUM WARD ACTIVE ⚜');
          }
        }
        // LEVEL 3: Sanctum key objective
        else if (nearby.type === 'key' && !this.level.keyAltar.collected) {
          this.level.keyAltar.collected = true;
          this.level.hasKey = true;
          this.level.hubrisStage = 2;
          this.level.cameraShake = 0.5;
          this.player.hasKey = true;
          this.openDialogue(nearby.text, 'kali', '⚜ SANCTUM KEY ACQUIRED ⚜');
        }
        // LEVEL 3: Ancient egg objective starts the horde escalation
        else if (nearby.type === 'egg' && !this.level.ancientEgg.harvested) {
          this.level.ancientEgg.harvested = true;
          this.level.hasEgg = true;
          this.level.hubrisStage = 3;
          this.level.levelTime = 0;
          this.level.goblinSpawnTimer = 1.4;
          this.level.archerSpawnTimer = 0;
          this.level.cameraShake = 1.0;
          this.openDialogue(nearby.text, 'kali', '⚜ THE HORDE AWAKENS ⚜');
        }
        // LEVEL 3: The sealed maw is a narrative landmark, not an exit.
        else if (nearby.type === 'maw_door') {
          this.level.cameraShake = 0.6;
          this.openDialogue(nearby.text, 'stele', '⚜ THE SEALED MAW ⚜');
        }
        // General text landmark
        else {
          nearby.onInteract?.(this.player);
          this.openDialogue(nearby.text, nearby.speaker || 'stele', nearby.title);
        }
      }
    } else if (Input.isPressed('cancel')) {
      if (this.dialogueActive) {
        // [C] skips the whole conversation ([Esc] pauses), but its outcome (e.g. the blessing) still happens
        Input.consume('PadBack');   // (on a controller the same button restarts at the checkpoint: not this time)
        this.skipConversation();
      }
    }

    // 3. Update player and level (passes player for enemy & hazard collision)
    // Rakti's on-screen x (CSS pixels) so mouse-aimed attacks face the cursor correctly.
    this.player.screenX = (this.player.x - this.camX) * this.zoom;
    // where the cursor is in the world (the Trishul can be thrown at it)
    this.player.aimWorld = { x: Input.mouseX / this.zoom + Math.floor(this.camX), y: Input.mouseY / this.zoom + Math.floor(this.camY) };
    if (Input.device === 'pad') {
      // a controller aims with the right stick (300 px out from her chest); no stick = straight ahead
      const a = Input.aim, m = Math.hypot(a.x, a.y) || 1;
      this.player.aimWorld = a.active ? { x: this.player.x + (a.x / m) * 300, y: this.player.y - 30 + (a.y / m) * 300 } : null;
    }
    this.player.update(dt, this.level, this.dialogueActive);
    this.level.dialogueOpen = this.dialogueActive;   // a level can hold a story beat until Kali has finished speaking
    this.level.update(this.player.x, this.player.y, this.worldDt(dt), this.player.isDivine, this.player);
    Sfx.listenerX = this.player.x;
    this.updateItemAura();

    // Levels that move Rakti between areas (Level 2's door into the sun hall) ask for a camera cut
    if (this.level.requestCameraSnap) {
      this.level.requestCameraSnap = false;
      this.cameraSnap = true;
    }

    // Levels can ask for a story dialogue (e.g. Level 1: Kali grants her form near the lever tower)
    const p = this.player;
    // Story lines open as soon as Rakti is on solid ground (running is fine: she simply stops). They still wait
    // out a jump, a climb or a transformation, which is only a moment.
    const ready = p.isGrounded && !p.isClimbing && !p.climbTransition && !p.isTransforming && !p.isReverting
      && !p.isCasting && !p.throwAnim && !p.inputLocked;
    const pend = this.level.pendingDialogue;
    if (pend && !this.dialogueActive && (ready || (pend.whenLocked && p.isGrounded))) {
      const d = pend;
      this.level.pendingDialogue = null;
      p.vx = 0;   // she stops where she is while the line plays
      if (d.lines) this.openConversation(d.lines, d.onDone, d.title);
      else this.openDialogue(d.text, d.speaker || 'kali', d.title, d.gesture, d.portrait);
      if (d.flash) {
        const flash = document.getElementById('divineFlash');
        if (flash) {
          flash.classList.add('active');
          setTimeout(() => flash.classList.remove('active'), 250);
        }
      }
    }

    // The prologue ends once the outfit change has finished (the HUD then fades in).
    if (this.currentLevelIndex === 1 && !this.prologueComplete && this.level.idolBlessed && !this.player.isCivilian) {
      this.prologueComplete = true;
    }

    // 4. Check Level Complete (Walking into Black Space Doorway)
    if (!this.levelCompleted && this.level.checkLevelComplete(this.player.x, this.player.y)) {
      this.levelCompleted = true;
      this.showLevelCompleteModal();
      if (this.currentLevelIndex >= 1 && this.currentLevelIndex <= 3) this.levelTransitionTimer = AUTO_CONTINUE;
    }

    if (this.levelCompleted && this.player.doorwayFade > 0) {
      this.player.doorwayFade = Math.max(0, this.player.doorwayFade - dt * 2.2);
    }

    // 5. Update Camera viewport
    this.updateCamera(dt);

    // 6. Update HUD Elements (HP, Divine, Key, Morph)
    this.updateHUD();
  }

  showLevelCompleteModal() {
    if (!this.levelCompleteModal) return;
    this.closeDialogue();   // no dialogue box left open behind the card

    if (this.currentLevelIndex === 1) {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 1 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'DROWNED DWARAKA CLEARED';
      if (this.completeFlavor) this.completeFlavor.textContent = 'The Pearl of the Tide hums in your hands as the portal takes you.';
      if (this.completePrompt) this.completePrompt.textContent = `[E] CONTINUE TO LEVEL 2  •  AUTO IN ${AUTO_CONTINUE}s`;
    } else if (this.currentLevelIndex === 2) {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 2 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'SURYA MANDIR CLEARED';
      if (this.completeFlavor) this.completeFlavor.textContent = 'The Trishul, second of the four relics, hums at your side as the portal opens onto Vrindavan.';
      if (this.completePrompt) this.completePrompt.textContent = `[E] CONTINUE TO LEVEL 3  •  AUTO IN ${AUTO_CONTINUE}s`;
    } else if (this.currentLevelIndex === 3) {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 3 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'VRINDAVAN CLEARED';
      if (this.completeFlavor) this.completeFlavor.textContent = 'The Forest Heart beats in your hands as the portal opens onto Indraprastha.';
      if (this.completePrompt) this.completePrompt.textContent = `[E] CONTINUE TO LEVEL 4  •  AUTO IN ${AUTO_CONTINUE}s`;
    } else {
      // the end of the game: the framed ending card
      if (this.completeTitle) this.completeTitle.textContent = 'THE REALMS ARE SAVED';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'THE FOUR RELICS ARE WHOLE  ·  THE RIFT IS SEALED';
      if (this.completeFlavor) this.completeFlavor.textContent = 'Rakti crossed four broken realms, freed her father from the Asura and sealed the rift with Maa Kali\'s relics. The sea is calm over Dwaraka again, and the two of them are going home.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] RETURN TO TITLE';
    }
    const final = this.currentLevelIndex === 4;
    if (final) this.autosave(true);     // the slot is marked completed, with the run's time and deaths
    // every level's card uses the same gold-framed design as the death card (the 'final' class is that frame)
    this.levelCompleteModal.classList.add('final');
    const thanks = document.getElementById('completeThanks');
    if (thanks) thanks.textContent = final ? 'THANKS FOR WATCHING' : '';
    // the ending card: the run's statistics
    const stats = document.getElementById('completeStats');
    if (stats) {
      stats.hidden = !final;
      if (final) {
        const t = Math.floor(this.runStats.time), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
        const time = h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
        document.getElementById('statTime').textContent = time;
        document.getElementById('statDeaths').textContent = String(this.runStats.deaths);
      }
    }

    this.levelCompleteModal.classList.add('active');
  }

  // ======================================================================== Sands of Time [F]
  /** [F]: a level may spend the sands on its own story first (Level 2: rewinding the boulder at the first
   *  tower); otherwise the world slows around Rakti for SANDS_DURATION s. */
  trySands() {
    const p = this.player, s = this.sands;
    if (!p.hasSands || p.isDead || p.inputLocked || this.playerDying || this.levelCompleted) return;
    if (this.level.useSands?.(p)) return;
    if (s.active > 0) return;
    if (s.cooldown > 0) {
      // not yet: the hourglass shakes
      this.sandsEl?.classList.remove('denied');
      void this.sandsEl?.offsetWidth;
      this.sandsEl?.classList.add('denied');
      return;
    }
    s.active = SANDS_DURATION;
    s.ripple = 1;
    Sfx.play('morph', { volume: 0.6 });
    if (this.level) this.level.cameraShake = Math.max(this.level.cameraShake || 0, 0.25);
    this.level.killToastText = '⏳ SANDS OF TIME';
    this.level.killToastTimer = 1.4;
  }

  /** The level's clock this frame: slowed by the sands (never during a cutscene) and sped up by the level's
   *  own rules (Level 2's quickened desert). Ticks the sands' timers too. The level also gets the real dt. */
  worldDt(dt) {
    const s = this.sands, p = this.player;
    if (!this.dialogueActive) {
      if (s.active > 0) {
        s.active = Math.max(0, s.active - dt);
        if (s.active === 0) s.cooldown = SANDS_COOLDOWN;
      } else if (s.cooldown > 0) {
        s.cooldown = Math.max(0, s.cooldown - dt);
        if (s.cooldown === 0) {
          this.sandsEl?.classList.remove('flip');
          void this.sandsEl?.offsetWidth;
          this.sandsEl?.classList.add('flip');   // the hourglass turns over: ready again
        }
      }
    }
    const slowed = s.active > 0 && !p.inputLocked;
    s.fx += ((slowed ? 1 : 0) - s.fx) * Math.min(1, dt * 5);
    if (s.ripple > 0) s.ripple = Math.max(0, s.ripple - dt * 1.6);
    this.level.realDt = dt;
    this.level.sandsActive = slowed;
    return dt * (slowed ? SANDS_SLOW : 1) * (this.level.worldTimeScale?.() ?? 1);
  }

  /** Golden haze, drifting grains and a ripple from Rakti while time is slowed (screen space). */
  renderSands(ctx) {
    const s = this.sands, a = s.fx;
    if (a < 0.02 && s.ripple <= 0) return;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.save();
    if (a > 0.02) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = `rgba(255, 196, 110, ${0.55 * a})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
      g.addColorStop(0, 'rgba(0, 0, 0, 0)');
      g.addColorStop(1, `rgba(96, 58, 12, ${0.5 * a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // grains drifting slowly across the view
      const G = s.grains;
      while (G.length < 70) G.push({ x: Math.random() * W, y: Math.random() * H, v: 8 + Math.random() * 18, r: 0.8 + Math.random() * 1.6, ph: Math.random() * 6 });
      const t = performance.now() / 1000;
      for (const q of G) {
        q.x += q.v * 0.016; q.y += q.v * 0.006;
        if (q.x > W + 4) q.x = -4; if (q.y > H + 4) q.y = -4;
        ctx.fillStyle = `rgba(255, 214, 140, ${(0.35 + 0.3 * Math.sin(t * 2 + q.ph)) * a})`;
        ctx.fillRect(q.x, q.y, q.r * this.zoom * 0.6, q.r * this.zoom * 0.6);
      }
    }
    if (s.ripple > 0) {
      // the moment the sands turn: a ring of light spreads out from Rakti
      const px = (this.player.x - Math.floor(this.camX)) * this.zoom, py = (this.player.y - 40 - Math.floor(this.camY)) * this.zoom;
      const u = 1 - s.ripple, R = (30 + u * 700) * (this.zoom / 1.6);
      ctx.strokeStyle = `rgba(255, 222, 150, ${0.7 * s.ripple})`;
      ctx.lineWidth = 6 * s.ripple + 1;
      ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  resetGame() {
    this.loadLevel(this.currentLevelIndex);
  }

  handlePlayerDeath() {
    this.playerDying = true;
    // a death in the campaign counts for the ending card (the Forest Heart withering is not Rakti's death)
    if (this.currentLevelIndex >= 1 && this.currentLevelIndex <= 4 && !this.level?.deathCard?.()) this.runStats.deaths += 1;
    this.closeDialogue();
    if (this.level) this.level.cameraShake = 1.0;
    this.player.spawnDeathBurst();
    // What a death costs: Normal, back to the last checkpoint; Hard, the level from its very start; Hardcore, the
    // run is over. (A level's own card, Level 3's withered heart, is not Rakti's death: it is always the Normal way.)
    const mode = this.level?.deathCard?.() ? 'normal' : Run.mode;

    if (this.deathScreen) {
      const small = document.getElementById('deathSmall');
      const big = this.deathScreen.querySelector('.death-big');
      // a level can word the card itself (Level 3: the Forest Heart withered before she reached it)
      const card = this.level?.deathCard?.();
      if (big) big.textContent = card?.big || (mode === 'hardcore' ? 'THE GUARDIAN HAS FALLEN' : "IT'S NOT OVER YET");
      if (small) small.textContent = card?.small || (this.currentLevelIndex === 5 ? 'Rising again in the arena'
        : mode === 'hardcore' ? 'Hardcore: the journey begins again from Drowned Dwaraka'
        : mode === 'hard' ? 'Hard: back to the start of the level'
        : 'Respawning at the last checkpoint');
      this.deathScreen.classList.toggle('withered', Boolean(card));
      this.deathScreen.classList.add('active');
    }

    // After a short pause (long enough to read the card), respawn at the last checkpoint with full health
    setTimeout(() => {
      this.playerDying = false;
      this.deathScreen?.classList.remove('active');
      if (mode === 'hardcore') { this.endHardcoreRun(); return; }
      if (mode === 'hard') {
        // the level from scratch (Level 1 does not replay the wake-up and Kali's first test once they are done)
        const i = this.currentLevelIndex, tested = i === 1 && this.level1.testDone;
        this.level.freshStart?.();
        if (tested) this.level1.testDone = true;
      }
      this.loadLevel(this.currentLevelIndex);
      this.autosave(true);
    }, mode === 'hardcore' ? 3200 : 1900);
  }

  /** Hardcore: a death ends the run. The slot goes back to Level 1 (its attempt count goes up) and the title screen
   *  returns: the player begins again from there. */
  endHardcoreRun() {
    const slot = this.slotIndex;
    if (slot !== null) {
      const old = Saves.get(slot);
      Saves.write(slot, Saves.fresh('hardcore', (old?.attempts || 1) + 1));
    }
    this.slotIndex = null;          // (nothing more to save from this run)
    for (const L of [this.level1, this.level2, this.level3, this.level4]) L.freshStart?.();
    this.player.hp = this.player.maxHp;
    this.player.isDead = false;
    this.returnToTitle();
  }

  updateCamera(dt) {
    // Levels may extend left of x=0 (Level 1's prologue); minX is their left edge.
    const minX = this.level.minX || 0;
    const scaleX = this.canvas.width / (this.level.width - minX);
    const scaleY = this.canvas.height / this.level.height;
    this.zoom = Math.max(scaleX, scaleY);

    const viewW = this.canvas.width / this.zoom;
    const viewH = this.canvas.height / this.zoom;

    let targetX = this.player.x - viewW / 2;
    let targetY = this.player.y - viewH / 2 - 20;
    // a level can frame something else for a moment (Level 4: her father on the throne, the reunion)
    const focus = this.level.cameraFocus?.(this.dialogueActive && this.convo ? this.convo.lines[this.convo.i] : null);
    if (focus) { targetX = focus.x - viewW / 2; targetY = focus.y - viewH / 2; }

    const maxCamX = Math.max(minX, this.level.width - viewW);
    const maxCamY = Math.max(0, this.level.height - viewH);

    targetX = Math.max(minX, Math.min(targetX, maxCamX));
    targetY = Math.max(0, Math.min(targetY, maxCamY));

    if (this.level.snapCamera) { this.cameraSnap = true; this.level.snapCamera = false; }   // a level's scene cut (fade)
    if (this.cameraSnap) {
      // Jump straight to the player after a level load instead of panning across the map.
      this.camX = targetX;
      this.camY = targetY;
      this.cameraSnap = false;
    }
    const t = 1.0 - Math.exp(-6.5 * dt);
    this.camX += (targetX - this.camX) * t;
    this.camY += (targetY - this.camY) * t;

    // Apply Screen Shake when lever activates, scorpion attacks, or boulder crashes
    if (this.level.cameraShake > 0) {
      const shakeMag = this.level.cameraShake * 6.0;
      this.camX += (Math.random() - 0.5) * shakeMag;
      this.camY += (Math.random() - 0.5) * shakeMag;
    }
  }

  updateHUD() {
    if (!this.hudEl || !this.player) return;

    // No HUD while Rakti is still in her sari (Level 1 prologue); it fades in after the outfit change.
    this.hudEl.classList.toggle('prologue-hidden', Boolean(this.player.isCivilian));

    const hpRatio = Math.max(0, Math.min(1, this.player.hp / this.player.maxHp));
    // Medallion portrait: Kali's face while Rakti is in Kali form [X]; otherwise Rakti, bruised below half health
    const kaliPortrait = Boolean(this.player.isDivine || this.player.isTransforming);
    const portrait = kaliPortrait ? 'kali' : (this.player.hp < this.player.maxHp / 2 ? 'hurt' : 'rakti');
    if (this.hudPortraitArt && portrait !== this.hudPortraitKind) {
      this.hudPortraitArt.src = {
        kali: 'assets/ui/hud/kali_medallion.png',
        hurt: 'assets/ui/hud/rakti_medallion_hurt.png',
        rakti: 'assets/ui/hud/rakti_medallion.png'
      }[portrait];
      this.hudPortraitArt.alt = { kali: 'Rakti in Kali form', hurt: 'Rakti, hurt', rakti: 'Rakti at full health' }[portrait];
      // switching to or from Kali: the medallion flares
      if (this.hudPortraitKind && (portrait === 'kali' || this.hudPortraitKind === 'kali')) {
        this.hudPortraitArt.classList.remove('medallion-swap');
        void this.hudPortraitArt.offsetWidth;
        this.hudPortraitArt.classList.add('medallion-swap');
      }
      this.hudPortraitKind = portrait;
    }
    // HUD writes only happen when a value actually changes (rewriting the DOM every frame forces restyles)
    const put = (el, key, value, apply) => {
      if (!el) return;
      const memo = el.__hudMemo || (el.__hudMemo = {});
      if (memo[key] === value) return;
      memo[key] = value;
      apply(value);
    };
    put(this.healthBarFill, 'w', `${(hpRatio * 100).toFixed(1)}%`, v => { this.healthBarFill.style.width = v; });
    put(this.healthTrack, 'max', String(this.player.maxHp), v => this.healthTrack.setAttribute('aria-valuemax', v));
    put(this.healthTrack, 'now', String(Math.max(0, Math.ceil(this.player.hp))), v => this.healthTrack.setAttribute('aria-valuenow', v));
    put(this.hpNum, 'text', `${this.player.hp} / ${this.player.maxHp}`, v => { this.hpNum.textContent = v; });

    const divineUnlocked = this.player.hasDivineUnlocked;
    const divineActive = this.player.isDivine || this.player.isTransforming;
    const charging = this.player.chargeMode && !divineActiveNow(this.player);
    const divineRatio = this.player.isTransforming
      ? 1
      : this.player.isDivine
        ? Math.max(0, Math.min(1, this.player.divineTimer / this.player.divineDuration))
        : charging ? Math.max(0, Math.min(1, this.player.divineCharge)) : 1;
    const divinePercent = divineUnlocked ? divineRatio * 100 : 0;

    put(this.divineBarFill, 'w', `${divinePercent.toFixed(1)}%`, v => { this.divineBarFill.style.width = v; });
    put(this.divineTrack, 'now', String(Math.round(divinePercent)), v => this.divineTrack.setAttribute('aria-valuenow', v));
    put(this.divineTrack, 'text', !divineUnlocked
      ? 'X ability locked'
      : divineActive
        ? `${Math.ceil(this.player.divineTimer)} seconds remain`
        : charging && this.player.divineCharge < 1 ? 'X ability charging' : 'X ability ready', v => this.divineTrack.setAttribute('aria-valuetext', v));
    if (this.divineMeter) {
      this.divineMeter.classList.toggle('charging', charging && this.player.divineCharge < 1);
      this.divineMeter.classList.toggle('charged', charging && this.player.divineCharge >= 1);
      this.divineMeter.classList.toggle('denied', (this.player.chargeDenied || 0) > 0);
      this.divineMeter.classList.toggle('locked', !divineUnlocked);
      this.divineMeter.classList.toggle('active', divineActive);
    }
    // The X ability bar only appears once Rakti has been given Kali's form
    this.abilityBarEl = this.abilityBarEl || document.getElementById('abilityBar');
    put(this.abilityBarEl, 'shown', String(divineUnlocked), v => this.abilityBarEl?.classList.toggle('ability-hidden', v !== 'true'));
    this.hudEl.classList.toggle('divine-mode', divineActive);

    // Sands of Time [F]: the hourglass beside the X bar (hidden until Rakti has it). Active: the sand runs through
    // the six frames; cooldown: dimmed and empty, with the seconds left; ready: full and glowing.
    if (this.sandsEl) {
      const s = this.sands, has = Boolean(this.player.hasSands) && !this.player.isCivilian;
      put(this.sandsEl, 'has', String(has), v => this.sandsEl.classList.toggle('locked', v !== 'true'));
      const state = s.active > 0 ? 'active' : s.cooldown > 0 ? 'cooldown' : 'ready';
      put(this.sandsEl, 'state', state, v => { this.sandsEl.dataset.state = v; });
      const frame = state === 'active' ? Math.min(5, Math.floor((1 - s.active / SANDS_DURATION) * 6)) : state === 'cooldown' ? 5 : 0;
      put(this.sandsEl, 'frame', String(frame), v => { this.sandsGlass.style.backgroundPosition = `${Number(v) * 20}% 0`; });
      const label = state === 'active' ? String(Math.ceil(s.active)) : state === 'cooldown' ? String(Math.ceil(s.cooldown)) : '';
      put(this.sandsEl, 'time', label, v => { this.sandsTime.textContent = v; });
      // Level 2's rewind charge (enemies of the way back slain / all of them)
      const ch = has ? this.level?.sandsCharge?.() : null;
      this.sandsChargeEl = this.sandsChargeEl || document.getElementById('sandsCharge');
      put(this.sandsEl, 'charge', ch ? (ch.ready ? 'ready' : `${ch.have}/${ch.need}`) : '', v => {
        if (!this.sandsChargeEl) return;
        this.sandsChargeEl.textContent = v === 'ready' ? '⟲ CHARGED' : v ? `⟲ ${v}` : '';
        this.sandsChargeEl.classList.toggle('show', Boolean(v));
        this.sandsChargeEl.classList.toggle('ready', v === 'ready');
      });
    }

    // Level 3: the Forest Heart's clock v2: 50 ticks go dark one per second (green -> amber -> red), the heart
    // in the medallion beats faster and turns into the red heart as it withers, the plaque shows m:ss
    this.heartClockEl = this.heartClockEl || document.getElementById('heartClock');
    const hc = this.isGameStarted && !this.levelCompleted ? this.level?.heartClockHud?.() : null;
    if (this.heartClockEl) {
      if (!this.heartTicks) {
        // the 50 ticks, built once
        const g = document.getElementById('heartClockTicks');
        this.heartTicks = [];
        for (let i = 0; i < 50; i++) {
          const a = (i / 50) * Math.PI * 2 - Math.PI / 2;
          const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          l.setAttribute('x1', (60 + Math.cos(a) * 51).toFixed(2)); l.setAttribute('y1', (60 + Math.sin(a) * 51).toFixed(2));
          l.setAttribute('x2', (60 + Math.cos(a) * 57.5).toFixed(2)); l.setAttribute('y2', (60 + Math.sin(a) * 57.5).toFixed(2));
          l.setAttribute('class', 'hc-tick');
          g?.appendChild(l);
          this.heartTicks.push(l);
        }
      }
      put(this.heartClockEl, 'show', String(Boolean(hc)), v => this.heartClockEl.classList.toggle('show', v === 'true'));
      if (hc) {
        const secs = Math.max(0, Math.ceil(hc.left - 1e-6));
        const state = hc.saved ? 'saved' : secs <= 10 ? 'urgent' : hc.ratio <= 0.5 ? 'low' : 'ok';
        put(this.heartClockEl, 'state', state, v => { this.heartClockEl.dataset.state = v; });
        put(this.heartClockEl, 'num', String(secs), v => {
          const n = Number(v);
          document.getElementById('heartClockNum').textContent = `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
          const lit = Math.round(Math.max(0, Math.min(1, hc.ratio)) * 50);
          this.heartTicks.forEach((t, i) => t.classList.toggle('off', i >= lit));
        });
        put(this.heartClockEl, 'wait', String(hc.waiting && !hc.saved), v => this.heartClockEl.classList.toggle('waiting', v === 'true'));
        // the heart: green while fresh, crossing into the red heart below ~40%; it beats faster as it fails
        const k = Math.round(Math.max(0, Math.min(1, hc.ratio)) * 20) / 20;
        put(this.heartClockEl, 'heart', String(hc.saved ? 1 : k), v => {
          const r = Number(v), green = Math.max(0, Math.min(1, (r - 0.15) / 0.25));
          document.getElementById('heartClockGreen').style.opacity = String(green);
          document.getElementById('heartClockRed').style.opacity = String(1 - green);
          this.heartClockEl.style.setProperty('--hc-beat', `${(0.45 + 0.75 * r).toFixed(2)}s`);
        });
        put(this.heartClockEl, 'label', hc.saved ? 'HEART SAVED' : 'FOREST HEART', v => { document.getElementById('heartClockLabel').textContent = v; });
      }
    }

    // Level 4 boss bar
    // Stage 1 (Pitaji) has his own portrait bar; the Asura uses the boss bar
    const boss = this.isGameStarted ? this.level?.bossHud?.() : null;
    const fatherBar = Boolean(boss && boss.father);
    put(this.fatherHud, 'show', String(fatherBar), v => this.fatherHud?.classList.toggle('show', v === 'true'));
    if (fatherBar) {
      const w = `${(Math.max(0, Math.min(1, boss.ratio)) * 100).toFixed(1)}%`;
      put(this.fatherFill, 'w', w, v => { this.fatherFill.style.width = v; this.fatherFillLag.style.width = v; });
    }
    put(this.bossHud, 'show', String(Boolean(boss) && !fatherBar), v => this.bossHud?.classList.toggle('show', v === 'true'));
    if (boss && !fatherBar) {
      const w = `${(Math.max(0, Math.min(1, boss.ratio)) * 100).toFixed(1)}%`;
      put(this.bossFill, 'w', w, v => { this.bossFill.style.width = v; this.bossFillLag.style.width = v; });
      put(this.bossName, 'n', boss.name, v => { this.bossName.textContent = v; });
      put(this.bossHud, 'demon', String(Boolean(boss.demon)), v => this.bossHud.classList.toggle('demon', v === 'true'));
    }

    // Equipped weapon: talwar [1] or Trishul [2]; the Trishul icon dims while it is in flight
    const trishulOn = this.player.hasTrishul && this.player.weapon === 'trishul';
    put(this.hudWeapon, 'src', trishulOn ? 'assets/ui/hud/trishul.png' : 'assets/ui/hud/talwar.png', v => {
      this.hudWeapon.src = v;
      this.hudWeapon.alt = trishulOn ? 'Equipped weapon: Trishul' : 'Equipped weapon: Guardian Talwar';
      this.hudWeapon.classList.toggle('trishul', trishulOn);
    });
    put(this.hudWeapon, 'away', String(trishulOn && Boolean(this.player.trishul)), v => this.hudWeapon.classList.toggle('away', v === 'true'));
    put(this.hudWeaponKeys, 'show', String(Boolean(this.player.hasTrishul)), v => this.hudWeaponKeys.classList.toggle('show', v === 'true'));
    put(this.hudWeaponKeys, 'sel', this.player.weapon, v => this.hudWeaponKeys.dataset.weapon = v);

    // Unlimited mode: round and crowd counter
    if (this.endlessHud) {
      const show = this.currentLevelIndex === 5 && this.isGameStarted;
      put(this.endlessHud, 'show', String(show), (v) => this.endlessHud.classList.toggle('active', v === 'true'));
      if (show) {
        const h = this.level.hudData;
        put(this.endlessHud, 'data', JSON.stringify(h), () => this.renderEndlessHud(h));
      }
    }

    // Keep combat notifications separate from the minimal persistent HUD.
    if (this.killToast) {
      if (this.level && this.level.killToastTimer > 0) {
        if (this.killToastText && this.level.killToastText && this.killToastText.textContent !== this.level.killToastText) {
          this.killToastText.textContent = this.level.killToastText;
        }
        // Hard and Hardcore have no checkpoints to come back to: their notice is not shown
        this.killToast.classList.toggle('active', !(Run.noCheckpoints && String(this.level.killToastText).includes('CHECKPOINT')));
      } else {
        this.killToast.classList.remove('active');
      }
    }
  }

  /** Unlimited mode counter: a framed teal-and-gold panel (round and its progress, the score, the stats, the [Q] mud). */
  renderEndlessHud(h) {
    const el = this.endlessHud;
    if (!el.firstChild) {
      el.innerHTML = `
        <div class="eh-round"><span class="eh-orn">⚜</span><span class="eh-round-label">ROUND</span><span class="eh-round-num"></span><span class="eh-orn">⚜</span></div>
        <div class="eh-mobs"><div class="eh-mobs-bar"><span></span></div><div class="eh-mobs-text"></div></div>
        <div class="eh-hp"></div>
        <div class="eh-divider"></div>
        <div class="eh-score"><div class="eh-score-label">SCORE</div><div class="eh-score-num"></div></div>
        <div class="eh-stats">
          <div><span class="eh-k">KILLS</span><span class="eh-v eh-kills"></span></div>
          <div><span class="eh-k">DAMAGE TAKEN</span><span class="eh-v eh-dmg"></span></div>
        </div>
        <div class="eh-mud"><span class="eh-key" data-key="Q">Q</span><span class="eh-mud-text"></span></div>
        <div class="eh-best">BEST <span></span></div>`;
    }
    const q = (s) => el.querySelector(s);
    q('.eh-round-num').textContent = h.round;
    const done = h.size ? (h.size - h.left) / h.size : 0;
    q('.eh-mobs-bar span').style.width = `${Math.round(done * 100)}%`;
    q('.eh-mobs-text').textContent = h.resting ? 'NEXT ROUND COMING' : `MOBS LEFT  ${h.left} / ${h.size}`;
    q('.eh-hp').textContent = h.hpBonus ? `ENEMIES +${h.hpBonus}% HP` : '';
    q('.eh-score-num').textContent = h.score;
    q('.eh-kills').textContent = h.kills;
    q('.eh-dmg').textContent = h.damage;
    const mud = q('.eh-mud');
    mud.classList.toggle('ready', h.mudReady);
    q('.eh-mud-text').textContent = h.mudReady ? 'MUD READY' : `MUD IN ${h.mudIn}s`;
    q('.eh-best span').textContent = h.best;
  }

  /** One line of dialogue. speaker: 'kali', 'rakti' (portrait follows her outfit) or anything else (no portrait).
   *  gesture: 0-7 picks a gesture frame (row 3 of the portrait sheet), shown once the line has been spoken. */
  openDialogue(text, speaker = 'stele', title = null, gesture = null, portrait = null) {
    const prevSpeaker = this.dialogueActive ? this.dialogueSpeaker : null;
    this.dialogueActive = true;
    this.dialogueSpeaker = speaker;
    if (speaker !== prevSpeaker) Sfx.play('text_pop');   // the box pops up, or a new speaker takes over
    // a line that teaches a key ([X], [Q], [F]...) cannot be skipped until it is fully shown and KEY_LINE_HOLD s
    // have passed (typing cannot be rushed either)
    const teaches = teachesKey(text);
    text = keyLabel(text);   // [E], [F]... name the controller's buttons while one is in use
    title = keyLabel(title);
    this.dlg = { text, shown: 0, speaker, gesture, frame: pickPortrait(this.portraitSetName(speaker), gesture, text, portrait), age: 0, teaches };
    this.portraitAnim = 0;
    this.portraitFrame = -1;
    this.portraitPose = null;
    if (!this.dialogueBox || !this.dialogueText) return;
    // the whole line is laid out at once (the untyped part invisible), so the box never changes size while typing
    this.dialogueText.textContent = '';
    this.dlgShownNode = document.createTextNode('');
    this.dlgRestNode = document.createElement('span');
    this.dlgRestNode.className = 'dlg-rest';
    this.dlgRestNode.textContent = text;
    this.dialogueText.append(this.dlgShownNode, this.dlgRestNode);
    // no scene titles: the speaker's name is on their portrait (lines without one, signs and the voice in the dark,
    // stand alone in their bubble)
    this.placeSpeakers(speaker, prevSpeaker);
    this.updateDialogue(0);
    this.dialogueBox.style.display = 'block';
  }

  portraitSetName(speaker) {
    if (speaker === 'rakti') return this.player.isCivilian ? 'rakti_sari' : 'rakti';
    return speaker;
  }

  portraitSetFor(speaker) {
    return this.portraitSets[this.portraitSetName(speaker)] || null;
  }

  /** Which side of the screen a speaker stands on. */
  speakerSide(speaker) { return speaker === 'rakti' ? 'left' : 'right'; }

  /** In a conversation, who is listening: the last other speaker (else the next one) who has a portrait and stands
   *  on the other side. None outside a conversation. */
  dialogueListener(speaker) {
    const c = this.convo;
    if (!c) return null;
    const side = this.speakerSide(speaker);
    const ok = (s) => s && s !== speaker && this.portraitSetFor(s) && this.speakerSide(s) !== side;
    for (let j = c.i - 1; j >= 0; j--) if (ok(c.lines[j].s)) return c.lines[j].s;
    for (let j = c.i + 1; j < c.lines.length; j++) if (ok(c.lines[j].s)) return c.lines[j].s;
    return null;
  }

  /** Puts the speaker on their side, lit, and the listener (if any) on the other side, dimmed. */
  placeSpeakers(speaker, prevSpeaker) {
    const box = this.dialogueBox, A = this.dlgActors;
    if (!A?.left || !A?.right) return;
    for (const sp of ['kali', 'rakti', 'father', 'demon']) box.classList.toggle('speaker-' + sp, speaker === sp);
    const set = this.portraitSetFor(speaker);
    const side = this.speakerSide(speaker), other = side === 'left' ? 'right' : 'left';
    const show = (a, who, role) => {
      const fresh = a.who !== who || !a.el.classList.contains('on');
      a.who = who;
      a.el.classList.add('on');
      a.el.classList.toggle('speaking', role === 'speaking');
      a.el.classList.toggle('listening', role === 'listening');
      const name = (SPEAKER_NAMES[who] || '').replace(/⚜/g, '').trim();
      a.img.alt = name;
      a.el.dataset.who = who;
      if (a.name && a.name.textContent !== name) a.name.textContent = name;
      return fresh;
    };
    const hide = (a) => { a.who = null; a.el.classList.remove('on', 'speaking', 'listening'); };
    if (set) {
      const a = A[side];
      if (show(a, speaker, 'speaking')) { a.back.style.opacity = '0'; this.portraitNewSpeaker = true; }
      this.dialoguePortraitImg = a.img;
      this.dialoguePortraitBack = a.back;
    } else {
      hide(A[side]);
      this.dialoguePortraitImg = this.dialoguePortraitBack = null;
    }
    const lis = set ? this.dialogueListener(speaker) : null;
    if (lis) {
      const a = A[other];
      if (show(a, lis, 'listening') || !a.img.getAttribute('src')) {
        const key = this.portraitSetName(lis);
        a.img.src = this.portraitLast[key] || this.portraitSetFor(lis)[0].src;
        a.img.style.opacity = '1';
        a.back.style.opacity = '0';
      }
    } else hide(A[other]);
    // a new speaker's bubble pops in afresh
    const panel = box.querySelector('.dlg-panel');
    if (panel && speaker !== prevSpeaker) { panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = ''; }
    // the bubble sits beside whoever is speaking (centred at the bottom when no one is shown)
    box.classList.toggle('side-left', Boolean(set) && side === 'left');
    box.classList.toggle('side-right', Boolean(set) && side === 'right');
    box.classList.toggle('side-none', !set);
    box.classList.toggle('voice', speaker === 'voice');
    box.classList.toggle('has-left', A.left.el.classList.contains('on'));
    box.classList.toggle('has-right', A.right.el.classList.contains('on'));
    box.classList.toggle('listen-left', A.left.el.classList.contains('listening'));
    box.classList.toggle('listen-right', A.right.el.classList.contains('listening'));
  }

  /** A sequence of lines between Kali and Rakti: [{ s: 'kali' | 'rakti', t: text, g: gesture }]. [E] steps through it. */
  openConversation(lines, onDone = null, title = null) {
    this.convo = { lines, i: 0, onDone, title };
    const l = lines[0];
    this.openDialogue(l.t, l.s, l.title || title, l.g ?? null, l.p ?? null);
  }

  updateDialogue(dt) {
    const d = this.dlg;
    const typing = d.shown < d.text.length;
    if (typing) d.shown = Math.min(d.text.length, d.shown + dt * 70);
    d.age += dt;
    const locked = this.dialogueLocked();
    const n = Math.floor(d.shown);
    if (this.dlgShownNode && this.dlgShownNode.nodeValue.length !== n) {
      this.dlgShownNode.nodeValue = d.text.slice(0, n);
      this.dlgRestNode.textContent = d.text.slice(n);
    }
    this.dialogueDismiss?.classList.toggle('typing', d.shown < d.text.length);
    this.dialogueDismiss?.classList.toggle('locked', locked);
    if (this.dialogueDismiss) {
      const more = this.convo && this.convo.i < this.convo.lines.length - 1;
      const label = locked ? (more ? '[E] NEXT ▸' : '[E] CONTINUE')
        : (d.shown < d.text.length ? '[E] SKIP' : more ? '[E] NEXT ▸' : '[E] CONTINUE') + (more ? '   [C] SKIP ALL' : '');
      if (this.dialogueDismiss.dataset.label !== label + Input.labelPad + Input.labelStyle) {
        this.dialogueDismiss.dataset.label = label + Input.labelPad + Input.labelStyle;
        this.dialogueDismiss.textContent = label;
      }
    }
    const set = this.portraitSetFor(d.speaker);
    if (!set || !this.dialoguePortraitImg) return;
    this.portraitAnim += dt;
    // Still portraits: the line's one expression for its whole length (a change of expression crossfades softly)
    const f = d.frame ?? 0, pose = 'f' + f;
    const img = this.dialoguePortraitImg, back = this.dialoguePortraitBack;
    if (this.portraitBackTimer > 0) {   // the crossfade is over: drop the old pose
      this.portraitBackTimer -= dt;
      if (this.portraitBackTimer <= 0 && back) back.style.opacity = '0';
    }
    if (f === this.portraitFrame || !set[f]) return;
    if (pose !== this.portraitPose && this.portraitPose !== null && back && !this.portraitNewSpeaker) {
      // a change of pose crossfades: the old pose stays underneath while the new one fades in
      back.src = img.src;
      back.style.opacity = '1';
      img.style.transition = 'none';
      img.style.opacity = '0';
      img.src = set[f].src;
      void img.offsetWidth;
      img.style.transition = '';
      img.style.opacity = '1';
      this.portraitBackTimer = 0.22;
    } else {
      img.src = set[f].src;
      img.style.opacity = '1';
      if (back && pose !== this.portraitPose) back.style.opacity = '0';
    }
    this.portraitNewSpeaker = false;
    this.portraitPose = pose;
    this.portraitFrame = f;
    this.portraitLast[this.portraitSetName(d.speaker)] = set[f].src;
  }

  /** True while the open line teaches a key and is still typing or younger than KEY_LINE_HOLD s. */
  dialogueLocked() {
    const d = this.dlg;
    return Boolean(d && d.teaches && (d.shown < d.text.length || d.age < KEY_LINE_HOLD));
  }

  /** [C]: skip the rest of the conversation, but stop at a later line that teaches a key (and never skip one that
   *  is still locked). */
  skipConversation() {
    if (this.dialogueLocked()) return;
    const c = this.convo;
    if (c) {
      for (let j = c.i + 1; j < c.lines.length; j++) {
        if (!teachesKey(c.lines[j].t)) continue;
        c.i = j;
        const l = c.lines[j];
        this.openDialogue(l.t, l.s, l.title || c.title, l.g ?? null, l.p ?? null);
        return;
      }
    }
    this.closeDialogue();
    c?.onDone?.();
  }

  /** [E] in a dialogue: finish the typing, then the next line, then close (running the conversation's onDone). */
  advanceDialogue() {
    if (this.dialogueLocked()) return;
    const d = this.dlg;
    if (d && d.shown < d.text.length) {
      d.shown = d.text.length;
      this.updateDialogue(0);
      return;
    }
    const c = this.convo;
    if (c && c.i < c.lines.length - 1) {
      c.i++;
      const l = c.lines[c.i];
      this.openDialogue(l.t, l.s, l.title || c.title, l.g ?? null, l.p ?? null);
      return;
    }
    this.convo = null;
    this.closeDialogue();
    c?.onDone?.();
  }

  /** Closes without running a conversation's onDone (level loads, deaths). */
  closeDialogue() {
    this.dialogueActive = false;
    this.dialogueSpeaker = null;
    this.dlg = null;
    this.convo = null;
    if (this.dialogueBox) {
      this.dialogueBox.classList.remove('has-left', 'has-right', 'listen-left', 'listen-right', 'side-left', 'side-right', 'side-none', 'voice', 'speaker-kali', 'speaker-rakti', 'speaker-father', 'speaker-demon');
      this.dialogueBox.style.display = 'none';
    }
    for (const a of Object.values(this.dlgActors || {})) if (a) { a.who = null; a.el.classList.remove('on', 'speaking', 'listening'); }
    this.dialoguePortraitImg = this.dialoguePortraitBack = null;
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-Math.floor(this.camX), -Math.floor(this.camY));

    // 1. Level Artwork & Dynamic Interactive Elements
    this.level.renderBackground(ctx, this.player.isDivine);

    // 2. Character Platform Shadow
    this.player.renderShadow(ctx);

    // 3. Player Sprite (Mortal Warrior, Climbing on Ladders, or Divine Kali)
    this.player.render(ctx);

    // 3b. Level art in front of Rakti (Level 2's quicksand covers her as she sinks)
    this.level.renderForeground?.(ctx);

    // 4. Divine Sparks, Damage & Leap Particles
    this.player.renderParticles(ctx);

    ctx.restore();

    // 4b. Sands of Time: the world around Rakti slows, in gold
    this.renderSands(ctx);

    // 5. Fade-from-black overlay (Level 1 wake-up)
    if (this.level.screenFade > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, this.level.screenFade)})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }
  }
}
