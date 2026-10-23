/**
 * ==========================================================================
 * GLITCHVERSE - PLAYER ENTITY (js/player.js)
 * Features Mortal MC & Divine Form (Maa Kali) with 6-second X-key transition.
 * ==========================================================================
 */

import { Input } from './input.js';

export class Player {
  constructor(startX = 736, startY = 576) {
    this.x = startX;
    this.y = startY;

    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 195;
    this.divineSpeed = 250; // Increased divine agility
    this.speed = this.baseSpeed;
    this.acceleration = 1600;
    this.friction = 1400;

    // Hitbox for collision
    this.width = 24;
    this.height = 36;
    this.colliderWidth = 20;
    this.colliderHeight = 14;
    this.colliderOffsetY = 10;

    // Direction and animation state
    this.facing = 'down'; // 'down' | 'up' | 'left' | 'right'
    this.isMoving = false;
    this.animTime = 0;
    this.stepCycle = 0;

    // Simulated Z-Axis Jump Physics
    this.zHeight = 0;
    this.zVelocity = 0;
    this.gravity = 980;
    this.jumpImpulse = 360;
    this.isJumping = false;

    // Divine Transformation State (6-Second Duration)
    this.isDivine = false;
    this.divineDuration = 6.0;
    this.divineTimer = 0.0;
    this.divinePulse = 0.0;

    // Load Sprite Assets (Mortal Warrior & Divine Kali Avatar)
    this.imgMortal = new Image();
    this.imgMortal.src = 'assets/mc_mortal.png';
    this.mortalLoaded = false;
    this.imgMortal.onload = () => { this.mortalLoaded = true; };

    this.imgDivine = new Image();
    this.imgDivine.src = 'assets/mc_divine.png';
    this.divineLoaded = false;
    this.imgDivine.onload = () => { this.divineLoaded = true; };

    // Particles and divine aura trails
    this.particles = [];

    // Vitality stats
    this.hp = 20;
    this.maxHp = 20;
  }

