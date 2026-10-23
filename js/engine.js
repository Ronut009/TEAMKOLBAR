/**
 * ==========================================================================
 * GLITCHVERSE - CORE ENGINE (js/engine.js)
 * Fullscreen dynamic camera, multi-level management (Level 1 & Level 2),
 * Undertale HUD binding, Climbing, Morphing [Q], and Quest progression.
 * ==========================================================================
 */

import { Input } from './input.js';
import { Level2 } from './level2.js';

export class Engine {
  constructor(canvas, level, player) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Levels
    this.level1 = level;
    this.level2 = new Level2();
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
    this.hpNum = document.getElementById('hpNum');

    this.divineFill = document.getElementById('divineFill');
    this.divineTime = document.getElementById('divineTime');
    this.divineLabel = document.getElementById('divineLabel');

    this.morphGroup = document.getElementById('morphGroup');
    this.keyGroup = document.getElementById('keyGroup');

    this.dialogueBox = document.getElementById('dialogueBox');
    this.dialogueText = document.getElementById('dialogueText');
    this.interactPrompt = document.getElementById('interactPrompt');
    this.interactPromptText = document.getElementById('interactPromptText');

    this.levelCompleteModal = document.getElementById('levelCompleteModal');
    this.completeTitle = document.getElementById('completeTitle');
    this.completeSubtitle = document.getElementById('completeSubtitle');
    this.completeFlavor = document.getElementById('completeFlavor');
    this.completePrompt = document.getElementById('completePrompt');

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
    this.level = (index === 2) ? this.level2 : this.level1;
    this.level.reset();
    this.levelCompleted = false;
    this.closeDialogue();

    if (this.levelCompleteModal) {
      this.levelCompleteModal.classList.remove('active');
    }

    if (this.hudLv) {
      this.hudLv.textContent = 'LV ' + index;
    }

    if (index === 2) {
      // Start in Level 2: Left sand dune / stone ledge
      this.player.x = 100;
      this.player.y = 325;
      if (this.morphGroup) this.morphGroup.style.display = 'flex';
    } else {
      // Start in Level 1: Sunken courtyard
      this.player.x = 160;
      this.player.y = 368;
      if (this.morphGroup) this.morphGroup.style.display = 'none';
    }

    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hp = 20;
    this.player.hasKey = false;
    this.player.isClimbing = false;
    this.player.isGrounded = true;
    this.player.doorwayFade = 1.0;
    this.player.currentPlatform = null;
    this.player.spawnPoof(20);
  }

  update(dt) {
    // 0. Level switching shortcuts [1] and [2]
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

    // Morph Object Ability [Q]
    if (Input.isPressed('morph') || Input.isPressed('q')) {
      if (this.level.triggerMorph) {
        const morphed = this.level.triggerMorph(this.player.x, this.player.y);
        if (morphed) {
          this.openDialogue("* Transmutation Magic activated!\n* The square crate morphs into a heavy stone boulder!\n* It rolls off the edge and plunges down toward the archer!");
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
        } else {
          this.resetGame();
          return;
        }
      }

      if (this.dialogueActive) {
        this.closeDialogue();
      } else if (nearby) {
        // LEVEL 1: Lever Interaction
        if (nearby.type === 'lever' && !this.level.lever.activated) {
          this.level.pullLever();
          this.openDialogue("* You pull the ancient stone lever.\n* Deep rumbling echoes through the submerged temple!\n* A massive carved stone pillar emerges from the watery abyss!");
        }
        // LEVEL 2: Chest Interaction (Obtain Sanctum Key)
        else if (nearby.type === 'chest' && !this.level.chest.opened) {
          this.level.chest.opened = true;
          this.player.hasKey = true;
          this.openDialogue("* You open the ancient sunken chest.\n* Inside, you find the [SANCTUM KEY]!\n* The locked door on the lower right can now be opened.");
        }
        // LEVEL 2: Locked Door Interaction
        else if (nearby.type === 'locked_door') {
          if (this.player.hasKey && !this.level.lockedDoor.unlocked) {
            this.level.lockedDoor.unlocked = true;
            this.level.cameraShake = 0.8;
            this.openDialogue("* You insert the Sanctum Key into the glowing cyan padlock...\n* CLICK! The padlock shatters and the heavy stone doors slide open!");
          } else if (!this.player.hasKey) {
            this.openDialogue("* The heavy stone door is sealed by a glowing cyan padlock.\n* A key is required to open it!");
          }
        }
        // General text landmark
        else {
          this.openDialogue(nearby.text);
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
    } else {
      if (this.completeTitle) this.completeTitle.textContent = 'LEVEL 2 COMPLETE';
      if (this.completeSubtitle) this.completeSubtitle.textContent = 'DESERT CATACOMBS CLEARED';
      if (this.completeFlavor) this.completeFlavor.textContent = '* You unlock the inner sanctum. The mysteries of Surya await!';
      if (this.completePrompt) this.completePrompt.textContent = '[R] PLAY AGAIN';
    }

    this.levelCompleteModal.classList.add('active');
  }

  resetGame() {
    this.loadLevel(this.currentLevelIndex);
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

    // HP Bar Update (Reflects damage: e.g. 20 -> 15 HP)
    if (this.hpFill && this.player) {
      const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
      this.hpFill.style.width = hpPct + '%';
    }
    if (this.hpNum && this.player) {
      this.hpNum.textContent = this.player.hp + ' / ' + this.player.maxHp;
    }

    // Key Inventory Badge
    if (this.keyGroup) {
      this.keyGroup.style.display = (this.player && this.player.hasKey) ? 'flex' : 'none';
    }

    // Divine Form HUD State
    if (this.player.isDivine) {
      this.hudEl.classList.add('divine-mode');
      if (this.hudName) this.hudName.textContent = 'KALI';
      if (this.divineLabel) this.divineLabel.textContent = 'DIVINE FORM';

      const pct = Math.max(0, (this.player.divineTimer / this.player.divineDuration) * 100);
      if (this.divineFill) this.divineFill.style.width = pct + '%';
      if (this.divineTime) this.divineTime.textContent = this.player.divineTimer.toFixed(1) + 's';
    } else {
      this.hudEl.classList.remove('divine-mode');
      if (this.hudName) this.hudName.textContent = 'CHARA';
      if (this.divineLabel) this.divineLabel.textContent = '[X] DIVINE';
      if (this.divineFill) this.divineFill.style.width = '0%';
      if (this.divineTime) this.divineTime.textContent = '';
    }
  }

  openDialogue(text) {
    this.dialogueActive = true;
    if (this.dialogueBox && this.dialogueText) {
      this.dialogueText.textContent = text;
      this.dialogueBox.style.display = 'block';
    }
  }

  closeDialogue() {
    this.dialogueActive = false;
    if (this.dialogueBox) {
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

    // 5. Ambient Dust / Lotus Spores
    this.level.renderSpores(ctx);

    ctx.restore();
  }
}
