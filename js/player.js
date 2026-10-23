/**
 * ==========================================================================
 * GLITCHVERSE - PLAYER ENTITY (js/player.js)
 * 2D Platformer Physics, Platform Landing, Drop-Through, & 6-Sec Divine Kali Shift.
 * ==========================================================================
 */

import { Input } from './input.js';

export class Player {
  constructor(startX = 160, startY = 366) {
    this.x = startX;
    this.y = startY; // Foot position at platform surface

    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 195;
    this.divineSpeed = 255;
    this.speed = this.baseSpeed;
    this.acceleration = 1600;
    this.friction = 1400;

    // Platformer Jump Physics
    this.gravity = 920;
    this.jumpImpulse = -430;
    this.divineJumpImpulse = -540;
    this.isGrounded = true;
    this.currentPlatform = null;

    // Dropping down through one-way platforms
    this.dropThroughTimer = 0;

    // Visual dimensions & collision bounds
    this.width = 46;
    this.height = 50;
    this.divineWidth = 54;
    this.divineHeight = 60;

    this.facing = 'right'; // 'left' | 'right'
    this.isMoving = false;
    this.animTime = 0;
    this.stepCycle = 0;

    // Divine Transformation State (6-Second Duration)
    this.isDivine = false;
    this.divineDuration = 6.0;
    this.divineTimer = 0.0;
    this.divinePulse = 0.0;

    // Image preloading with cache handling
    this.mortalLoaded = false;
    this.imgMortal = new Image();
    this.imgMortal.onload = () => { this.mortalLoaded = true; };
    this.imgMortal.src = 'assets/mc_mortal.png';
    if (this.imgMortal.complete && this.imgMortal.naturalWidth > 0) {
      this.mortalLoaded = true;
    }

    this.divineLoaded = false;
    this.imgDivine = new Image();
    this.imgDivine.onload = () => { this.divineLoaded = true; };
    this.imgDivine.src = 'assets/mc_divine.png';
    if (this.imgDivine.complete && this.imgDivine.naturalWidth > 0) {
      this.divineLoaded = true;
    }

    // Particles and divine aura trails
    this.particles = [];

    // Vitality stats
    this.hp = 20;
    this.maxHp = 20;
  }

