/**
 * ==========================================================================
 * GLITCHVERSE - CORE ENGINE (js/engine.js)
 * Fullscreen dynamic camera, platformer render loop, and Undertale HUD binding.
 * ==========================================================================
 */

import { Input } from './input.js';

export class Engine {
  constructor(canvas, level, player) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.level = level;
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
    this.divineFill = document.getElementById('divineFill');
    this.divineTime = document.getElementById('divineTime');
    this.divineLabel = document.getElementById('divineLabel');

    this.dialogueBox = document.getElementById('dialogueBox');
    this.dialogueText = document.getElementById('dialogueText');
    this.interactPrompt = document.getElementById('interactPrompt');
    this.interactPromptText = document.getElementById('interactPromptText');
    this.levelCompleteModal = document.getElementById('levelCompleteModal');
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

  update(dt) {
    // 0. Handle Restart [R]
    if (Input.isPressed('reset') || Input.isPressed('KeyR')) {
      this.resetGame();
      return;
    }

    // 1. Check nearby inspection points (Undertale interaction)
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

    // 2. Handle [E] / [Z] / [Enter] to open or advance dialogue & pull lever
    if (Input.isPressed('interact') || Input.isPressed('e') || Input.isPressed('z') || Input.isPressed('enter')) {
      if (this.dialogueActive) {
        this.closeDialogue();
      } else if (nearby) {
        if (nearby.type === 'lever' && !this.level.lever.activated) {
          this.level.pullLever();
          this.openDialogue("* You pull the ancient stone lever.\n* Deep rumbling echoes through the submerged temple!\n* A massive carved stone pillar emerges from the watery abyss!");
        } else {
          this.openDialogue(nearby.text);
        }
      }
    } else if (Input.isPressed('cancel')) {
      if (this.dialogueActive) {
        this.closeDialogue();
      }
    }

    // 3. Update player and level
    this.player.update(dt, this.level, this.dialogueActive);
    this.level.update(this.player.x, this.player.y, dt, this.player.isDivine);

    // 4. Check Level Complete (Walking into Black Space Doorway)
    if (!this.levelCompleted && this.level.checkLevelComplete(this.player.x, this.player.y)) {
      this.levelCompleted = true;
      if (this.levelCompleteModal) {
        this.levelCompleteModal.classList.add('active');
      }
    }

    if (this.levelCompleted && this.player.doorwayFade > 0) {
      this.player.doorwayFade = Math.max(0, this.player.doorwayFade - dt * 2.2);
    }

    // 5. Update Camera viewport
    this.updateCamera(dt);

    // 6. Update Divine Form HUD State
    this.updateDivineHUD();
  }

  resetGame() {
    this.level.reset();
    this.player.x = 160;
    this.player.y = 368;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.currentPlatform = null;
    this.player.doorwayFade = 1.0;
    this.levelCompleted = false;
    this.closeDialogue();
    if (this.levelCompleteModal) {
      this.levelCompleteModal.classList.remove('active');
    }
    this.player.spawnPoof(16);
  }

  updateCamera(dt) {
    // Zoom fills the screen with the 1024x434 map
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

    // Apply Screen Shake when lever activates or pillar rises
    if (this.level.cameraShake > 0) {
      const shakeMag = this.level.cameraShake * 5.0;
      this.camX += (Math.random() - 0.5) * shakeMag;
      this.camY += (Math.random() - 0.5) * shakeMag;
    }
  }

  updateDivineHUD() {
    if (!this.hudEl) return;

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

    // Apply Camera transform with crisp pixel scaling
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-Math.floor(this.camX), -Math.floor(this.camY));

    // 1. Submerged Temple Map (Artwork, god rays, golden bridge shimmer, blue lotus auras)
    this.level.renderBackground(ctx, this.player.isDivine);

    // 2. Character Platform Shadow
    this.player.renderShadow(ctx);

    // 3. Player Sprite (Mortal Warrior or Divine Kali)
    this.player.render(ctx);

    // 4. Divine Sparks & Leap Particles
    this.player.renderParticles(ctx);

    // 5. Floating Underwater Bubbles & Lotus Spores
    this.level.renderSpores(ctx);

    ctx.restore();
  }
}
