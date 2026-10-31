/**
 * ==========================================================================
 * GLITCHVERSE - CORE ENGINE (js/core/engine.js)
 * Fullscreen dynamic camera, four-chapter progression,
 * Undertale HUD binding, Climbing, Morphing [Q], and Quest progression.
 * ==========================================================================
 */

import { Input } from './input.js';
import { TRISHUL } from '../entities/player.js';
import { Level2 } from '../levels/level2.js';
import { Level3 } from '../levels/level3.js';
import { Level4 } from '../levels/level4.js';

// Shown under the sigil on the loading screen
const LEVEL_NAMES = {
  1: 'Level I  ·  Drowned Dwaraka',
  2: 'Level II  ·  The Sun Wastes',
  3: 'Level III  ·  The Forest Heart',
  4: 'Level IV  ·  The Archer Fort'
};

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
    this.dialoguePortraitName = document.getElementById('dialoguePortraitName');

    // Kali Ma Animated Dialogue Portrait Sprites (9 frames from new sprite sheet)
    this.kaliPortraitFrames = [];
    for (let i = 0; i < 9; i++) {
      const img = new Image();
      img.src = `assets/portraits/kali_${i}.png`;
      this.kaliPortraitFrames.push(img);
    }
    this.kaliPortraitSeq = [0, 1, 2, 4, 3, 5, 7, 1];
    this.kaliPortraitIndex = 0;
    this.kaliAnimTimer = 0;
    this.dialogueSpeaker = null;

    this.interactPrompt = document.getElementById('interactPrompt');
    this.interactPromptText = document.getElementById('interactPromptText');

    this.levelCompleteModal = document.getElementById('levelCompleteModal');
    this.completeTitle = document.getElementById('completeTitle');
    this.completeSubtitle = document.getElementById('completeSubtitle');
    this.completeFlavor = document.getElementById('completeFlavor');
    this.completePrompt = document.getElementById('completePrompt');

    // Kill Notification & Death Screen Elements
    this.deathScreen = document.getElementById('deathScreen');
    this.killToast = document.getElementById('killToast');
    this.killToastText = document.getElementById('killToastText');

    this.titleScreen = document.getElementById('titleScreen');
    this.startGameButton = document.getElementById('startGameButton');
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

    this.startGameButton?.addEventListener('click', (event) => {
      event.preventDefault();
      this.startJourney();
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
    this.level = index === 4 ? this.level4
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

    if (index === 4) {
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
    this.player.resetWeapons();
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

  beginLoadingTransition(destinationIndex) {
    if (this.isLoading) return;
    // Arriving in a level from outside (not a death or [R]) clears its checkpoints
    const dest = [null, this.level1, this.level2, this.level3, this.level4][destinationIndex];
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

  returnToTitle() {
    this.isGameStarted = false;
    this.levelCompleteModal?.classList.remove('active');
    this.closeDialogue();
    this.titleScreen?.classList.add('active');
    this.hudEl?.classList.add('menu-hidden');
  }

  update(dt) {
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

    // Animate Kali Ma hands/arms when active (measuring divine stillness of body)
    if (this.dialogueActive && this.dialogueSpeaker === 'kali') {
      this.kaliAnimTimer += dt;
      if (this.kaliAnimTimer >= 0.22) {
        this.kaliAnimTimer = 0;
        const seq = this.kaliPortraitSeq || [0, 1, 2, 4, 3, 5];
        this.kaliPortraitIndex = (this.kaliPortraitIndex + 1) % seq.length;
        const frameIdx = seq[this.kaliPortraitIndex];
        if (this.dialoguePortraitImg && this.kaliPortraitFrames[frameIdx]) {
          this.dialoguePortraitImg.src = this.kaliPortraitFrames[frameIdx].src;
        }
      }
    }

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
        (Input.isPressed('interact') || Input.isPressed('space') || Input.isPressed('enter'))
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

    // Restart [R]
    if (Input.isPressed('reset') || Input.isPressed('KeyR')) {
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
    if (Input.isPressed('interact') || Input.isPressed('e') || Input.isPressed('enter')) {
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
        this.closeDialogue();
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
            this.openDialogue(this.level.leverMessage, 'kali', '⚜ THE GOLDEN BRIDGES ⚜');
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
        this.closeDialogue();
      }
    }

    // 3. Update player and level (passes player for enemy & hazard collision)
    // Rakti's on-screen x (CSS pixels) so mouse-aimed attacks face the cursor correctly.
    this.player.screenX = (this.player.x - this.camX) * this.zoom;
    this.player.update(dt, this.level, this.dialogueActive);
    this.level.update(this.player.x, this.player.y, dt, this.player.isDivine, this.player);

    // Levels that move Rakti between areas (Level 2's door into the sun hall) ask for a camera cut
    if (this.level.requestCameraSnap) {
      this.level.requestCameraSnap = false;
      this.cameraSnap = true;
    }

    // Levels can ask for a story dialogue (e.g. Level 1: Kali grants her form near the lever tower)
    if (this.level.pendingDialogue && !this.dialogueActive) {
      const d = this.level.pendingDialogue;
      this.level.pendingDialogue = null;
      this.openDialogue(d.text, d.speaker || 'kali', d.title);
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
      if (this.completeFlavor) this.completeFlavor.textContent = '* The Pearl of the Tide hums in your hands as the portal takes you.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] ENTER LEVEL 2  |  [R] REPLAY';
    } else if (this.currentLevelIndex === 2) {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 2 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'THE HALL OF THE SUN IS OPEN';
      if (this.completeFlavor) this.completeFlavor.textContent = '* The Trishul, second of the four relics, hums at your side as the portal opens onto the jungle.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] CONTINUE TO LEVEL 3  •  AUTO IN 3s';
    } else if (this.currentLevelIndex === 3) {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 3 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'THE FOREST HEART IS RESTORED';
      if (this.completeFlavor) this.completeFlavor.textContent = '* The jungle exhales as the portal opens onto the next trial.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] CONTINUE TO LEVEL 4  •  AUTO IN 2s';
    } else {
      if (this.completeTitle) this.completeTitle.textContent = 'THE TIDE IS STILL';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'THE FOUR RELICS ARE RESTORED';
      if (this.completeFlavor) this.completeFlavor.textContent = '* Rakti steps out of the portal as the fractured realms fall quiet.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] RETURN TO TITLE  |  [R] RELIVE THE FINAL TRIAL';
    }

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
      this.deathScreen.classList.add('active');
    }

    // After brief dramatic pause, respawn at the exact same level and reset the map!
    setTimeout(() => {
      this.loadLevel(this.currentLevelIndex);
      this.playerDying = false;
      if (this.deathScreen) {
        this.deathScreen.classList.remove('active');
      }
    }, 1400);
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

    const maxCamX = Math.max(minX, this.level.width - viewW);
    const maxCamY = Math.max(0, this.level.height - viewH);

    targetX = Math.max(minX, Math.min(targetX, maxCamX));
    targetY = Math.max(0, Math.min(targetY, maxCamY));

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
    // Medallion portrait: bruised version below half health
    const hurtPortrait = this.player.hp < this.player.maxHp / 2;
    if (this.hudPortraitArt && hurtPortrait !== this.isHurtPortrait) {
      this.hudPortraitArt.src = hurtPortrait
        ? 'assets/ui/hud/rakti_medallion_hurt.png'
        : 'assets/ui/hud/rakti_medallion.png';
      this.hudPortraitArt.alt = hurtPortrait
        ? 'Rakti, hurt'
        : 'Rakti at full health';
      this.isHurtPortrait = hurtPortrait;
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
    const divineRatio = this.player.isTransforming
      ? 1
      : this.player.isDivine
        ? Math.max(0, Math.min(1, this.player.divineTimer / this.player.divineDuration))
        : 1;
    const divinePercent = divineUnlocked ? divineRatio * 100 : 0;

    put(this.divineBarFill, 'w', `${divinePercent.toFixed(1)}%`, v => { this.divineBarFill.style.width = v; });
    put(this.divineTrack, 'now', String(Math.round(divinePercent)), v => this.divineTrack.setAttribute('aria-valuenow', v));
    put(this.divineTrack, 'text', !divineUnlocked
      ? 'X ability locked'
      : divineActive
        ? `${Math.ceil(this.player.divineTimer)} seconds remain`
        : 'X ability ready', v => this.divineTrack.setAttribute('aria-valuetext', v));
    if (this.divineMeter) {
      this.divineMeter.classList.toggle('locked', !divineUnlocked);
      this.divineMeter.classList.toggle('active', divineActive);
    }
    this.hudEl.classList.toggle('divine-mode', divineActive);

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

  openDialogue(text, speaker = 'stele', title = null) {
    this.dialogueActive = true;
    this.dialogueSpeaker = speaker;

    if (this.dialogueBox && this.dialogueText) {
      this.dialogueText.textContent = text;

      if (this.dialogueTitle) {
        this.dialogueTitle.textContent = title || (speaker === 'kali' ? '⚜ MAA KALI ⚜' : '⚜ WHISPER OF SURYA ⚜');
      }

      if (this.dialoguePortraitContainer) {
        if (speaker === 'kali') {
          this.dialogueBox.classList.add('has-portrait');
          this.dialoguePortraitContainer.style.display = 'flex';
          this.kaliPortraitIndex = 0;
          this.kaliAnimTimer = 0;
          const initialFrame = (this.kaliPortraitSeq && this.kaliPortraitSeq[0]) || 0;
          if (this.dialoguePortraitImg && this.kaliPortraitFrames[initialFrame]) {
            this.dialoguePortraitImg.src = this.kaliPortraitFrames[initialFrame].src;
          }
          if (this.dialoguePortraitName) {
            this.dialoguePortraitName.textContent = '⚜ MAA KALI ⚜';
          }
        } else {
          this.dialogueBox.classList.remove('has-portrait');
          this.dialoguePortraitContainer.style.display = 'none';
        }
      }

      this.dialogueBox.style.display = 'block';
    }
  }

  closeDialogue() {
    this.dialogueActive = false;
    this.dialogueSpeaker = null;
    if (this.dialogueBox) {
      this.dialogueBox.classList.remove('has-portrait');
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
