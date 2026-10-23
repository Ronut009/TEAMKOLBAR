/**
 * ==========================================================================
 * UNDERWATER RUINS - ENGINE (js/engine.js)
 * Side-scrolling game loop, rendering pipeline, Undertale HUD & dialogue.
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

    // Dialogue
    this.dialogueActive = false;

    // DOM refs
    this.hudEl = document.getElementById('hud');
    this.hudName = document.getElementById('hudName');
    this.divineFill = document.getElementById('divineFill');
    this.divineTime = document.getElementById('divineTime');
    this.divineLabel = document.getElementById('divineLabel');
    this.dialogueBox = document.getElementById('dialogueBox');
    this.dialogueText = document.getElementById('dialogueText');
    this.interactPrompt = document.getElementById('interactPrompt');

    this.resizeCanvas = this.resizeCanvas.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.resizeCanvas);
    this.resizeCanvas();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false;
    if (this.level?.camera) {
      this.level.camera.width = window.innerWidth;
      this.level.camera.height = window.innerHeight;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
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
    // Nearby interactable check
    const nearby = this.level.getNearbyInteractable(this.player.x, this.player.y - this.player.hitH / 2);
    if (this.interactPrompt) {
      this.interactPrompt.style.display = (nearby && !this.dialogueActive) ? 'block' : 'none';
    }

    // Z / Enter to open or close dialogue
    if (Input.isPressed('interact') || Input.isPressed('z') || Input.isPressed('enter')) {
      if (this.dialogueActive) {
        this.closeDialogue();
      } else if (nearby) {
        this.openDialogue(nearby.text);
      }
    }
    if (Input.isPressed('cancel') || Input.isPressed('x')) {
      if (this.dialogueActive) this.closeDialogue();
    }

    this.player.update(dt, this.level, this.dialogueActive);
    this.level.update(this.player.x, this.player.y, dt);
    this.updateDivineHUD();
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
    if (this.dialogueBox) this.dialogueBox.style.display = 'none';
  }

  render() {
    const ctx = this.ctx;
    const cam = this.level.camera;
    const cW = this.canvas.width;
    const cH = this.canvas.height;

    ctx.clearRect(0, 0, cW, cH);

    // Scale canvas so the 720px tall world fills the screen vertically
    const scaleY = cH / this.level.height;
    const scaleX = scaleY; // maintain aspect ratio
    const displayW = this.level.width * scaleX;

    // Clamp camera X
    const maxCamX = Math.max(0, this.level.width - this.level.width); // full world visible
    const camX = cam.x;
    const camY = cam.y;

    ctx.save();
    // Scale so that level height maps to canvas height
    ctx.scale(scaleX, scaleY);
    // Translate by camera (already in world coords)
    ctx.translate(-camX, -camY);

    // Layer 1: Background (underwater gradient, silhouettes, light rays)
    this.level.renderBackground(ctx);

    // Layer 2: Fish schools (very far back atmosphere)
    this.level.renderFishSchools(ctx);

    // Layer 3: Seaweed vines
    this.level.renderSeaweed(ctx);

    // Layer 4: Golden bridge arc
    this.level.renderBridge(ctx);

    // Layer 5: Player shadow
    this.player.renderShadow(ctx, camX, camY);

    // Layer 6: Player sprite
    this.player.render(ctx, camX, camY);

    // Layer 7: Particles
    this.player.renderParticles(ctx, camX, camY);

    // Layer 8: Blue lotus flowers (above everything, they glow through)
    this.level.renderLotus(ctx);

    // Layer 9: Bubbles
    this.level.renderBubbles(ctx);

    ctx.restore();

    // Layer 10: Full-screen underwater overlay effects (in screen space)
    this.renderUnderwaterOverlay(ctx, cW, cH);
  }

  renderUnderwaterOverlay(ctx, cW, cH) {
    // Subtle top-to-bottom dark water gradient overlay (screen space)
    const topFog = ctx.createLinearGradient(0, 0, 0, cH * 0.18);
    topFog.addColorStop(0, 'rgba(5, 5, 22, 0.65)');
    topFog.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topFog;
    ctx.fillRect(0, 0, cW, cH * 0.18);

    const botFog = ctx.createLinearGradient(0, cH * 0.85, 0, cH);
    botFog.addColorStop(0, 'rgba(0, 0, 0, 0)');
    botFog.addColorStop(1, 'rgba(2, 3, 14, 0.7)');
    ctx.fillStyle = botFog;
    ctx.fillRect(0, cH * 0.85, cW, cH * 0.15);
  }

  triggerCombat(npc) {
    console.log('[Phase 3 Hook] Combat trigger ready.');
  }

  loadLevel(levelIndex) {
    console.log(`[Phase 4 Hook] Load level ${levelIndex}`);
  }
}
