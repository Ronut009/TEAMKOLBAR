/**
 * ==========================================================================
 * GLITCHVERSE - CORE ENGINE (js/engine.js)
 * Fullscreen dynamic viewport, Y-sorted rendering, and Undertale dialogue system.
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

    // Dialogue State (Undertale dialogue system)
    this.dialogueActive = false;
    this.currentInteractable = null;

    // Cached DOM elements
    this.dialogueBox = document.getElementById('dialogueBox');
    this.dialogueText = document.getElementById('dialogueText');
    this.interactPrompt = document.getElementById('interactPrompt');
    this.hpFill = document.getElementById('hpFill');
    this.hpNum = document.getElementById('hpNum');

    this.resizeCanvas = this.resizeCanvas.bind(this);
    this.loop = this.loop.bind(this);

    window.addEventListener('resize', this.resizeCanvas);
    this.resizeCanvas();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false;

    if (this.level && this.level.camera) {
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
    // 1. Check nearby inspection points (Undertale interaction)
    const nearby = this.level.getNearbyInteractable(this.player.x, this.player.y);
    this.currentInteractable = nearby;

    if (this.interactPrompt) {
      if (nearby && !this.dialogueActive) {
        this.interactPrompt.style.display = 'block';
      } else {
        this.interactPrompt.style.display = 'none';
      }
    }

    // 2. Handle [Z] / [Enter] to open or advance dialogue
    if (Input.isPressed('interact') || Input.isPressed('z') || Input.isPressed('enter')) {
      if (this.dialogueActive) {
        // Close dialogue
        this.closeDialogue();
      } else if (nearby) {
        // Open dialogue with text
        this.openDialogue(nearby.text);
      }
    } else if (Input.isPressed('cancel') || Input.isPressed('x')) {
      if (this.dialogueActive) {
        this.closeDialogue();
      }
    }

    // 3. Update player and level
    this.player.update(dt, this.level, this.dialogueActive);
    this.level.update(this.player.x, this.player.y, dt);
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
    const cam = this.level.camera;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Background Layer (Earth & ruins tiles)
    this.level.renderBackground(ctx);

    // 2. Ground Altitude Shadow
    this.player.renderShadow(ctx, cam.x, cam.y);

    // 3. Y-Sorted Entities (Depth sorting)
    const renderList = [];
    for (const prop of this.level.props) {
      renderList.push({
        y: prop.y,
        render: () => this.level.renderProp(ctx, prop)
      });
    }

    renderList.push({
      y: this.player.y,
      render: () => this.player.render(ctx, cam.x, cam.y)
    });

    renderList.sort((a, b) => a.y - b.y);
    for (const item of renderList) {
      item.render();
    }

    // 4. Aerial Particles
    this.player.renderParticles(ctx, cam.x, cam.y);

    // 5. Atmospheric Lighting & Ambient Sparks
    this.level.renderLighting(ctx);
    this.level.renderAmbientParticles(ctx);
  }

  triggerCombat(npc) {
    console.log('[Phase 3 Hook] Undertale battle box trigger ready.');
  }

  loadLevel(levelIndex) {
    console.log(`[Phase 4 Hook] Level progression to index ${levelIndex} ready.`);
  }
}