  triggerDivineTransformation() {
    this.isDivine = true;
    this.divineTimer = this.divineDuration;
    this.speed = this.divineSpeed;

    const flash = document.getElementById('divineFlash');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 250);
    }

    // Golden & crimson divine shockwave
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const speed = 70 + Math.random() * 80;
      this.particles.push({
        x: this.x,
        y: this.y - 25,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.55 + Math.random() * 0.25,
        maxLife: 0.8,
        size: 3 + Math.random() * 2,
        color: i % 2 === 0 ? '#ffd700' : '#ff0055'
      });
    }
  }

  revertToMortal() {
    this.isDivine = false;
    this.divineTimer = 0.0;
    this.speed = this.baseSpeed;

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y - 25,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        life: 0.4,
        maxLife: 0.4,
        size: 2,
        color: '#ffea79'
      });
    }
  }

  update(dt, level, dialogueActive = false) {
    this.animTime += dt;
    this.divinePulse += dt * 4.0;

    if (this.dropThroughTimer > 0) {
      this.dropThroughTimer -= dt;
    }

    // Freeze controls during dialogue
    if (dialogueActive) {
      this.vx = 0;
      this.isMoving = false;
      this.updateParticles(dt);
      return;
    }

    // 1. Process Divine Form Trigger (Key X)
    if (Input.isPressed('KeyX') || Input.isPressed('x')) {
      if (!this.isDivine) {
        this.triggerDivineTransformation();
      }
    }

    // 2. Divine Timer Countdown
    if (this.isDivine) {
      this.divineTimer -= dt;

      if (Math.random() < 0.75) {
        this.particles.push({
          x: this.x + (Math.random() - 0.5) * 26,
          y: this.y - 20 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 20,
          vy: -15 - Math.random() * 35,
          life: 0.45,
          maxLife: 0.45,
          size: 2 + Math.random() * 2,
          color: Math.random() > 0.4 ? '#ffd700' : '#ff0055'
        });
      }

      if (this.divineTimer <= 0) {
        this.revertToMortal();
      }
    }

    // 3. Horizontal Movement (A / D, Left / Right)
    let moveDir = 0;
    if (Input.isDown('left') || Input.isDown('KeyA') || Input.isDown('ArrowLeft')) moveDir -= 1;
    if (Input.isDown('right') || Input.isDown('KeyD') || Input.isDown('ArrowRight')) moveDir += 1;

    this.isMoving = (moveDir !== 0);
    if (moveDir < 0) this.facing = 'left';
    else if (moveDir > 0) this.facing = 'right';

    const targetVx = moveDir * this.speed;
    if (this.isMoving) {
      this.vx = this.approach(this.vx, targetVx, this.acceleration * dt);
      this.stepCycle += dt * (this.isDivine ? 10.5 : 8.5);
    } else {
      this.vx = this.approach(this.vx, 0, this.friction * dt);
      this.stepCycle = 0;
    }

    // 4. Jump & Drop-Through Physics
    const jumpPressed = Input.isPressed('Space') || Input.isPressed('jump') || Input.isPressed('KeyW') || Input.isPressed('ArrowUp');
    const isDownHeld = Input.isDown('down') || Input.isDown('KeyS') || Input.isDown('ArrowDown');

    if (jumpPressed && this.isGrounded) {
      if (isDownHeld && this.currentPlatform && this.currentPlatform.oneWay) {
        // Drop down through current one-way platform
        this.dropThroughTimer = 0.25;
        this.isGrounded = false;
        this.currentPlatform = null;
        this.vy = 80; // Small downward nudge
      } else {
        // Standard Jump (or Divine Jump)
        const impulse = this.isDivine ? this.divineJumpImpulse : this.jumpImpulse;
        this.vy = impulse;
        this.isGrounded = false;
        this.currentPlatform = null;
        this.spawnPoof(8);
      }
    }

    // 5. Apply Gravity
    if (!this.isGrounded) {
      this.vy += this.gravity * dt;
    }

    // 6. Platform Collision & Integration
    const prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Keep within horizontal boundaries
    this.x = Math.max(20, Math.min(this.x, level.width - 20));

    // Check platform landings when falling
    if (this.vy >= 0) {
      const dropping = (this.dropThroughTimer > 0);
      const landed = level.checkPlatformLanding(prevY, this.y, this.x, dropping);

      if (landed) {
        this.y = landed.y;
        this.vy = 0;
        this.isGrounded = true;
        this.currentPlatform = landed;
      } else if (this.isGrounded) {
        // Check if stepped off current platform edge
        if (!level.isOnPlatform(this.x, this.y)) {
          this.isGrounded = false;
          this.currentPlatform = null;
        }
      }
    }

    // 7. Chasm Respawn (Soft aqua lotus teleport if falling into bottom abyss)
    if (this.y > 420) {
      this.x = 200;
      this.y = 366;
      this.vy = 0;
      this.vx = 0;
      this.isGrounded = true;
      this.spawnAquaRespawn();
    }

    // 8. Reset Key (R)
    if (Input.isPressed('KeyR') || Input.isPressed('reset')) {
      this.x = 200;
      this.y = 366;
      this.vx = 0;
      this.vy = 0;
      this.isGrounded = true;
      this.spawnPoof(12);
    }

    this.updateParticles(dt);
  }

  approach(curr, target, step) {
    if (curr < target) return Math.min(curr + step, target);
    if (curr > target) return Math.max(curr - step, target);
    return target;
  }

  spawnPoof(count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y - 2,
        vx: Math.cos(angle) * 36,
        vy: Math.sin(angle) * 16,
        life: 0.3,
        maxLife: 0.3,
        size: 2,
        color: this.isDivine ? '#ffd700' : '#4eedff'
      });
    }
  }

  spawnAquaRespawn() {
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y - 20,
        vx: Math.cos(angle) * 50,
        vy: Math.sin(angle) * 50,
        life: 0.5,
        maxLife: 0.5,
        size: 3,
        color: '#4eedff'
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  renderShadow(ctx) {
    if (this.isGrounded) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      const sw = this.isDivine ? 18 : 14;
      const sh = this.isDivine ? 6 : 4;
      ctx.ellipse(this.x, this.y + 1, sw, sh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderParticles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      const s = p.size || 2;
      ctx.fillRect(Math.floor(p.x - s / 2), Math.floor(p.y - s / 2), s, s);
    }
    ctx.restore();
  }

  render(ctx) {
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);

    const bob = (this.isMoving && this.isGrounded) ? Math.abs(Math.sin(this.stepCycle)) * 2.5 : 0;
    const isFacingLeft = (this.facing === 'left');

    ctx.save();

    // 1. Divine Aura & Mandala Halo (When in Maa Kali Divine Form)
    if (this.isDivine) {
      this.drawDivineAura(ctx, cx, cy - 30 - bob);
    }

    // 2. Undertale Red SOUL Heart indicator when leaping
    if (!this.isGrounded) {
      ctx.fillStyle = '#ff0000';
      ctx.font = '11px monospace';
      ctx.fillText('❤', cx - 5, cy - 56 - bob);
    }

    // 3. Render Sprite (Mortal Warrior or Divine Kali)
    ctx.save();
    ctx.translate(cx, cy); // Anchor at feet
    if (isFacingLeft) {
      ctx.scale(-1, 1); // Flip horizontally when facing left
    }

    const mortalReady = this.mortalLoaded || (this.imgMortal.complete && this.imgMortal.naturalWidth > 0);
    const divineReady = this.divineLoaded || (this.imgDivine.complete && this.imgDivine.naturalWidth > 0);

    if (this.isDivine && divineReady) {
      // Maa Kali Divine Form Sprite (proportional to platforms & doorway)
      const renderW = this.divineWidth;
      const renderH = this.divineHeight;
      ctx.drawImage(
        this.imgDivine,
        -renderW / 2,
        -renderH - bob,
        renderW,
        renderH
      );
    } else if (mortalReady) {
      // Mortal Warrior Sprite (scaled to match temple scale perfectly)
      const renderW = this.width;
      const renderH = this.height;
      ctx.drawImage(
        this.imgMortal,
        -renderW / 2,
        -renderH - bob,
        renderW,
        renderH
      );
    } else {
      // Fallback avatar
      ctx.fillStyle = '#e86a17';
      ctx.fillRect(-10, -32 - bob, 20, 32);
    }

    ctx.restore();
    ctx.restore();
  }

  drawDivineAura(ctx, x, y) {
    ctx.save();
    const pulse = Math.sin(this.divinePulse) * 3;
    const radius = 24 + pulse;

    const bloom = ctx.createRadialGradient(x, y, 4, x, y, radius + 12);
    bloom.addColorStop(0, 'rgba(255, 0, 85, 0.45)');
    bloom.addColorStop(0.5, 'rgba(56, 225, 255, 0.2)');
    bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    const rot = this.animTime * 1.5;
    ctx.strokeStyle = '#ffea79';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8 + rot;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * (radius - 2), y + Math.sin(angle) * (radius - 2));
      ctx.lineTo(x + Math.cos(angle) * (radius + 5), y + Math.sin(angle) * (radius + 5));
      ctx.stroke();
    }
    ctx.restore();
  }
}
