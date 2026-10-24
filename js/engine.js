/**
 * ==========================================================================
 * GLITCHVERSE - CORE ENGINE (js/engine.js)
 * Fullscreen dynamic camera, four-chapter progression,
 * Undertale HUD binding, Climbing, Morphing [Q], and Quest progression.
 * ==========================================================================
 */

import { Input } from './input.js';
import { Level2 } from './level2.js';
import { Level3 } from './level3.js';
import { Level4, L4_CONFIG } from './level4.js';

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
    this.hudName = document.getElementById('hudName');
    this.hudLv = document.getElementById('hudLv');
    this.hpFill = document.getElementById('hpFill');
    this.hpSvgFill = document.getElementById('hpSvgFill');
    this.divineRingFill = document.getElementById('divineRingFill');
    this.hpNum = document.getElementById('hpNum');

    this.divineGroup = document.getElementById('divineGroup');
    this.divineFill = document.getElementById('divineFill');
    this.divineTime = document.getElementById('divineTime');
    this.divineLabel = document.getElementById('divineLabel');

    this.morphGroup = document.getElementById('morphGroup');
    this.keyGroup = document.getElementById('keyGroup');

    // Round 1 initial UI: Morph is hidden, Divine is locked until Lotus interaction
    if (this.morphGroup) this.morphGroup.style.display = 'none';
    if (this.divineGroup) this.divineGroup.style.display = 'none';
    if (this.keyGroup) this.keyGroup.style.display = 'none';
    if (this.killsGroup) this.killsGroup.style.display = 'none';
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
    this.killsGroup = document.getElementById('killsGroup');
    this.killsBadge = document.getElementById('killsBadge');

    this.playerDying = false;
    this.levelCompleted = false;

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
    this.currentLevelIndex = index;
    this.level = index === 4 ? this.level4
      : index === 3 ? this.level3
      : index === 2 ? this.level2
      : this.level1;
    this.level.reset();
    this.levelCompleted = false;
    this.closeDialogue();

    if (this.levelCompleteModal) {
      this.levelCompleteModal.classList.remove('active');
    }

    if (this.hudLv) {
      this.hudLv.textContent = 'CH. ' + index;
    }

    if (index === 4) {
      // The arena is built around the raised circular floor.
      this.player.x = 320;
      this.player.y = 480;
      this.player.hasDivineUnlocked = true;
      if (this.divineGroup) this.divineGroup.style.display = 'flex';
      if (this.morphGroup) this.morphGroup.style.display = 'none';
      if (this.killsGroup) this.killsGroup.style.display = 'flex';
    } else if (index === 3) {
      // The Heart of Hubris begins on the upper-left ruin ledge.
      this.player.x = 90;
      this.player.y = 108;
      this.player.hasDivineUnlocked = true;
      if (this.divineGroup) this.divineGroup.style.display = 'flex';
      if (this.morphGroup) this.morphGroup.style.display = 'none';
      if (this.killsGroup) this.killsGroup.style.display = 'flex';
    } else if (index === 2) {
      // Start in Level 2: Left sand dune / stone ledge
      this.player.x = 100;
      this.player.y = 325;
      this.player.hasDivineUnlocked = true; // Divine power persists into Level 2
      if (this.divineGroup) this.divineGroup.style.display = 'flex';
      if (this.morphGroup) this.morphGroup.style.display = 'flex';
      if (this.killsGroup) this.killsGroup.style.display = 'flex';
    } else {
      // Start in Level 1: Sunken courtyard
      this.player.x = 160;
      this.player.y = 368;
      this.player.hasDivineUnlocked = false; // Strictly requires lotus interaction in Round 1
      // In round 1, morph is strictly hidden, and divine shows only once unlocked
      if (this.morphGroup) this.morphGroup.style.display = 'none';
      if (this.killsGroup) this.killsGroup.style.display = 'none';
      if (this.keyGroup) this.keyGroup.style.display = 'none';
      if (this.divineGroup) this.divineGroup.style.display = 'none';
    }

    this.player.vx = 0;
    this.player.vy = 0;
    this.player.maxHp = index === 4 ? L4_CONFIG.PLAYER_MAX_HP : 20;
    this.player.hp = this.player.maxHp;
    this.player.hasKey = false;
    this.player.isClimbing = false;
    this.player.isGrounded = true;
    this.player.isDead = false;
    this.player.isAttacking = false;
    this.player.doorwayFade = 1.0;
    this.player.currentPlatform = null;
    this.playerDying = false;
    if (this.deathScreen) {
      this.deathScreen.classList.remove('active');
    }
    this.player.spawnPoof(20);

    if (index === 4) {
      // The arena's final chapter starts in the divine form used by its combat balance.
      this.player.revertToMortal();
      this.player.hasDivineUnlocked = true;
      this.player.triggerDivineTransformation();
    }
  }

  update(dt) {
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

    // Level 3 intentionally advances through a scripted defeat. Let its own
    // fade and epilogue run instead of triggering the regular checkpoint reset.
    if (this.currentLevelIndex === 3 && this.player.hp <= 0) {
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
        this.loadLevel(4);
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

    // Level switching shortcuts [1] and [2]
    if (Input.isPressed('one') && this.currentLevelIndex !== 1) {
      this.loadLevel(1);
      return;
    }
    if (Input.isPressed('two') && this.currentLevelIndex !== 2) {
      this.loadLevel(2);
      return;
    }

    // Restart [R]
    if (Input.isPressed('reset') || Input.isPressed('KeyR')) {
      this.resetGame();
      return;
    }

    // Morph Object Ability [Q] (Level 2 only - completely disabled in round 1)
    if (Input.isPressed('morph') || Input.isPressed('q')) {
      if (this.currentLevelIndex === 2 && this.level.triggerMorph) {
        const morphed = this.level.triggerMorph(this.player.x, this.player.y);
        if (morphed) {
          this.openDialogue(this.level.lastMorphMessage || "Transmutation unleashed! The sacred stone transforms into an unstoppable rolling sphere!", 'kali', '⚜ MAA KALI: TRANSMUTATION ⚜');
        }
      }
    }

    // 1. Check nearby inspection points
    const nearby = this.level.getNearbyInteractable(this.player.x, this.player.y);
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

    // 2. Handle [E] / [Z] / [Enter] to interact, pull lever, open chest, or unlock door
    if (Input.isPressed('interact') || Input.isPressed('e') || Input.isPressed('z') || Input.isPressed('enter')) {
      if (this.levelCompleted) {
        if (this.currentLevelIndex === 1) {
          // Transition to Level 2!
          this.loadLevel(2);
          return;
        } else if (this.currentLevelIndex === 2) {
          // Continue into the chosen Upgrade Level 3.
          this.loadLevel(3);
          return;
        } else if (this.currentLevelIndex === 4) {
          this.loadLevel(1);
          return;
        } else {
          this.resetGame();
          return;
        }
      }

      if (this.dialogueActive) {
        this.closeDialogue();
      } else if (nearby) {
        // LEVEL 1: Sacred Lotus Awakening (Unlocks X ability - Taught by Maa Kali)
        if (nearby.type === 'lotus_awakening' || nearby.id === 'sacred_lotus') {
          this.player.hasDivineUnlocked = true;
          if (this.divineGroup) this.divineGroup.style.display = 'flex';
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
          this.openDialogue("You pull the ancient mechanism. Deep tremors reverberate through the temple as the sacred stone pillar rises from the depths!");
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
          this.openDialogue(nearby.text, nearby.speaker || 'stele', nearby.title);
        }
      }
    } else if (Input.isPressed('cancel')) {
      if (this.dialogueActive) {
        this.closeDialogue();
      }
    }

    // 3. Update player and level (passes player for enemy & hazard collision)
    this.player.update(dt, this.level, this.dialogueActive);
    this.level.update(this.player.x, this.player.y, dt, this.player.isDivine, this.player);

    // 4. Check Level Complete (Walking into Black Space Doorway)
    if (!this.levelCompleted && this.level.checkLevelComplete(this.player.x, this.player.y)) {
      this.levelCompleted = true;
      this.showLevelCompleteModal();
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
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'RUINS OF SURYA CONQUERED';
      if (this.completeFlavor) this.completeFlavor.textContent = '* You step into the eternal darkness of the sanctum.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] ENTER LEVEL 2  |  [R] REPLAY';
    } else if (this.currentLevelIndex === 2) {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 2 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'DESERT CATACOMBS CLEARED';
      if (this.completeFlavor) this.completeFlavor.textContent = '* The sealed passage opens onto the overgrown heart of the ruins.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] ENTER LEVEL 3  |  [R] REPLAY';
    } else {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 4 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'CELESTIAL ARENA CONQUERED';
      if (this.completeFlavor) this.completeFlavor.textContent = '* The champions fall and the celestial relic is yours.';
      if (this.completePrompt) this.completePrompt.textContent = '[E] RETURN TO LEVEL 1  |  [R] REPLAY ARENA';
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
    const scaleX = this.canvas.width / this.level.width;
    const scaleY = this.canvas.height / this.level.height;
    this.zoom = Math.max(scaleX, scaleY);

    const viewW = this.canvas.width / this.zoom;
    const viewH = this.canvas.height / this.zoom;

    let targetX = this.player.x - viewW / 2;
    let targetY = this.player.y - viewH / 2 - 20;

    const maxCamX = Math.max(0, this.level.width - viewW);
    const maxCamY = Math.max(0, this.level.height - viewH);

    targetX = Math.max(0, Math.min(targetX, maxCamX));
    targetY = Math.max(0, Math.min(targetY, maxCamY));

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
    if (!this.hudEl) return;

    // HP Bar Update (Reflects damage: curved SVG line drains smoothly from right to left)
    const hpRatio = Math.max(0, Math.min(1, this.player.hp / this.player.maxHp));
    if (this.hpSvgFill) {
      let totalLen = 266;
      try {
        if (typeof this.hpSvgFill.getTotalLength === 'function') {
          const l = this.hpSvgFill.getTotalLength();
          if (l > 0) totalLen = l;
        }
      } catch (e) {}
      this.hpSvgFill.style.strokeDasharray = `${totalLen}`;
      this.hpSvgFill.style.strokeDashoffset = `${(1 - hpRatio) * totalLen}`;
    }
    if (this.hpFill) {
      this.hpFill.style.width = (hpRatio * 100) + '%';
    }
    if (this.hpNum && this.player) {
      this.hpNum.textContent = this.player.hp + ' / ' + this.player.maxHp;
    }

    // Key Inventory Badge
    if (this.keyGroup) {
      this.keyGroup.style.display = (this.player && this.player.hasKey) ? 'flex' : 'none';
    }

    // Kill Counter Badge (Tracks kills in level)
    if (this.killsGroup && this.killsBadge) {
      if (this.level && this.level.kills !== undefined && this.level.kills > 0) {
        this.killsGroup.style.display = 'flex';
        this.killsBadge.textContent = '☠ KILLS: ' + this.level.kills;
      } else {
        this.killsGroup.style.display = 'none';
      }
    }

    // Kill Toast Sync
    if (this.killToast) {
      if (this.level && this.level.killToastTimer > 0) {
        if (this.killToastText && this.level.killToastText) {
          this.killToastText.textContent = this.level.killToastText;
        }
        this.killToast.classList.add('active');
      } else {
        this.killToast.classList.remove('active');
      }
    }

    // Visibility: Morph only in Level 2; Divine Sands only once unlocked
    if (this.morphGroup) {
      this.morphGroup.style.display = (this.currentLevelIndex === 2) ? 'flex' : 'none';
    }
    if (this.divineGroup) {
      this.divineGroup.style.display = (this.player.hasDivineUnlocked || this.currentLevelIndex === 2) ? 'flex' : 'none';
    }

    // Medallion Divine Sands Ring Gauge (Circumference ~154px)
    if (this.divineRingFill) {
      if (this.player.isDivine || this.player.isTransforming) {
        const pct = this.player.isTransforming ? 1.0 : Math.max(0, Math.min(1, this.player.divineTimer / this.player.divineDuration));
        this.divineRingFill.style.strokeDashoffset = `${(1 - pct) * 154}`;
        this.divineRingFill.style.opacity = '1';
      } else if (this.player.hasDivineUnlocked || this.currentLevelIndex === 2) {
        this.divineRingFill.style.strokeDashoffset = '0';
        this.divineRingFill.style.opacity = '0.7';
      } else {
        this.divineRingFill.style.strokeDashoffset = '154';
        this.divineRingFill.style.opacity = '0.2';
      }
    }

    // Divine Form HUD State
    if (this.player.isDivine || this.player.isTransforming) {
      this.hudEl.classList.add('divine-mode');
      if (this.hudName) this.hudName.textContent = 'RAKTI (KALI)';
      if (this.divineLabel) this.divineLabel.textContent = 'SANDS OF KALI';

      const pct = Math.max(0, (this.player.divineTimer / this.player.divineDuration) * 100);
      if (this.divineFill) this.divineFill.style.width = pct + '%';
      if (this.divineTime) this.divineTime.textContent = this.player.isTransforming ? 'AWAKENING' : this.player.divineTimer.toFixed(1) + 's';
    } else {
      this.hudEl.classList.remove('divine-mode');
      if (this.hudName) this.hudName.textContent = 'RAKTI';
      if (this.divineLabel) this.divineLabel.textContent = '[X] DIVINE SANDS';
      if (this.divineFill) this.divineFill.style.width = '0%';
      if (this.divineTime) this.divineTime.textContent = '';
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

    // 4. Divine Sparks, Damage & Leap Particles
    this.player.renderParticles(ctx);

    ctx.restore();
  }
}