  /**
   * Triggers the 6-second Divine Form transformation
   */
  triggerDivineTransformation() {
    this.isDivine = true;
    this.divineTimer = this.divineDuration;
    this.speed = this.divineSpeed;

    // Fullscreen celestial flash
    const flash = document.getElementById('divineFlash');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 250);
    }

    // Spawn massive golden & crimson divine shockwave particles
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const speed = 70 + Math.random() * 80;
      this.particles.push({
        x: this.x,
        y: this.y - 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.55 + Math.random() * 0.25,
        maxLife: 0.8,
        size: 3 + Math.random() * 2,
        color: i % 2 === 0 ? '#ffd700' : '#ff0055'
      });
    }
  }

  /**
   * Reverts from Divine Form back to Mortal
   */
  revertToMortal() {
    this.isDivine = false;
    this.divineTimer = 0.0;
    this.speed = this.baseSpeed;

    // Soft reversion burst
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y - 15,
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

    // Freeze controls during dialogue
    if (dialogueActive) {
      this.vx = 0;
      this.vy = 0;
      this.isMoving = false;
      this.updateParticles(dt);
      return;
    }

    // 1. Process Divine Transformation Trigger (Key X)
    if (Input.isPressed('KeyX') || Input.isPressed('x')) {
      if (!this.isDivine) {
        this.triggerDivineTransformation();
      }
    }

    // 2. Divine Timer Countdown & Aura Emitters
    if (this.isDivine) {
      this.divineTimer -= dt;

      // Continuously emit divine sparks & crimson droplets
      if (Math.random() < 0.75) {
        this.particles.push({
          x: this.x + (Math.random() - 0.5) * 26,
          y: this.y - 15 - this.zHeight + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 25,
          vy: -15 - Math.random() * 35, // Floating upward
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

    // 3. Movement Inputs
    const inputVec = Input.getMovementVector();
    this.isMoving = (inputVec.x !== 0 || inputVec.y !== 0);

    if (inputVec.y > 0) this.facing = 'down';
    else if (inputVec.y < 0) this.facing = 'up';
    else if (inputVec.x < 0) this.facing = 'left';
    else if (inputVec.x > 0) this.facing = 'right';

    const targetVx = inputVec.x * this.speed;
    const targetVy = inputVec.y * this.speed;

    if (this.isMoving) {
      this.vx = this.approach(this.vx, targetVx, this.acceleration * dt);
      this.vy = this.approach(this.vy, targetVy, this.acceleration * dt);
      this.stepCycle += dt * (this.isDivine ? 10.5 : 8.5);
    } else {
      this.vx = this.approach(this.vx, 0, this.friction * dt);
      this.vy = this.approach(this.vy, 0, this.friction * dt);
      this.stepCycle = 0;
    }

    // 4. Simulated Z-Axis Leap (Spacebar)
    if ((Input.isPressed('Space') || Input.isPressed('jump')) && !this.isJumping) {
      this.isJumping = true;
      this.zVelocity = this.jumpImpulse;
      this.spawnPoof(8);
    }

    if (this.isJumping || this.zHeight > 0) {
      this.zVelocity -= this.gravity * dt;
      this.zHeight += this.zVelocity * dt;

      if (this.zHeight <= 0) {
        this.zHeight = 0;
        this.zVelocity = 0;
        this.isJumping = false;
        this.spawnPoof(6);
      }
    }

    // 5. Collision & Boundaries
    this.moveWithCollision(this.vx * dt, this.vy * dt, level);

    // 6. Update Particles
    this.updateParticles(dt);

    // 7. Reset Position (R key)
    if (Input.isPressed('KeyR') || Input.isPressed('reset')) {
      this.x = level.width / 2;
      this.y = level.height / 2 + 50;
      this.vx = 0;
      this.vy = 0;
      this.zHeight = 0;
      this.isJumping = false;
      this.spawnPoof(12);
    }
  }

  approach(curr, target, step) {
    if (curr < target) return Math.min(curr + step, target);
    if (curr > target) return Math.max(curr - step, target);
    return target;
  }

  moveWithCollision(dx, dy, level) {
    const halfW = this.colliderWidth / 2;
    const halfH = this.colliderHeight / 2;

    if (dx !== 0) {
      const nextX = this.x + dx;
      if (!level.isColliding(nextX - halfW, this.y + this.colliderOffsetY - halfH, this.colliderWidth, this.colliderHeight)) {
        this.x = nextX;
      } else {
        this.vx = 0;
      }
    }

    if (dy !== 0) {
      const nextY = this.y + dy;
      if (!level.isColliding(this.x - halfW, nextY + this.colliderOffsetY - halfH, this.colliderWidth, this.colliderHeight)) {
        this.y = nextY;
      } else {
        this.vy = 0;
      }
    }

    const margin = 64;
    this.x = Math.max(margin, Math.min(this.x, level.width - margin));
    this.y = Math.max(margin, Math.min(this.y, level.height - margin));
  }

  spawnPoof(count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y + 10,
        vx: Math.cos(angle) * 36,
        vy: Math.sin(angle) * 18,
        life: 0.3,
        maxLife: 0.3,
        size: 2,
        color: this.isDivine ? '#ffd700' : '#ffea79'
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
  // RENDERING PIPELINE
  // ==========================================================================

  renderShadow(ctx, camX, camY) {
    const rx = Math.floor(this.x - camX);
    const ry = Math.floor(this.y + 14 - camY);
    const heightFactor = Math.max(0.35, 1.0 - (this.zHeight / 360));

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${0.48 * heightFactor})`;
    ctx.beginPath();
    // In divine form, shadow expands with Kali's dark pedestal
    const baseW = this.isDivine ? 22 : 16;
    const baseH = this.isDivine ? 9 : 6;
    ctx.ellipse(rx, ry, baseW * heightFactor, baseH * heightFactor, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderParticles(ctx, camX, camY) {
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      const s = p.size || 2;
      ctx.fillRect(Math.floor(p.x - camX - s/2), Math.floor(p.y - camY - s/2), s, s);
    }
    ctx.restore();
  }

  render(ctx, camX, camY) {
    const cx = Math.floor(this.x - camX);
    const cy = Math.floor(this.y - this.zHeight - camY);

    const bob = this.isMoving ? Math.abs(Math.sin(this.stepCycle)) * 2.5 : 0;
    const isFacingLeft = (this.facing === 'left');

    ctx.save();

    // 1. Divine Aura & Halo (When in Kali Divine Form)
    if (this.isDivine) {
      this.drawDivineAura(ctx, cx, cy - 20 - bob);
    }

    // 2. Undertale Red SOUL Heart indicator when leaping
    if (this.isJumping) {
      ctx.fillStyle = '#ff0000';
      ctx.font = '12px monospace';
      ctx.fillText('❤', cx - 5, cy - 42 - bob);
    }

    // 3. Render Sprite (Mortal or Divine)
    ctx.save();
    ctx.translate(cx, cy + 12); // Ground pivot
    if (isFacingLeft) {
      ctx.scale(-1, 1); // Flip horizontally for left facing
    }

    if (this.isDivine && this.divineLoaded) {
      // Maa Kali Divine Form Sprite (161x182 native, scaled to ~52x58 px)
      const renderW = 54;
      const renderH = 61;
      ctx.drawImage(
        this.imgDivine,
        -renderW / 2,
        -renderH - bob,
        renderW,
        renderH
      );
    } else if (this.mortalLoaded) {
      // Mortal Warrior Sprite (176x192 native, scaled to ~46x50 px)
      const renderW = 46;
      const renderH = 50;
      ctx.drawImage(
        this.imgMortal,
        -renderW / 2,
        -renderH - bob,
        renderW,
        renderH
      );
    } else {
      // Fallback procedural avatar if images still loading
      this.drawFallbackAvatar(ctx, 0, -16 - bob);
    }

    ctx.restore();
    ctx.restore();
  }

  /**
   * Draws radiant Kali Divine Aura (glowing golden halo + crimson prana flames)
   */
  drawDivineAura(ctx, x, y) {
    ctx.save();
    const pulse = Math.sin(this.divinePulse) * 3;
    const radius = 26 + pulse;

    // Outer crimson/indigo ethereal bloom
    const bloom = ctx.createRadialGradient(x, y, 4, x, y, radius + 12);
    bloom.addColorStop(0, 'rgba(255, 0, 85, 0.45)');
    bloom.addColorStop(0.5, 'rgba(56, 225, 255, 0.25)');
    bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
    ctx.fill();

    // Sharp golden mandala ring
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 8 Solar / Chakra rays
    const rot = this.animTime * 1.5;
    ctx.strokeStyle = '#ffea79';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8 + rot;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * (radius - 2), y + Math.sin(angle) * (radius - 2));
      ctx.lineTo(x + Math.cos(angle) * (radius + 6), y + Math.sin(angle) * (radius + 6));
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Fallback procedural avatar if images are pending
   */
  drawFallbackAvatar(ctx, x, y) {
    ctx.fillStyle = '#e86a17';
    ctx.fillRect(x - 8, y, 16, 16);
    ctx.fillStyle = '#e8ad82';
    ctx.fillRect(x - 6, y - 10, 12, 10);
  }

  toggleDimension() {}
  manipulateObject() {}
}
