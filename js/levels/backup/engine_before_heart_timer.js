/**
 * ==========================================================================
 * GLITCHVERSE - CORE ENGINE (js/core/engine.js)
 * Fullscreen dynamic camera, four-chapter progression,
 * Undertale HUD binding, Climbing, Morphing [Q], and Quest progression.
 * ==========================================================================
 */

import { Input } from './input.js';
import { Music, Sfx } from './audio.js';

// An atmosphere hum swells as Rakti nears the item she needs to progress (a level's crucialItem())
const AURA_RANGE = 380, AURA_CLOSE = 110;
import { TRISHUL } from '../entities/player.js';
import { Level2 } from '../levels/level2.js';
import { Level3 } from '../levels/level3.js';
import { Level4 } from '../levels/level4.js';
import { EndlessLevel } from '../levels/endless.js';

// Shown under the sigil on the loading screen
const LEVEL_NAMES = {
  1: 'Level I  ·  Drowned Dwaraka',
  2: 'Level II  ·  The Sun Wastes',
  3: 'Level III  ·  The Forest Heart',
  4: 'Level IV  ·  The Archer Fort',
  5: 'Unlimited Mode  ·  The Siege Wall'
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
    this.dialoguePortraitContainer = document.getElementById('dialoguePortraitContainer');
    this.dialoguePortraitImg = document.getElementById('dialoguePortraitImg');
    this.dialoguePortraitBack = document.getElementById('dialoguePortraitBack');   // the previous pose, under a crossfade
    this.dialogueDismiss = document.getElementById('dialogueDismiss');
    this.bossHud = document.getElementById('bossHud');
    this.bossFill = document.getElementById('bossFill');
    this.bossFillLag = document.getElementById('bossFillLag');
    this.bossName = document.getElementById('bossName');
    this.fatherHud = document.getElementById('fatherHud');
    this.fatherFill = document.getElementById('fatherFill');
    this.fatherFillLag = document.getElementById('fatherFillLag');
    this.dialoguePortraitName = document.getElementById('dialoguePortraitName');

    // Dialogue portraits (v3, assets/portraits/*3_N.png): still busts, one expression per line, no talking animation.
    // The old animated sets (kali2_, rakti_, rakti_sari_, father2_, demon_portrait_) stay on disk as backups.
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
    this.pauseScreen = document.getElementById('pauseScreen');
    this.pauseMain = document.getElementById('pauseMain');
    this.pauseConfirm = document.getElementById('pauseConfirm');
    const on = (id, fn) => document.getElementById(id)?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
    on('pauseContinue', () => this.resume());
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

    Music.play('title');   // the start screen's music: it begins at once, or on the first click if the browser blocks that

    this.startGameButton?.addEventListener('click', (event) => {
      event.preventDefault();
      this.startJourney();
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

  startJourney() {
    if (this.isGameStarted || this.isLoading) return;
    this.prologueComplete = false;   // a new game always starts with the wake-up
    this.level1.checkpointIndex = -1;
    this.level1.abilityGranted = false;
    this.beginLoadingTransition(1);
  }

  /** Title screen: Unlimited mode (endless rounds in one arena). */
  startEndless() {
    if (this.isGameStarted || this.isLoading) return;
    this.beginLoadingTransition(5);
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
    Music.stop();
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

  /** Restart asks first: true shows "Are you sure?", false goes back to the three buttons. */
  showRestartConfirm(show) {
    if (this.pauseMain) this.pauseMain.hidden = show;
    if (this.pauseConfirm) this.pauseConfirm.hidden = !show;
    const txt = document.getElementById('pauseConfirmText');
    if (txt) txt.textContent = this.currentLevelIndex === 5
      ? 'The unlimited arena starts over from round one. Your current run will be lost.'
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
    this.isGameStarted = false;
    this.paused = false;
    this.pauseScreen?.classList.remove('active');
    this.levelCompleteModal?.classList.remove('active');
    this.closeDialogue();
    this.titleScreen?.classList.add('active');
    Music.play('title');
    this.hudEl?.classList.add('menu-hidden');
    this.endlessHud?.classList.remove('active');
  }

  update(dt) {
    // The title theme belongs to the start menu only (looped there). Anywhere else (loading, a level, the unlimited
    // arena) it is stopped, and nothing (a late first click, a refocused tab) may start it again until the menu is back.
    const onMenu = !this.isGameStarted && !this.isLoading && this.titleScreen?.classList.contains('active');
    Music.blocked = !onMenu;
    if (!onMenu && Music.name === 'title') Music.stop(0.5);
    else if (onMenu && !Music.name) Music.play('title');
    if (this.isLoading) {
      this.loadingTimer -= dt;
      if (this.loadingTimer <= 0) {
        const destinationIndex = this.loadingTargetIndex;
        this.isLoading = false;
        this.loadingTargetIndex = null;
        this.loadingScreen?.classList.remove('active');
        this.loadingScreen?.setAttribute('aria-hidden', 'true');
        if (destinationIndex) {
          this.loadLevel(destinationIndex);
          this.hudEl?.classList.remove('menu-hidden');
        }
      }
      this.updateCamera(dt);
      return;
    }

    if (!this.isGameStarted) {
      if (Input.isPressed('enter') || Input.isPressed('space')) {
        this.startJourney();
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

    // Levels 2 and 3 continue automatically after their completion screen, while
    // still allowing the player to enter the next level immediately with E or Space.
    if ((this.currentLevelIndex === 2 || this.currentLevelIndex === 3) && this.levelCompleted) {
      const nextLevel = this.currentLevelIndex + 1;
      if (Input.isPressed('reset') || Input.isPressed('KeyR')) {
        this.resetGame();
        return;
      }

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
      if (Input.isPressed('reset') || Input.isPressed('KeyR')) {
        this.resetGame();
        return;
      }

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
    const devKeys = { KeyU: 1, KeyI: 2, KeyO: 3, KeyP: 4 };
    for (const [code, index] of Object.entries(devKeys)) {
      if (Input.isPressed(code)) {
        this.beginLoadingTransition(index);
        return;
      }
    }


    // Restart [R] (from the last checkpoint): only while Rakti is fully under the player's control, never during a
    // dialogue, a cutscene (scripted walk, wake-up, outfit change, level scenes) or a level-change fade
    const p0 = this.player, L0 = this.level;
    const inCutsceneNow = this.dialogueActive || p0.inputLocked || p0.isWaking || p0.isChangingOutfit || p0.autoWalkX != null
      || Boolean(L0.pendingDialogue) || Boolean(L0.introPending) || Boolean(L0.cutscene) || (L0.screenFade || 0) > 0.05;
    if ((Input.isPressed('reset') || Input.isPressed('KeyR')) && !inCutsceneNow) {
      this.resetGame();
      return;
    }

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
    if (Input.isPressed('interact') || (this.levelCompleted && Input.isPressed('space'))) {
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
            text += ' Feel it flow into you, Rakti: your talwar and my Trishul now strike twice as hard, and your life burns stronger than before. You will need all of it for what waits ahead.';
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
            this.openDialogue(this.level.leverMessage, 'kali', '⚜ KALI\'S FLOWER BRIDGES ⚜');
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
        const c = this.convo;
        this.closeDialogue();
        c?.onDone?.();
      }
    }

    // 3. Update player and level (passes player for enemy & hazard collision)
    // Rakti's on-screen x (CSS pixels) so mouse-aimed attacks face the cursor correctly.
    this.player.screenX = (this.player.x - this.camX) * this.zoom;
    // where the cursor is in the world (the Trishul can be thrown at it)
    this.player.aimWorld = { x: Input.mouseX / this.zoom + Math.floor(this.camX), y: Input.mouseY / this.zoom + Math.floor(this.camY) };
    this.player.update(dt, this.level, this.dialogueActive);
    this.level.update(this.player.x, this.player.y, dt, this.player.isDivine, this.player);
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
      if (this.currentLevelIndex === 2 || this.currentLevelIndex === 3) this.levelTransitionTimer = this.currentLevelIndex === 3 ? 2.0 : 3.0;
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

    if (this.currentLevelIndex === 1) {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 1 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'DROWNED DWARAKA CLEARED';
      if (this.completeFlavor) this.completeFlavor.textContent = 'The Pearl of the Tide hums in your hands as the portal takes you.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] ENTER LEVEL 2  |  [R] REPLAY';
    } else if (this.currentLevelIndex === 2) {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 2 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'THE HALL OF THE SUN IS OPEN';
      if (this.completeFlavor) this.completeFlavor.textContent = 'The Trishul, second of the four relics, hums at your side as the portal opens onto the jungle.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] CONTINUE TO LEVEL 3  •  AUTO IN 3s';
    } else if (this.currentLevelIndex === 3) {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 3 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'THE FOREST HEART IS RESTORED';
      if (this.completeFlavor) this.completeFlavor.textContent = 'The jungle exhales as the portal opens onto the next trial.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] CONTINUE TO LEVEL 4  •  AUTO IN 2s';
    } else {
      // the end of the game: the framed ending card
      if (this.completeTitle) this.completeTitle.textContent = 'THE REALMS ARE SAVED';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'THE FOUR RELICS ARE WHOLE  ·  THE RIFT IS SEALED';
      if (this.completeFlavor) this.completeFlavor.textContent = 'Rakti crossed four broken realms, freed her father from the Asura and sealed the rift with Maa Kali\'s relics. The sea is calm over Dwaraka again, and the two of them are going home.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] RETURN TO TITLE  |  [R] RELIVE THE FINAL TRIAL';
    }
    const final = this.currentLevelIndex === 4;
    // every level's card uses the same gold-framed design as the death card (the 'final' class is that frame)
    this.levelCompleteModal.classList.add('final');
    const thanks = document.getElementById('completeThanks');
    if (thanks) thanks.textContent = final ? 'THANK YOU FOR PLAYING' : '';

    this.levelCompleteModal.classList.add('active');
  }

  resetGame() {
    this.loadLevel(this.currentLevelIndex);
  }

  handlePlayerDeath() {
    this.playerDying = true;
    this.closeDialogue();
    if (this.level) this.level.cameraShake = 1.0;
    this.player.spawnDeathBurst();

    if (this.deathScreen) {
      const small = document.getElementById('deathSmall');
      if (small) small.textContent = this.currentLevelIndex === 5 ? 'Rising again in the arena' : 'Respawning at the last checkpoint';
      this.deathScreen.classList.add('active');
    }

    // After a short pause (long enough to read the card), respawn at the last checkpoint with full health
    setTimeout(() => {
      this.loadLevel(this.currentLevelIndex);
      this.playerDying = false;
      if (this.deathScreen) {
        this.deathScreen.classList.remove('active');
      }
    }, 1900);
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
        this.killToast.classList.add('active');
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
        <div class="eh-mud"><span class="eh-key">Q</span><span class="eh-mud-text"></span></div>
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
    this.dlg = { text, shown: 0, speaker, gesture, frame: pickPortrait(this.portraitSetName(speaker), gesture, text, portrait) };
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
    if (this.dialogueTitle) {
      this.dialogueTitle.textContent = title || SPEAKER_NAMES[speaker] || '⚜ WHISPER OF SURYA ⚜';
    }
    const set = this.portraitSetFor(speaker);
    if (this.dialoguePortraitContainer) {
      this.dialogueBox.classList.toggle('has-portrait', Boolean(set));
      this.dialogueBox.classList.toggle('portrait-left', speaker === 'rakti');
      for (const sp of ['rakti', 'father', 'demon']) this.dialogueBox.classList.toggle('speaker-' + sp, speaker === sp);
      this.dialoguePortraitContainer.style.display = set ? 'flex' : 'none';
      if (set && this.dialoguePortraitName) this.dialoguePortraitName.textContent = SPEAKER_NAMES[speaker];
      if (set && this.dialoguePortraitImg) this.dialoguePortraitImg.alt = SPEAKER_NAMES[speaker].replace(/⚜/g, '').trim();
      if (set && speaker !== prevSpeaker) {
        // a new speaker slides up into view (no crossfade from the last speaker's face)
        if (this.dialoguePortraitBack) this.dialoguePortraitBack.style.opacity = '0';
        this.dialoguePortraitContainer.classList.remove('enter');
        void this.dialoguePortraitContainer.offsetWidth;
        this.dialoguePortraitContainer.classList.add('enter');
        this.portraitNewSpeaker = true;
      }
    }
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
    const n = Math.floor(d.shown);
    if (this.dlgShownNode && this.dlgShownNode.nodeValue.length !== n) {
      this.dlgShownNode.nodeValue = d.text.slice(0, n);
      this.dlgRestNode.textContent = d.text.slice(n);
    }
    this.dialogueDismiss?.classList.toggle('typing', d.shown < d.text.length);
    if (this.dialogueDismiss) this.dialogueDismiss.textContent = d.shown < d.text.length ? '[E] SKIP' : (this.convo && this.convo.i < this.convo.lines.length - 1 ? '[E] NEXT ▸' : '[E] CONTINUE');
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
  }

  /** [E] in a dialogue: finish the typing, then the next line, then close (running the conversation's onDone). */
  advanceDialogue() {
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
      this.dialogueBox.classList.remove('has-portrait', 'portrait-left', 'speaker-rakti', 'speaker-father', 'speaker-demon');
      this.dialogueBox.style.display = 'none';
    }
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

    // 5. Fade-from-black overlay (Level 1 wake-up)
    if (this.level.screenFade > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, this.level.screenFade)})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }
  }
}
